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

/** Which step of the booking the trip is currently sitting on. */
export function tripStage(trip: Trip | null) {
  if (trip?.confirmationNumber) return 3;
  if (trip?.paymentStatus === "paid" || trip?.paypalApproveUrl) return 2;
  if (trip?.traveler?.fullName) return 1;
  return 0;
}
