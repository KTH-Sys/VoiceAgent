import { NextRequest, NextResponse } from "next/server";
import { searchFlights } from "@/lib/sabre";

// POST /api/flights/search { origin, destination, departureDate, returnDate?, preferredCarrier? }
export async function POST(req: NextRequest) {
  try {
    const params = await req.json();
    const flights = await searchFlights(params);
    return NextResponse.json({ flights });
  } catch (err) {
    console.error("flights/search:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
