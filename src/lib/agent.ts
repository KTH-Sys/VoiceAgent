// The AI-agent brain behind the Vocal Bridge voice agent (K4).
// Vocal Bridge (AI agent integration mode) forwards each user utterance here;
// the model orchestrates our Sabre/PayPal/trip tools and returns a spoken reply.

import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { searchFlights, searchHotels, createBooking } from "./sabre";
import type { FlightOption, HotelOption } from "./sabre";
import { createOrder } from "./paypal";
import { rebookNextFlight } from "./booking";
import { getTrip, updateTrip } from "./store";

const client = new OpenAI();
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

const SYSTEM_PROMPT = `You are Guidio, a warm, efficient voice travel concierge for "The Complete Trip".
Introduce yourself as Guidio the first time you greet someone.
Your replies are spoken aloud, so keep them short and conversational — two or three
sentences, no lists, no markdown, no URLs. Read at most 2-3 options aloud, naming
carrier, time, and price in round numbers ("American flight at 8:15 AM, about $240").
Prefer American Airlines flights when the user has no preference.
When you have what you need to act, call the tool in the same turn — never say "one
moment" or "let me check" and stop without calling it.

Flow: when a traveler first asks about a trip, ask two quick questions before searching
(one at a time, conversationally): (1) "Are you traveling solo, or how many of you?" and
(2) "Would you like just flights, or flights and a hotel?" Skip a question if they've
already told you the answer. Pass the passenger count to search_flights, and only search
or offer hotels if they asked for a hotel. Then help them pick, save the selection, create
a PayPal payment and tell them to approve it on screen. After payment, confirm the booking
and read the confirmation code slowly. Traveler passport details come from a document
upload on screen — if they're missing, ask the user to snap a photo of their passport
using the upload button, don't ask them to dictate numbers.

If the trip is disrupted (check get_trip, or you were given disruption context for a
phone call): you are calling the traveler proactively. Briefly apologize and state the
delay. Then ASK whether they'd like you to book the next available flight, naming the
single best alternative by airline and time ("I can get you on American 1198 at 5:29
AM — shall I book it?"). Only if they say yes, call rebook_next_flight — it swaps the
flight, charges any fare difference to their PayPal, and confirms in one step. Then read
back the new confirmation code slowly. If they want a specific one of the alternatives,
pass its flightId.`;

const TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_flights",
      description:
        "Search real flights via Sabre. Call this when the user asks for flights. Returns priced options with segments.",
      parameters: {
        type: "object",
        properties: {
          origin: { type: "string", description: "Origin IATA code, e.g. SFO" },
          destination: { type: "string", description: "Destination IATA code, e.g. DFW" },
          departureDate: { type: "string", description: "YYYY-MM-DD" },
          returnDate: { type: "string", description: "YYYY-MM-DD, omit for one-way" },
          preferredCarrier: { type: "string", description: "2-letter airline code, e.g. AA" },
          passengers: { type: "number", description: "number of travelers (default 1)" },
        },
        required: ["origin", "destination", "departureDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_hotels",
      description:
        "Search real hotels via Sabre near an airport/city code. Call this when the user asks for a hotel.",
      parameters: {
        type: "object",
        properties: {
          cityCode: { type: "string", description: "Airport/city IATA code, e.g. DFW" },
          checkIn: { type: "string", description: "YYYY-MM-DD" },
          checkOut: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["cityCode", "checkIn", "checkOut"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_selection",
      description:
        "Save the flight and/or hotel the user chose to their trip. Call this as soon as the user picks an option, before payment. Reference options by the id/hotelCode from the most recent search results — double-check the id belongs to the option whose time/name the user actually said.",
      parameters: {
        type: "object",
        properties: {
          flightId: { type: "number", description: "id of the chosen flight from search_flights results" },
          hotelCode: { type: "string", description: "hotelCode of the chosen hotel from search_hotels results" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_trip",
      description:
        "Get the current trip state: selected flight/hotel, traveler details from the passport upload, and payment status. Call this before booking or paying.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "create_payment",
      description:
        "Create a PayPal payment for the trip total. Call this when the user confirms they want to pay. The user approves it on screen, not by voice.",
      parameters: {
        type: "object",
        properties: {
          amountUsd: { type: "string", description: "Total in USD, e.g. '412.50'" },
          description: { type: "string", description: "Short description of the trip" },
        },
        required: ["amountUsd", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "confirm_booking",
      description:
        "Finalize the booking and get a confirmation code. Call this after the user has paid.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "rebook_next_flight",
      description:
        "During a disruption, book an alternative flight for the traveler. Call this ONLY after they agree. Defaults to the next/best alternative; pass flightId to pick a specific one you offered. Handles the flight swap, any fare-difference PayPal charge, and the new confirmation in one step.",
      parameters: {
        type: "object",
        properties: {
          flightId: {
            type: "number",
            description: "id of the chosen alternative flight; omit to take the next best one",
          },
        },
      },
    },
  },
];

/* Last search results per session, so selections are saved from real data
   instead of whatever JSON the model chooses to echo back. */
const lastResults = new Map<string, { flights: FlightOption[]; hotels: HotelOption[] }>();

function resultsFor(sessionId: string) {
  let r = lastResults.get(sessionId);
  if (!r) {
    r = { flights: [], hotels: [] };
    lastResults.set(sessionId, r);
  }
  return r;
}

async function runTool(sessionId: string, name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "search_flights": {
      const flights = (await searchFlights(args as never)).slice(0, 3);
      resultsFor(sessionId).flights = flights;
      return JSON.stringify(flights);
    }
    case "search_hotels": {
      const hotels = (await searchHotels(args as never)).slice(0, 3);
      resultsFor(sessionId).hotels = hotels;
      return JSON.stringify(hotels);
    }
    case "save_selection": {
      const { flights, hotels } = resultsFor(sessionId);
      const patch: Record<string, unknown> = {};
      if (args.flightId !== undefined) {
        const flight = flights.find((f) => f.id === Number(args.flightId));
        if (!flight) return `No flight with id ${args.flightId} in the latest search results. Search again first.`;
        patch.flight = flight;
      }
      if (args.hotelCode !== undefined) {
        const hotel = hotels.find((h) => h.hotelCode === String(args.hotelCode));
        if (!hotel) return `No hotel with code ${args.hotelCode} in the latest search results. Search again first.`;
        patch.hotel = hotel;
      }
      if (!Object.keys(patch).length) return "Nothing to save — pass flightId and/or hotelCode.";
      updateTrip(sessionId, patch);
      return "Selection saved to trip.";
    }
    case "get_trip":
      return JSON.stringify(getTrip(sessionId));
    case "create_payment": {
      const { orderId, approveUrl } = await createOrder(
        args.amountUsd as string,
        args.description as string,
      );
      updateTrip(sessionId, {
        paypalOrderId: orderId,
        paypalApproveUrl: approveUrl,
        paymentStatus: "pending",
      });
      return `Payment created (order ${orderId}). Approval link is showing on the user's screen. Tell the user to approve it there.`;
    }
    case "confirm_booking": {
      const { confirmationNumber } = await createBooking(sessionId);
      updateTrip(sessionId, { confirmationNumber, disrupted: false });
      return `Booking confirmed. Confirmation code: ${confirmationNumber}.`;
    }
    case "rebook_next_flight": {
      const flightId = args.flightId === undefined ? undefined : Number(args.flightId);
      const result = await rebookNextFlight(sessionId, flightId);
      return result.message;
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

/* Conversation history per voice session — in-memory, demo-scale. Tool-call
   exchanges are collapsed; we keep only user/assistant text turns. */
const histories = new Map<string, ChatCompletionMessageParam[]>();

/** One voice turn: user utterance in, spoken reply out. */
export async function askAgent(sessionId: string, query: string): Promise<string> {
  const history = histories.get(sessionId) ?? [];
  history.push({ role: "user", content: query });

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\nToday's date is ${new Date().toISOString().slice(0, 10)}. Resolve relative dates ("next Friday") from it and never search dates in the past.`,
    },
    ...history,
  ];

  let reply = "";
  for (let i = 0; i < 8; i++) {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOLS,
    });
    const msg = completion.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls?.length) {
      reply = msg.content?.trim() ?? "";
      break;
    }

    for (const call of msg.tool_calls) {
      if (call.type !== "function") continue;
      let result: string;
      try {
        result = await runTool(sessionId, call.function.name, JSON.parse(call.function.arguments || "{}"));
      } catch (err) {
        result = `Tool error: ${String(err)}`;
      }
      console.log(`[agent tool] ${call.function.name}(${call.function.arguments}) -> ${result.slice(0, 200)}`);
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }

  history.push({ role: "assistant", content: reply || "Sorry, could you say that again?" });
  histories.set(sessionId, history);
  return reply || "Sorry, could you say that again?";
}
