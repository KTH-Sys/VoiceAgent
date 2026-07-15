import { NextRequest, NextResponse } from "next/server";
import { askAgent } from "@/lib/agent";

// POST /api/agent { query, sessionId } — one voice turn (K4).
// Called by the browser's useAIAgent onQuery handler when Vocal Bridge
// forwards a user utterance in AI-agent integration mode.
export async function POST(req: NextRequest) {
  try {
    const { query, sessionId } = await req.json();
    if (typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }
    const response = await askAgent(typeof sessionId === "string" ? sessionId : "demo", query);
    return NextResponse.json({ response });
  } catch (err) {
    console.error("agent:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
