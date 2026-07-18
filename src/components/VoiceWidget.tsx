"use client";

// Voice widget (K4 wiring): Vocal Bridge web voice ↔ our /api/agent brain.
// Presentation follows the orb-centered reference: the sphere carries the
// agent's state, the newest line is the hero, history is one tap away.

import { useMemo, useState } from "react";
import { VocalBridgeProvider, useVocalBridge, useTranscript, useAIAgent } from "@vocalbridgeai/react";
import Orb, { type OrbState } from "@/components/Orb";
import { DEMO_TRIP_ID } from "@/lib/constants";

const SESSION_ID = DEMO_TRIP_ID; // the voice session and the trip card share one id

function VoiceChat() {
  const { state, connect, disconnect, isMicrophoneEnabled, toggleMicrophone } = useVocalBridge();
  const { transcript } = useTranscript();
  const [showHistory, setShowHistory] = useState(false);

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
  const orbState: OrbState = !connected
    ? "idle"
    : state !== "connected"
      ? "connecting"
      : isMicrophoneEnabled
        ? "live"
        : "muted";

  const latest = transcript.at(-1);
  const earlier = transcript.slice(0, -1);

  const statusLabel = !connected
    ? "Tap to start"
    : state !== "connected"
      ? String(state)
      : isMicrophoneEnabled
        ? "Listening"
        : "Microphone muted";

  return (
    <section className="relative flex min-h-[34rem] w-full flex-col items-center overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
      {/* Status chip */}
      <div className="flex w-full items-center justify-center">
        <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-xs font-semibold tracking-wide text-yellow-400">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              orbState === "live"
                ? "animate-pulse bg-yellow-400"
                : orbState === "connecting"
                  ? "bg-amber-500"
                  : "bg-white/30"
            }`}
          />
          GUIDIO
        </span>
      </div>

      {/* Orb */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8 py-10">
        <Orb state={orbState} />

        {/* Newest line as the hero, mirroring the reference's large centered type. */}
        <div className="min-h-[6rem] max-w-md px-2 text-center">
          {latest ? (
            <p className="text-balance text-xl leading-relaxed sm:text-2xl">
              <span className="text-white/40">{latest.role === "user" ? "You — " : ""}</span>
              <span
                className={
                  latest.role === "user"
                    ? "text-white/60"
                    : "font-semibold text-white"
                }
              >
                {latest.text}
              </span>
            </p>
          ) : (
            <p className="text-balance text-lg leading-relaxed text-white/45 sm:text-xl">
              Ask me to find a flight, book a hotel, or check your trip —{" "}
              <span className="font-medium text-white/75">just start talking.</span>
            </p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex w-full flex-col items-center gap-3">
        {!connected ? (
          <button
            onClick={() => connect()}
            className="rounded-full bg-yellow-400 px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-yellow-300"
          >
            Start talking
          </button>
        ) : (
          // Outline circle controls, as in the reference.
          <div className="flex items-center gap-6">
            <button
              onClick={() => disconnect()}
              aria-label="End session"
              className="grid h-14 w-14 place-items-center rounded-full border border-white/25 text-white/75 transition hover:border-red-500/60 hover:bg-red-500/15 hover:text-red-400"
            >
              <EndIcon />
            </button>

            <button
              onClick={() => setShowHistory((v) => !v)}
              aria-label={showHistory ? "Hide transcript" : "Show transcript"}
              className="grid h-14 w-14 place-items-center rounded-full border border-white/25 text-white/75 transition hover:bg-white/10"
            >
              <LoopIcon />
            </button>

            <button
              onClick={() => toggleMicrophone()}
              aria-label={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
              className={`grid h-14 w-14 place-items-center rounded-full border transition ${
                isMicrophoneEnabled
                  ? "border-white/25 text-white/75 hover:bg-white/10"
                  : "border-yellow-400 bg-yellow-400 text-black"
              }`}
            >
              {isMicrophoneEnabled ? <MicIcon /> : <MicOffIcon />}
            </button>
          </div>
        )}

        <p className="text-xs text-white/40">{statusLabel}</p>

        {earlier.length > 0 && !connected && (
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs text-white/50 underline-offset-4 transition hover:text-white/80 hover:underline"
          >
            {showHistory ? "Hide transcript" : `Show transcript (${earlier.length})`}
          </button>
        )}
      </div>

      {showHistory && earlier.length > 0 && (
        <div className="mt-4 max-h-56 w-full overflow-y-auto rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="flex flex-col gap-3 text-sm">
            {earlier.map((entry, i) => (
              <div key={i}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  {entry.role === "user" ? "You" : "Agent"}
                </p>
                <p className="mt-0.5 leading-6 text-white/70">{entry.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" stroke="none" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M9 9v2a3 3 0 0 0 4.5 2.6M15 11V5a3 3 0 0 0-6-.5" />
      <path d="M5 11a7 7 0 0 0 10.5 6M19 11a7 7 0 0 1-.6 2.8M12 18v4" />
      <path d="m3 3 18 18" />
    </svg>
  );
}

function LoopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 2.5 20 5.5 17 8.5" />
      <path d="M4 11.5v-2a4 4 0 0 1 4-4h12" />
      <path d="M7 21.5 4 18.5 7 15.5" />
      <path d="M20 12.5v2a4 4 0 0 1-4 4H4" />
    </svg>
  );
}

function EndIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
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
