import { NextRequest, NextResponse } from "next/server";
import { extractTravelerDocument } from "@/lib/landingai";
import { updateTrip } from "@/lib/store";

// POST /api/extract-document (multipart form: file, tripId) —
// passport/ID photo → LandingAI ADE → traveler fields on the trip.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const tripId = form.get("tripId");
    if (!(file instanceof Blob) || typeof tripId !== "string") {
      return NextResponse.json({ error: "file and tripId are required" }, { status: 400 });
    }
    const traveler = await extractTravelerDocument(file);
    const trip = updateTrip(tripId, { traveler });
    return NextResponse.json({ trip });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 501 });
  }
}
