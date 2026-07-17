// The AI-agent brain behind the Vocal Bridge voice agent (K4).
// Vocal Bridge (AI agent integration mode) forwards each user utterance here;
// the model orchestrates our Sabre/PayPal/trip tools and returns a spoken reply.

import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { searchFlights, searchHotels, createBooking } from "./sabre";
import { createOrder } from "./paypal";
import { getTrip, updateTrip } from "./store";

const client = new OpenAI();
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

const SYSTEM_PROMPT = `You are a warm, efficient voice travel concierge for "The Complete Trip".
Your replies are spoken aloud, so keep them short and conversational — two or three
sentences, no lists, no markdown, no URLs. Read at most 2-3 options aloud, naming
carrier, time, and price in round numbers ("American flight at 8:15 AM, about $240").
Prefer American Airlines flights when the user has no preference.

Flow: help the user pick a flight (and hotel if asked), save their selection to the
trip, then create a PayPal payment and tell them to approve it on the screen. After
payment, confirm the booking and read the confirmation code slowly. Traveler passport
details come from a document upload on screen — if they're missing, ask the user to
snap a photo of their passport using the upload button, don't ask them to dictate numbers.

If the trip is disrupted (check get_trip, or you were given disruption context for a
phone call): you are calling the traveler proactively. Briefly apologize, state the
delay, offer the best alternative first, and if they accept, save it with save_selection
and confirm with confirm_booking. Mention any fare difference goes to their PayPal.`;

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
        "Save the flight and/or hotel the user chose to their trip. Call this as soon as the user picks an option, before payment.",
      parameters: {
        type: "object",
        properties: {
          flight: { type: "string", description: "JSON of the chosen flight option" },
          hotel: { type: "string", description: "JSON of the chosen hotel option" },
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
        "Finalize the booking and get a confirmation code. Call this after the user has paid (or accepted a rebooking during a disruption call).",
      parameters: { type: "object", properties: {} },
    },
  },
];

async function runTool(sessionId: string, name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "search_flights": {
      const flights = await searchFlights(args as never);
      return JSON.stringify(flights.slice(0, 3));
    }
    case "search_hotels": {
      const hotels = await searchHotels(args as never);
      return JSON.stringify(hotels.slice(0, 3));
    }
    case "save_selection": {
      const patch: Record<string, unknown> = {};
      if (args.flight) patch.flight = JSON.parse(args.flight as string);
      if (args.hotel) patch.hotel = JSON.parse(args.hotel as string);
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
