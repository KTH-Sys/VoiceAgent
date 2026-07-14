import { NextRequest, NextResponse } from "next/server";
import { createBooking } from "@/lib/sabre";
import { updateTrip } from "@/lib/store";

// POST /api/book { tripId } — confirm the selected flight/hotel for the trip.
export async function POST(req: NextRequest) {
  try {
    const { tripId } = await req.json();
    const { confirmationNumber } = await createBooking(tripId);
    const trip = updateTrip(tripId, { confirmationNumber });
    return NextResponse.json({ trip });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 501 });
  }
}
