import { NextResponse } from "next/server";
import { createVoiceSessionToken } from "@/lib/vocalbridge";

// POST /api/voice-token — mint a short-lived Vocal Bridge session token for the browser.
export async function POST() {
  try {
    const session = await createVoiceSessionToken();
    return NextResponse.json(session);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 501 });
  }
}
