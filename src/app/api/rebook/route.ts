import { NextRequest, NextResponse } from "next/server";
import { rebookNextFlight } from "@/lib/booking";

// POST /api/rebook { tripId, flightId? } — book an alternative flight after a
// disruption. Non-voice fallback for the "Rebook next flight" button, and the
// same logic the agent's rebook_next_flight tool calls.
export async function POST(req: NextRequest) {
  try {
    const { tripId, flightId } = await req.json();
    const result = await rebookNextFlight(
      typeof tripId === "string" ? tripId : "demo",
      flightId === undefined ? undefined : Number(flightId),
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (err) {
    console.error("rebook:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
