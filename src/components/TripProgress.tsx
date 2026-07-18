"use client";

// A single glance at how far the conversation has got: the agent fills these
// in as you talk, so the user always knows what the agent still needs.

import type { Trip } from "@/lib/store";
import { tripStage } from "@/lib/useTrip";

const STEPS = ["Trip", "Traveler", "Payment", "Confirmed"];

export default function TripProgress({ trip }: { trip: Trip | null }) {
  const current = tripStage(trip);

  return (
    <ol className="flex items-center gap-2" aria-label="Booking progress">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 flex-col gap-1.5">
            <div
              className={`h-1 rounded-full transition-all duration-500 ${
                done
                  ? "bg-yellow-400/60"
                  : active
                    ? "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]"
                    : "bg-white/10"
              }`}
            />
            <span
              className={`text-[11px] font-medium tracking-wide ${
                done ? "text-white/55" : active ? "text-yellow-400" : "text-white/30"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
