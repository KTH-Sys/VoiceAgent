"use client";

// Every panel reads the same server-side trip, which the voice agent mutates
// out from under us — so each one polls through this hook.

import { useEffect, useState } from "react";
import type { Trip } from "@/lib/store";
import { DEMO_TRIP_ID } from "@/lib/constants";

export function useTrip() {
  const [trip, setTrip] = useState<Trip | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/trip?tripId=${DEMO_TRIP_ID}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setTrip(data.trip);
      } catch {
        /* transient — the next tick will retry */
      }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return [trip, setTrip] as const;
}

/**
 * Which step of the booking the trip is currently sitting on.
 * Steps run Traveler → Trip → Payment → Confirmed: identifying the traveller
 * comes first, so the agent knows who is flying before it searches.
 */
export function tripStage(trip: Trip | null) {
  if (trip?.confirmationNumber) return 3; // Confirmed
  if (trip?.paymentStatus === "paid" || trip?.paypalApproveUrl) return 2; // Payment under way
  if (!trip?.traveler?.fullName) return 0; // still need the traveller
  if (trip?.flight || trip?.hotel) return 2; // traveller + itinerary → ready to pay
  return 1; // traveller known, still choosing the trip
}
