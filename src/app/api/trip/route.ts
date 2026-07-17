import { NextRequest, NextResponse } from "next/server";
import { getTrip } from "@/lib/store";
import { DEMO_TRIP_ID } from "@/lib/constants";

// GET /api/trip?tripId=demo — current trip state, polled by the UI so the
// screen reflects what the voice agent saved (A4).
export async function GET(req: NextRequest) {
  const tripId = req.nextUrl.searchParams.get("tripId") ?? DEMO_TRIP_ID;
  return NextResponse.json({ trip: getTrip(tripId) });
}
