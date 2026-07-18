import { NextRequest, NextResponse } from "next/server";
import { searchFlights, FlightOption } from "@/lib/sabre";
import { startOutboundCall } from "@/lib/vocalbridge";
import { getTrip, updateTrip } from "@/lib/store";

// POST /api/disrupt { tripId } — DEMO TRIGGER (the "Simulate Delay" button).
// Marks the trip disrupted, finds Sabre alternatives, and fires the
// Vocal Bridge outbound call to DEMO_USER_PHONE. The wow moment (K6).
export async function POST(req: NextRequest) {
  try {
    const { tripId } = await req.json();
    const existing = getTrip(tripId ?? "demo");

    // Derive route from the booked flight when we have one; demo defaults otherwise.
    const booked = existing.flight as FlightOption | undefined;
    const firstSeg = booked?.segments?.[0];
    const origin = firstSeg?.from || "SFO";
    const destination = booked?.segments?.at(-1)?.to || "DFW";
    const departureDate =
      firstSeg?.departure?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    const delayedFlight = firstSeg?.flight || "AA 1234";

    let alternatives: FlightOption[] = [];
    try {
      alternatives = await searchFlights({
        origin,
        destination,
        departureDate,
        preferredCarrier: "AA",
        maxResults: 2,
      });
    } catch (err) {
      console.error("disrupt: alternatives search failed, calling without them:", err);
    }

    // Stash alternatives on the trip so the agent's rebook_next_flight tool (and
    // the UI) can act on them without re-searching.
    const trip = updateTrip(existing.id, { disrupted: true, alternatives });

    const phoneNumber = process.env.DEMO_USER_PHONE;
    if (!phoneNumber) {
      return NextResponse.json({ error: "DEMO_USER_PHONE is not set" }, { status: 500 });
    }

    const altSummary = alternatives
      .map((a) => {
        const s = a.segments[0];
        return `${s?.flight} departing ${s?.departure} for ${a.currency} ${a.totalPrice}`;
      })
      .join("; ");

    const { callId } = await startOutboundCall({
      phoneNumber,
      context:
        `URGENT DISRUPTION: The traveler's flight ${delayedFlight} from ${origin} to ${destination} ` +
        `is delayed about 4 hours. You are calling them proactively. Apologize briefly and explain the delay. ` +
        `Then ASK whether they'd like you to book the next available flight, naming the best option: ` +
        `${altSummary || "the next available American flight"}. ` +
        `Only if they say yes, call rebook_next_flight (it swaps the flight, charges any fare difference to ` +
        `PayPal, and confirms). Then read back the new confirmation code slowly.`,
    });

    return NextResponse.json({ trip, callId, alternatives });
  } catch (err) {
    console.error("disrupt:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
