"use client";

// Traveler section — the first screen people land on. Scanning a passport or ID
// here means Guidio already knows who is flying before the conversation starts.

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

function IdIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <circle cx="8.5" cy="11" r="2.25" />
      <path d="M5 16.5c.6-1.6 2-2.4 3.5-2.4s2.9.8 3.5 2.4M14.5 9.5h4M14.5 13h4" />
    </svg>
  );
}

export default function UserDetailPanel({ onContinue }: { onContinue?: () => void }) {
  const [trip, setTrip] = useTripContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
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

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  const traveler = trip?.traveler;

  const fileField = (
    <input
      ref={fileInput}
      type="file"
      accept="image/*,application/pdf"
      onChange={handleUpload}
      className="hidden"
    />
  );

  return (
    <Section
      title="Traveler"
      hint={
        traveler?.fullName
          ? "Scanned from your document — Guidio keeps this for the booking."
          : "Start here: scan your passport or ID so Guidio knows who's flying."
      }
      action={
        traveler?.fullName ? (
          <>
            {fileField}
            <button
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="shrink-0 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-medium text-white/85 transition hover:bg-white/10 disabled:opacity-50"
            >
              {busy ? "Reading…" : "Replace"}
            </button>
          </>
        ) : null
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

          {onContinue && (
            <button
              onClick={onContinue}
              className="w-full rounded-full bg-yellow-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300"
            >
              Continue — talk to Guidio
            </button>
          )}
        </div>
      ) : (
        // Landing state: a real drop zone, since this is the first thing people see.
        <div className="flex flex-col gap-3">
          {fileField}
          <button
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            disabled={busy}
            className={`flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition disabled:opacity-60 ${
              dragging
                ? "border-yellow-400 bg-yellow-400/10"
                : "border-white/20 hover:border-yellow-400/60 hover:bg-white/[0.03]"
            }`}
          >
            <span className={busy ? "text-yellow-400" : "text-white/50"}>
              <IdIcon />
            </span>
            <span className="text-sm font-semibold text-white">
              {busy ? "Reading your document…" : "Upload your passport or ID"}
            </span>
            <span className="text-xs text-white/40">
              {busy ? "Extracting name, number and dates" : "Drop a photo or PDF here, or click to browse"}
            </span>
          </button>

          <p className="text-center text-xs text-white/35">
            Prefer to skip? Open the Talk tab and tell Guidio your details out loud.
          </p>
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
