"use client";

// Siri-inspired ambient ring: no solid body, just layers of coloured light
// drifting at different speeds, masked into a halo with soft edges so nothing
// reads as a hard surface. Intensity and speed track the voice state.

export type OrbState = "idle" | "connecting" | "live" | "muted";

// Soft on both the inner and outer edge — a hard mask would look like a disc.
const RING_MASK =
  "radial-gradient(closest-side, transparent 38%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.85) 62%, #000 76%, rgba(0,0,0,0.5) 90%, transparent 100%)";

export default function Orb({ state, size = 230 }: { state: OrbState; size?: number }) {
  const live = state === "live";
  const dim = state === "idle" || state === "muted";

  // Everything slows and fades when the agent isn't listening.
  const speed = live ? 1 : state === "connecting" ? 1.6 : 2.4;
  const s = (base: number) => `${base * speed}s`;

  return (
    <div
      className="relative shrink-0 select-none"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Outward pulses while listening. */}
      {live && (
        <>
          <span
            className="orb-layer absolute inset-0 rounded-full border border-yellow-400/30"
            style={{ animation: "orb-ring 3.4s ease-out infinite" }}
          />
          <span
            className="orb-layer absolute inset-0 rounded-full border border-amber-400/25"
            style={{ animation: "orb-ring 3.4s ease-out 1.7s infinite" }}
          />
        </>
      )}

      {/* Ambient bloom spilling onto the background. */}
      <div
        className="orb-layer absolute -inset-[15%] rounded-full blur-3xl transition-opacity duration-1000"
        style={{
          opacity: dim ? 0.55 : 0.8,
          animation: `orb-breathe ${s(5)} ease-in-out infinite`,
          background:
            "radial-gradient(circle at 50% 50%, rgba(250,204,21,0.45), rgba(245,158,11,0.3) 45%, transparent 72%)",
        }}
      />

      {/* The ring itself: rotating light, carved out by the mask. */}
      <div
        className="orb-layer absolute inset-0 transition-all duration-1000"
        style={{
          maskImage: RING_MASK,
          WebkitMaskImage: RING_MASK,
          // Never fully static — an idle Siri ring still drifts, just slower.
          opacity: dim ? 0.85 : 1,
          filter: `blur(${live ? 9 : 11}px) saturate(${dim ? 1.15 : 1.45})`,
          animation: `orb-breathe ${s(6)} ease-in-out infinite`,
        }}
      >
        {/* Bright yellow sweep. */}
        <div
          className="orb-layer absolute inset-[-15%] rounded-full"
          style={{
            animation: `orb-spin ${s(9)} linear infinite`,
            background:
              "conic-gradient(from 0deg, transparent 0%, #fef08a 10%, #fde047 22%, #facc15 32%, transparent 46%, #eab308 66%, transparent 88%)",
          }}
        />
        {/* Amber sweep, counter-rotating so the tones keep recombining. */}
        <div
          className="orb-layer absolute inset-[-15%] rounded-full mix-blend-screen"
          style={{
            animation: `orb-spin-reverse ${s(14)} linear infinite`,
            background:
              "conic-gradient(from 140deg, transparent 0%, #f59e0b 14%, #fbbf24 28%, transparent 50%, #d97706 74%, transparent 92%)",
          }}
        />
        {/* Slow gold drift, wobbling to keep the band uneven. */}
        <div
          className="orb-layer absolute inset-[-10%] mix-blend-screen"
          style={{
            animation: `orb-wobble ${s(11)} ease-in-out infinite`,
            opacity: 0.9,
            background:
              "radial-gradient(circle at 68% 28%, rgba(253,224,71,0.9) 0%, transparent 52%), radial-gradient(circle at 28% 74%, rgba(251,191,36,0.8) 0%, transparent 55%)",
          }}
        />
        {/* Pale core light, brightest while listening. */}
        <div
          className="orb-layer absolute inset-[8%] rounded-full mix-blend-screen"
          style={{
            animation: `orb-spin ${s(20)} linear infinite`,
            opacity: live ? 0.55 : 0.3,
            background:
              "conic-gradient(from 60deg, transparent 0%, rgba(255,251,235,0.9) 18%, transparent 40%, rgba(255,255,255,0.6) 72%, transparent 94%)",
          }}
        />
      </div>

      {state === "muted" && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="rounded-full bg-yellow-400 px-3 py-1 text-[11px] font-semibold tracking-wide text-black shadow-sm">
            Muted
          </span>
        </div>
      )}
    </div>
  );
}
