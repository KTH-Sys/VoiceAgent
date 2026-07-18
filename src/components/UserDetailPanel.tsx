"use client";

// Traveler section: whatever the agent has collected, plus the passport upload
// that fills it in automatically.

import { useRef, useState } from "react";
import Section from "@/components/ui/Section";
import { useTripContext } from "@/lib/TripContext";
import { DEMO_TRIP_ID } from "@/lib/constants";

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <dt className="text-xs uppercase tracking-[0.18em] text-white/40">{label}</dt>
      <dd className={`mt-1 text-sm text-white/90 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

export default function UserDetailPanel() {
  const [trip, setTrip] = useTripContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
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
      setBusy(false);
      if (fileInput.current) fileInput.current.value = ""; // allow re-picking the same file
    }
  }

  const traveler = trip?.traveler;

  return (
    <Section
      title="Traveler"
      hint="Guidio fills this in as you talk — or scan a passport."
      action={
        <>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="shrink-0 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-medium text-white/85 transition hover:bg-white/10 disabled:opacity-50"
          >
            {busy ? "Reading…" : "Upload passport"}
          </button>
        </>
      }
    >
      {traveler?.fullName ? (
        <div className="space-y-3 text-sm">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Name</p>
            <p className="mt-1 text-lg font-semibold text-white">{traveler.fullName}</p>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            {traveler.passportNumber && (
              <Field label="Passport" value={traveler.passportNumber} mono />
            )}
            {traveler.dateOfBirth && <Field label="Date of birth" value={traveler.dateOfBirth} />}
            {traveler.passportExpiry && (
              <Field label="Passport expiry" value={traveler.passportExpiry} />
            )}
          </dl>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-white/40">
          No traveler details yet. Upload a passport photo, or just tell Guidio your name and
          passport number out loud.
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </p>
      )}
    </Section>
  );
}
