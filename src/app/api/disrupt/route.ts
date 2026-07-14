import { NextRequest, NextResponse } from "next/server";
import { searchFlights } from "@/lib/sabre";
import { startOutboundCall } from "@/lib/vocalbridge";
import { updateTrip } from "@/lib/store";

// POST /api/disrupt { tripId } — DEMO TRIGGER (the "Simulate Delay" button).
// Marks the trip disrupted, finds Sabre alternatives, and fires the
// Vocal Bridge outbound call to DEMO_USER_PHONE. The wow moment (K6).
export async function POST(req: NextRequest) {
  try {
    const { tripId } = await req.json();
    const trip = updateTrip(tripId, { disrupted: true });

    // TODO(K6): derive real alternatives from the booked flight instead of defaults
    const alternatives = await searchFlights({
      origin: "SFO",
      destination: "DFW",
      departureDate: new Date().toISOString().slice(0, 10),
      preferredCarrier: "AA",
    });

    const phoneNumber = process.env.DEMO_USER_PHONE;
    if (!phoneNumber) {
      return NextResponse.json({ error: "DEMO_USER_PHONE is not set" }, { status: 500 });
    }

    const { callId } = await startOutboundCall({
      phoneNumber,
      context: `Flight AA delayed 4 hours. Alternatives: ${JSON.stringify(alternatives).slice(0, 500)}`,
    });

    return NextResponse.json({ trip, callId });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 501 });
  }
}
