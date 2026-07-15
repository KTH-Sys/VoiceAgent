// The AI-agent brain behind the Vocal Bridge voice agent (K4).
// Vocal Bridge (AI agent integration mode) forwards each user utterance here;
// Claude orchestrates our Sabre/PayPal/trip tools and returns a spoken reply.

import Anthropic from "@anthropic-ai/sdk";
import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta";
import { searchFlights, searchHotels } from "./sabre";
import { createOrder } from "./paypal";
import { getTrip, updateTrip } from "./store";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a warm, efficient voice travel concierge for "The Complete Trip".
Your replies are spoken aloud, so keep them short and conversational — two or three
sentences, no lists, no markdown, no URLs. Read at most 2-3 options aloud, naming
carrier, time, and price in round numbers ("American flight at 8:15 AM, about $240").
Prefer American Airlines flights when the user has no preference.

Flow: help the user pick a flight (and hotel if asked), save their selection to the
trip, then create a PayPal payment and tell them to approve it on the screen. Traveler
passport details come from a document upload on screen — if they're missing, ask the
user to snap a photo of their passport using the upload button, don't ask them to
dictate numbers.`;

/* Conversation history per voice session — in-memory, demo-scale. Tool-call
   exchanges are collapsed; we keep only user/assistant text turns. */
const histories = new Map<string, BetaMessageParam[]>();

function buildTools(sessionId: string) {
  return [
    betaTool({
      name: "search_flights",
      description:
        "Search real flights via Sabre. Call this when the user asks for flights. Returns priced options with segments.",
      inputSchema: {
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
      run: async (input) => {
        const flights = await searchFlights(input as never);
        return JSON.stringify(flights.slice(0, 3));
      },
    }),
    betaTool({
      name: "search_hotels",
      description:
        "Search real hotels via Sabre near an airport/city code. Call this when the user asks for a hotel.",
      inputSchema: {
        type: "object",
        properties: {
          cityCode: { type: "string", description: "Airport/city IATA code, e.g. DFW" },
          checkIn: { type: "string", description: "YYYY-MM-DD" },
          checkOut: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["cityCode", "checkIn", "checkOut"],
      },
      run: async (input) => {
        const hotels = await searchHotels(input as never);
        return JSON.stringify(hotels.slice(0, 3));
      },
    }),
    betaTool({
      name: "save_selection",
      description:
        "Save the flight and/or hotel the user chose to their trip. Call this as soon as the user picks an option, before payment.",
      inputSchema: {
        type: "object",
        properties: {
          flight: { type: "string", description: "JSON of the chosen flight option" },
          hotel: { type: "string", description: "JSON of the chosen hotel option" },
        },
      },
      run: async (input) => {
        const patch: Record<string, unknown> = {};
        if (input.flight) patch.flight = JSON.parse(input.flight as string);
        if (input.hotel) patch.hotel = JSON.parse(input.hotel as string);
        updateTrip(sessionId, patch);
        return "Selection saved to trip.";
      },
    }),
    betaTool({
      name: "get_trip",
      description:
        "Get the current trip state: selected flight/hotel, traveler details from the passport upload, and payment status. Call this before booking or paying.",
      inputSchema: { type: "object", properties: {} },
      run: async () => JSON.stringify(getTrip(sessionId)),
    }),
    betaTool({
      name: "create_payment",
      description:
        "Create a PayPal payment for the trip total. Call this when the user confirms they want to pay. The user approves it on screen, not by voice.",
      inputSchema: {
        type: "object",
        properties: {
          amountUsd: { type: "string", description: "Total in USD, e.g. '412.50'" },
          description: { type: "string", description: "Short description of the trip" },
        },
        required: ["amountUsd", "description"],
      },
      run: async (input) => {
        const { orderId, approveUrl } = await createOrder(
          input.amountUsd as string,
          input.description as string,
        );
        updateTrip(sessionId, { paypalOrderId: orderId, paymentStatus: "pending" });
        return `Payment created (order ${orderId}). Approval link is showing on the user's screen: ${approveUrl}. Tell the user to approve it there.`;
      },
    }),
  ];
}

/** One voice turn: user utterance in, spoken reply out. */
export async function askAgent(sessionId: string, query: string): Promise<string> {
  const history = histories.get(sessionId) ?? [];
  history.push({ role: "user", content: query });

  const finalMessage = await client.beta.messages.toolRunner({
    model: "claude-opus-4-8",
    max_tokens: 2048, // voice replies are deliberately short
    thinking: { type: "adaptive" },
    output_config: { effort: "low" }, // latency matters on a live call
    system: SYSTEM_PROMPT,
    tools: buildTools(sessionId),
    messages: [...history],
    max_iterations: 8,
  });

  const reply = finalMessage.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join(" ")
    .trim();

  history.push({ role: "assistant", content: reply || "Sorry, could you say that again?" });
  histories.set(sessionId, history);
  return reply || "Sorry, could you say that again?";
}
