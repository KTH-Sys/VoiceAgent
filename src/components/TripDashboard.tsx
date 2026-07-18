"use client";

// A4: the trip panels — progress, itinerary, PayPal, Simulate Delay.
// Trip state lives server-side (the voice agent writes to it) and reaches these
// panels through TripProvider, so they all render whatever the agent has saved.

import { useState } from "react";
import type { Trip } from "@/lib/store";
import type { FlightOption, HotelOption } from "@/lib/sabre";
import Section from "@/components/ui/Section";
import TripProgress from "@/components/TripProgress";
import { useTripContext } from "@/lib/TripContext";
import { DEMO_TRIP_ID } from "@/lib/constants";

const money = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

function formatWhen(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function tripTotal(trip: Trip | null) {
  const flight = trip?.flight as FlightOption | undefined;
  const hotel = trip?.hotel as HotelOption | undefined;
  return (flight?.totalPrice ?? 0) + (hotel?.totalPrice ?? 0);
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `${url} failed`);
  return data;
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
      {children}
    </p>
  );
}

/* ---------- Progress + disruption banner ---------- */

export function TripStatus() {
  const [trip] = useTripContext();
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl">
        <TripProgress trip={trip} />
      </div>

      {trip?.disrupted && !trip?.confirmationNumber && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <strong>Flight disrupted.</strong> Guidio is calling you with alternatives.
        </div>
      )}
    </div>
  );
}

/* ---------- Itinerary ---------- */

