import { NextRequest, NextResponse } from "next/server";
import { createVoiceSessionToken } from "@/lib/vocalbridge";

// POST /api/voice-token — mint a short-lived Vocal Bridge session for the browser.
// The @vocalbridgeai/sdk tokenUrl strategy POSTs { participant_name, session_id? }
// here and expects the Vocal Bridge session payload back verbatim.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const session = await createVoiceSessionToken({
      participantName: typeof body.participant_name === "string" ? body.participant_name : undefined,
      sessionId: typeof body.session_id === "string" ? body.session_id : undefined,
    });
    return NextResponse.json(session);
  } catch (err) {
    console.error("voice-token:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
