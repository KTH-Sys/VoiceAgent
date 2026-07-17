"use client";

// A4: the demo screen — trip summary, passport upload, PayPal, Simulate Delay.
// Trip state lives server-side (the voice agent writes to it), so we poll
// /api/trip and render whatever the agent has saved.

import { useEffect, useRef, useState } from "react";
import type { Trip } from "@/lib/store";
import type { FlightOption, HotelOption } from "@/lib/sabre";
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">{title}</h2>
      {children}
    </section>
  );
}

export default function TripDashboard() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"upload" | "pay" | "capture" | "disrupt" | null>(null);
  const [callNote, setCallNote] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Poll trip state — the voice agent mutates it out from under us.
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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("upload");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("tripId", DEMO_TRIP_ID);
      const res = await fetch("/api/extract-document", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "extraction failed");
      setTrip(data.trip);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = ""; // allow re-picking the same file
    }
  }

  async function handlePay() {
    setBusy("pay");
    setError(null);
    try {
      const flight = trip?.flight as FlightOption | undefined;
      const data = await post("/api/pay", {
        tripId: DEMO_TRIP_ID,
        amountUsd: tripTotal(trip).toFixed(2),
        description: flight?.segments?.[0]
          ? `Trip ${flight.segments[0].from}–${flight.segments.at(-1)?.to}`
          : "Complete trip",
      });
      window.open(data.approveUrl, "_blank", "noopener");
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

  async function handleDisrupt() {
    setBusy("disrupt");
    setError(null);
    setCallNote(null);
    try {
      const data = await post("/api/disrupt", { tripId: DEMO_TRIP_ID });
      const n = data.alternatives?.length ?? 0;
      setCallNote(`Calling you now — ${n} alternative${n === 1 ? "" : "s"} found.`);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(null);
    }
  }

  const flight = trip?.flight as FlightOption | undefined;
  const hotel = trip?.hotel as HotelOption | undefined;
  const total = tripTotal(trip);
  const paid = trip?.paymentStatus === "paid";

  return (
    <div className="flex w-full flex-col gap-4">
      {trip?.disrupted && !trip?.confirmationNumber && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <strong>Flight disrupted.</strong> The agent is calling you with alternatives.
        </div>
      )}

      <Section title="Your trip">
        {!flight && !hotel ? (
          <p className="text-sm text-zinc-400">
            Nothing booked yet — ask the agent to find you a flight.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {flight && (
              <div className="flex flex-col gap-1">
                {(flight.segments ?? []).map((s, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">
                      {s.from} → {s.to}
                    </span>
                    <span className="text-sm text-zinc-500">
                      {s.flight} · {formatWhen(s.departure)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {hotel && (
              <div className="flex items-baseline justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-900">
                <span className="font-medium">{hotel.name}</span>
                <span className="text-sm text-zinc-500">
                  {money(hotel.pricePerNight ?? 0, hotel.currency ?? "USD")}/night
                </span>
              </div>
            )}

            <div className="flex items-baseline justify-between border-t border-zinc-100 pt-3 dark:border-zinc-900">
              <span className="text-sm text-zinc-500">Total</span>
              <span className="text-xl font-semibold tabular-nums">{money(total)}</span>
            </div>
          </div>
        )}
      </Section>

      <Section title="Traveler">
        {trip?.traveler?.fullName ? (
          <dl className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Name</dt>
              <dd className="font-medium">{trip.traveler.fullName}</dd>
            </div>
            {trip.traveler.passportNumber && (
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Passport</dt>
                <dd className="font-mono">{trip.traveler.passportNumber}</dd>
              </div>
            )}
            {trip.traveler.dateOfBirth && (
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Date of birth</dt>
                <dd>{trip.traveler.dateOfBirth}</dd>
              </div>
            )}
            {trip.traveler.passportExpiry && (
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Expires</dt>
                <dd>{trip.traveler.passportExpiry}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="mb-3 text-sm text-zinc-400">
            Snap a photo of your passport — no dictating numbers out loud.
          </p>
        )}
        <label className="mt-3 inline-block cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
          {busy === "upload"
            ? "Reading document…"
            : trip?.traveler?.fullName
              ? "Replace photo"
              : "Upload passport photo"}
          <input
            ref={fileInput}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleUpload}
            disabled={busy === "upload"}
          />
        </label>
      </Section>

      <Section title="Payment">
        {trip?.confirmationNumber ? (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-zinc-500">Booking confirmed</p>
            <p className="font-mono text-2xl font-semibold tracking-widest">
              {trip.confirmationNumber}
            </p>
          </div>
        ) : paid ? (
          <p className="text-sm text-zinc-500">Paid — confirming your booking…</p>
        ) : trip?.paypalApproveUrl ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-zinc-500">
              Approve the payment in the PayPal window, then complete it here.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={trip.paypalApproveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[#0070ba] px-5 py-2 text-sm font-medium text-white hover:bg-[#005ea6]"
              >
                Approve with PayPal
              </a>
              <button
                onClick={handleCapture}
                disabled={busy === "capture"}
                className="rounded-full border border-zinc-300 px-5 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                {busy === "capture" ? "Completing…" : "I've approved — complete"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handlePay}
            disabled={total <= 0 || busy === "pay"}
            className="rounded-full bg-[#0070ba] px-5 py-2 text-sm font-medium text-white hover:bg-[#005ea6] disabled:opacity-40"
          >
            {busy === "pay" ? "Creating order…" : `Pay ${money(total)} with PayPal`}
          </button>
        )}
      </Section>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-col items-center gap-2 pt-2">
        <button
          onClick={handleDisrupt}
          disabled={busy === "disrupt"}
          className="w-full rounded-full bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {busy === "disrupt" ? "Calling…" : "Simulate Delay"}
        </button>
        {callNote && <p className="text-xs text-zinc-500">{callNote}</p>}
      </div>
    </div>
  );
}
