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

/**
 * Trigger an outbound phone call from the Vocal Bridge agent (K6) — the demo
 * wow moment. Requires "Outbound calling" enabled on the agent in the VB UI.
 *
 * NOTE: the exact path/body are documented in the login-gated developer guide
 * (vocalbridgeai.com/app/developer-guide). This follows VB's /api/v1 + X-API-Key
 * conventions; if the guide differs, set VOCALBRIDGE_OUTBOUND_PATH in .env.local
 * (no redeploy of this file needed) or tweak the body below.
 */
export async function startOutboundCall(params: OutboundCallParams): Promise<{ callId: string }> {
  const apiKey = process.env.VOCALBRIDGE_API_KEY;
  if (!apiKey) throw new Error("VOCALBRIDGE_API_KEY is not set (see .env.example)");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
  };
  const agentId = process.env.VOCALBRIDGE_AGENT_ID;
  if (agentId) headers["X-Agent-Id"] = agentId;

  const path = process.env.VOCALBRIDGE_OUTBOUND_PATH ?? "/api/v1/calls";
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      phone_number: params.phoneNumber,
      agent_id: agentId,
      context: params.context,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Vocal Bridge outbound call failed (${res.status}): ${await res.text()}. ` +
        "Check the outbound-calling section of vocalbridgeai.com/app/developer-guide " +
        "and adjust VOCALBRIDGE_OUTBOUND_PATH / the request body if the API shape differs.",
    );
  }

  const data = await res.json().catch(() => ({}));
  return { callId: String(data.call_id ?? data.id ?? "unknown") };
}
