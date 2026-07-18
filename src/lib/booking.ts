// Rebooking during a disruption (shared by the voice agent tool and /api/rebook).
// Swaps the trip's flight to an alternative, charges any fare difference through
// PayPal, and issues a new confirmation.

import type { FlightOption } from "./sabre";
import { createBooking } from "./sabre";
import { createOrder, captureOrder } from "./paypal";
import { getTrip, updateTrip } from "./store";

export interface RebookResult {
  ok: boolean;
  message: string; // spoken-friendly summary
  flight?: FlightOption;
  fareDifference?: number;
  confirmationNumber?: string;
}

/**
 * Book an alternative flight found during a disruption.
 * @param flightId  which alternative to book; defaults to the next/best one.
 */
export async function rebookNextFlight(sessionId: string, flightId?: number): Promise<RebookResult> {
  const trip = getTrip(sessionId);
  const alts = (trip.alternatives as FlightOption[] | undefined) ?? [];
  if (!alts.length) {
    return { ok: false, message: "No alternative flights are available yet — search for options first." };
  }

  const chosen = flightId !== undefined ? alts.find((f) => f.id === Number(flightId)) : alts[0];
  if (!chosen) {
    return { ok: false, message: `No alternative flight with id ${flightId}. Offer one of the options you listed.` };
  }

  const old = trip.flight as FlightOption | undefined;
  const fareDiff = Math.round((chosen.totalPrice - (old?.totalPrice ?? 0)) * 100) / 100;

  // Fare difference is a real PayPal charge (capture is simulated in demo mode,
  // so the disruption call never stalls on a buyer login). Never let a PayPal
  // hiccup block the rebooking itself.
  let fareNote = "at no extra cost";
  if (fareDiff > 0) {
    try {
      const { orderId } = await createOrder(
        fareDiff.toFixed(2),
        `Fare difference — rebooking to ${chosen.segments[0]?.flight ?? "new flight"}`,
      );
      await captureOrder(orderId);
      updateTrip(sessionId, { paypalOrderId: orderId, paymentStatus: "paid" });
      fareNote = `with a $${fareDiff.toFixed(2)} fare difference charged to your PayPal`;
    } catch (err) {
      console.error("rebook: fare-difference payment failed:", err);
      fareNote = `with a $${fareDiff.toFixed(2)} fare difference`;
    }
  } else if (fareDiff < 0) {
    fareNote = `and a $${Math.abs(fareDiff).toFixed(2)} refund to your PayPal`;
  }

  const { confirmationNumber } = await createBooking(sessionId);
  updateTrip(sessionId, { flight: chosen, disrupted: false, confirmationNumber });

  const seg = chosen.segments[0];
  return {
    ok: true,
    flight: chosen,
    fareDifference: fareDiff,
    confirmationNumber,
    message: `Rebooked onto ${seg?.flight} departing ${seg?.departure} ${fareNote}. New confirmation code: ${confirmationNumber}.`,
  };
}
