// Vocal Bridge server-side client (K1/K4/K6).
// Developer guide: https://vocalbridgeai.com/app/developer-guide
// API key stays server-side — never send it to the browser.

const BASE_URL = process.env.VOCALBRIDGE_BASE_URL ?? "https://vocalbridgeai.com";

export interface VoiceSessionRequest {
  participantName?: string;
  sessionId?: string;
}

/**
 * Mint a short-lived voice session for the browser SDK.
 * Returns the payload `@vocalbridgeai/sdk` expects from its tokenUrl
 * (url, token, room_name, agent_mode, ...) — pass it through unchanged.
 */
export async function createVoiceSessionToken(
  req: VoiceSessionRequest = {},
): Promise<Record<string, unknown>> {
  const apiKey = process.env.VOCALBRIDGE_API_KEY;
  if (!apiKey) throw new Error("VOCALBRIDGE_API_KEY is not set (see .env.example)");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
  };
  const agentId = process.env.VOCALBRIDGE_AGENT_ID;
  if (agentId) headers["X-Agent-Id"] = agentId;

  const body: Record<string, unknown> = {
    participant_name: req.participantName ?? "User",
  };
  if (req.sessionId) body.session_id = req.sessionId;

  const res = await fetch(`${BASE_URL}/api/v1/token`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Vocal Bridge token request failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export interface OutboundCallParams {
  phoneNumber: string; // E.164
  context: string; // what the agent should say / know (disruption details, alternatives)
}

export async function startOutboundCall(params: OutboundCallParams): Promise<{ callId: string }> {
  // TODO(K6): trigger an outbound call from the Vocal Bridge agent — the demo wow moment.
  void params;
  throw new Error("Not implemented: outbound call (K6)");
}
