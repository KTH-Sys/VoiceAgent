import { NextRequest, NextResponse } from "next/server";
import { extractTravelerDocument } from "@/lib/landingai";
import { getTrip, updateTrip } from "@/lib/store";

// POST /api/extract-document (multipart form: file, tripId, replaceIndex?) —
// passport/ID photo → LandingAI ADE → append a traveler to the trip.
// Each scan adds one traveler (for a group booking); pass replaceIndex to
// re-scan a specific person instead of appending.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const tripId = form.get("tripId");
    const replaceRaw = form.get("replaceIndex");
    if (!(file instanceof Blob) || typeof tripId !== "string") {
      return NextResponse.json({ error: "file and tripId are required" }, { status: 400 });
    }

    const extracted = await extractTravelerDocument(file);
    const travelers = [...(getTrip(tripId).travelers ?? [])];
    const replaceIndex = typeof replaceRaw === "string" ? Number(replaceRaw) : NaN;
    if (Number.isInteger(replaceIndex) && replaceIndex >= 0 && replaceIndex < travelers.length) {
      travelers[replaceIndex] = extracted;
    } else {
      travelers.push(extracted);
    }

    const trip = updateTrip(tripId, { travelers, traveler: travelers[0] });
    return NextResponse.json({ trip });
  } catch (err) {
    console.error("extract-document:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
