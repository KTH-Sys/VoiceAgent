"use client";

// One poll for the whole screen. The voice agent mutates the trip server-side,
// so every panel reads it from here instead of running its own timer.

import { createContext, useContext } from "react";
import type { Trip } from "@/lib/store";
import { useTrip } from "@/lib/useTrip";

type TripContextValue = readonly [Trip | null, (trip: Trip) => void];

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const value = useTrip();
  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTripContext(): TripContextValue {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTripContext must be used inside <TripProvider>");
  return ctx;
}