export function TripSummary() {
  const [trip] = useTripContext();
  const flight = trip?.flight as FlightOption | undefined;
  const hotel = trip?.hotel as HotelOption | undefined;
  const total = tripTotal(trip);
  const travelers = trip?.travelers ?? [];
  const confirmed = Boolean(trip?.confirmationNumber);

  return (
    <Section title="Your trip" hint="Updates live as Guidio finds options.">
      {!flight && !hotel ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-white/40">
          Nothing booked yet — ask Guidio to find you a flight.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {confirmed && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">Booking confirmed</p>
                <p className="mt-0.5 font-mono text-xl font-semibold tracking-widest text-white">
                  {trip?.confirmationNumber}
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                ✓ Ticketed
              </span>
            </div>
          )}

          {flight && (
            <div className="flex flex-col gap-1">
              {(flight.segments ?? []).map((s, i) => (
                <div key={i} className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">
                    {s.from} → {s.to}
                  </span>
                  <span className="text-sm text-white/45">
                    {s.flight} · {formatWhen(s.departure)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {hotel && (
            <div className="flex items-baseline justify-between gap-3 border-t border-white/10 pt-3">
              <span className="font-medium">{hotel.name}</span>
              <span className="text-sm text-white/45">
                {money(hotel.pricePerNight ?? 0, hotel.currency ?? "USD")}/night
              </span>
            </div>
          )}

          {travelers.length > 0 && (
            <div className="border-t border-white/10 pt-3">
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                Traveler{travelers.length > 1 ? "s" : ""} ({travelers.length}
                {trip?.passengers && trip.passengers !== travelers.length ? ` of ${trip.passengers}` : ""})
              </p>
              <div className="flex flex-col gap-1.5">
                {travelers.map((t, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-white/90">{t.fullName}</span>
                    {t.passportNumber && (
                      <span className="font-mono text-xs text-white/45">{t.passportNumber}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-baseline justify-between border-t border-white/10 pt-3">
            <span className="text-sm text-white/45">
              Total{trip?.passengers && trip.passengers > 1 ? ` · ${trip.passengers} travelers` : ""}
            </span>
            <span className="text-xl font-semibold tabular-nums text-yellow-400">{money(total)}</span>
          </div>
        </div>
      )}
    </Section>
  );
}

/* ---------- Payment ---------- */

export function PaymentPanel() {
  const [trip, setTrip] = useTripContext();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"pay" | "capture" | null>(null);

  const total = tripTotal(trip);
  const paid = trip?.paymentStatus === "paid";

  async function handlePay() {
    setBusy("pay");
    setError(null);
    try {
      const flight = trip?.flight as FlightOption | undefined;
      const data = await post("/api/pay", {
        tripId: DEMO_TRIP_ID,
        amountUsd: total.toFixed(2),
        description: flight?.segments?.[0]
          ? `Trip ${flight.segments[0].from}–${flight.segments.at(-1)?.to}`
          : "Complete trip",
      });
      if (data.simulate) {
        // Demo mode: skip the PayPal window entirely — capture and confirm in one click.
        await post("/api/pay/capture", { tripId: DEMO_TRIP_ID, orderId: data.orderId });
        const booked = await post("/api/book", { tripId: DEMO_TRIP_ID });
        setTrip(booked.trip);
      } else {
        window.open(data.approveUrl, "_blank", "noopener");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleCapture() {
    setBusy("capture");
    setError(null);
    try {
      await post("/api/pay/capture", { tripId: DEMO_TRIP_ID, orderId: trip?.paypalOrderId });
      const data = await post("/api/book", { tripId: DEMO_TRIP_ID });
      setTrip(data.trip);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Section title="Payment">
      {trip?.confirmationNumber ? (
        <div className="flex flex-col gap-1 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-sm text-emerald-300">Booking confirmed</p>
          <p className="font-mono text-2xl font-semibold tracking-widest text-white">
            {trip.confirmationNumber}
          </p>
        </div>
      ) : paid ? (
        <p className="text-sm text-white/45">Paid — confirming your booking…</p>
      ) : trip?.paypalApproveUrl ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-white/45">
            Approve the payment in the PayPal window, then complete it here.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={trip.paypalApproveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-yellow-400 px-5 py-2 text-sm font-semibold text-black transition hover:bg-yellow-300"
            >
              Approve with PayPal
            </a>
            <button
              onClick={handleCapture}
              disabled={busy === "capture"}
              className="rounded-full border border-white/20 px-5 py-2 text-sm text-white/85 transition hover:bg-white/10 disabled:opacity-50"
            >
              {busy === "capture" ? "Completing…" : "I've approved — complete"}
            </button>
          </div>
        </div>
      ) : total <= 0 ? (
        // Nothing priced yet — a "Pay $0.00" button would just look broken.
        <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-white/40">
          Nothing to pay for yet. Once Guidio picks a flight or hotel, checkout appears here.
        </p>
      ) : (
        <button
          onClick={handlePay}
          disabled={busy === "pay"}
          className="rounded-full bg-yellow-400 px-5 py-2 text-sm font-semibold text-black transition hover:bg-yellow-300 disabled:opacity-40"
        >
          {busy === "pay" ? "Creating order…" : `Pay ${money(total)} with PayPal`}
        </button>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}
    </Section>
  );
}

/* ---------- Demo controls ---------- */

export function DemoControls() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callNote, setCallNote] = useState<string | null>(null);

  async function handleDisrupt() {
    setBusy(true);
    setError(null);
    setCallNote(null);
    try {
      const data = await post("/api/disrupt", { tripId: DEMO_TRIP_ID });
      const n = data.alternatives?.length ?? 0;
      setCallNote(
        `Calling you now — ${n} alternative${n === 1 ? "" : "s"} found.` +
          (data.callId ? `\nVocal Bridge call ID: ${data.callId}` : ""),
      );
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Demo controls" hint="Trigger the disruption flow for the walkthrough.">
      <button
        onClick={handleDisrupt}
        disabled={busy}
        className="w-full rounded-full border border-red-500/40 bg-transparent px-6 py-3 font-semibold text-red-400 transition hover:bg-red-500/15 disabled:opacity-50"
      >
        {busy ? "Calling…" : "Simulate Delay"}
      </button>
      {callNote && (
        <p className="mt-2 whitespace-pre-line break-all text-center text-xs text-white/45">{callNote}</p>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
    </Section>
  );
}
