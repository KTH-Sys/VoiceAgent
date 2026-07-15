// Main demo UI. Voice plumbing (K4) is wired via VoiceWidget; remaining
// sections for A4: trip summary card, passport upload (POST /api/extract-document),
// PayPal approve/capture buttons, and the "Simulate Delay" button (POST /api/disrupt).

import VoiceWidget from "@/components/VoiceWidget";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 font-sans">
      <h1 className="text-3xl font-semibold tracking-tight">Voice Travel Agent</h1>
      <p className="max-w-md text-center text-zinc-500">
        Books your complete trip by voice — and calls you when it falls apart.
      </p>
      <VoiceWidget />
      <p className="rounded-full border border-zinc-300 px-4 py-1 text-sm text-zinc-400 dark:border-zinc-700">
        Trip card, passport upload, PayPal &amp; Simulate Delay — see plan.md (A4)
      </p>
    </main>
  );
}
