// Vocal Bridge server-side client (K1/K4/K6).
// Developer guide: https://vocalbridgeai.com/app/developer-guide
// API key stays server-side — never send it to the browser.

export async function createVoiceSessionToken(): Promise<{ token: string }> {
  // TODO(K1): exchange VOCALBRIDGE_API_KEY + VOCALBRIDGE_AGENT_ID for a
  // short-lived client session token per the developer guide.
  throw new Error("Not implemented: voice session token (K1)");
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
