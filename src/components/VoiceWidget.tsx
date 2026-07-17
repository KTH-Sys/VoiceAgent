"use client";

// Voice widget (K4 wiring): Vocal Bridge web voice ↔ our /api/agent brain.
// Allison (A4) can restyle freely — the plumbing is the important part.

import { useMemo } from "react";
import { VocalBridgeProvider, useVocalBridge, useTranscript, useAIAgent } from "@vocalbridgeai/react";
import { DEMO_TRIP_ID } from "@/lib/constants";

const SESSION_ID = DEMO_TRIP_ID; // the voice session and the trip card share one id

function VoiceChat() {
  const { state, connect, disconnect, isMicrophoneEnabled, toggleMicrophone } = useVocalBridge();
  const { transcript } = useTranscript();

  // Vocal Bridge AI-agent integration: every user utterance is forwarded to
  // our backend, and the returned text is spoken by the voice agent.
  useAIAgent({
    onQuery: async (query: string) => {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, sessionId: SESSION_ID }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "agent request failed");
      return data.response as string;
    },
  });

  const connected = state !== "disconnected";

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
      <p className="text-sm text-zinc-500">Voice agent: {String(state)}</p>
      {!connected ? (
        <button
          onClick={() => connect()}
          className="rounded-full bg-black px-6 py-2 text-white dark:bg-white dark:text-black"
        >
          Start talking
        </button>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => toggleMicrophone()} className="rounded-full border px-4 py-2">
            {isMicrophoneEnabled ? "Mute" : "Unmute"}
          </button>
          <button onClick={() => disconnect()} className="rounded-full border px-4 py-2">
            End
          </button>
        </div>
      )}
      <div className="max-h-48 w-full overflow-y-auto text-sm">
        {transcript.map((entry, i) => (
          <p key={i} className={entry.role === "user" ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}>
            <strong>{entry.role === "user" ? "You" : "Agent"}:</strong> {entry.text}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function VoiceWidget() {
  const options = useMemo(
    () => ({ auth: { tokenUrl: "/api/voice-token" }, sessionId: SESSION_ID }),
    [],
  );
  return (
    <VocalBridgeProvider options={options}>
      <VoiceChat />
    </VocalBridgeProvider>
  );
}
