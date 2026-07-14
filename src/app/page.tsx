// Main demo UI (A4). Planned sections:
//   1. Voice widget — @vocalbridgeai/react, token from POST /api/voice-token
//   2. Trip summary card — flight + hotel + price from the in-memory trip state
//   3. Passport upload — POST /api/extract-document, show extracted fields
//   4. Pay with PayPal — POST /api/pay, then /api/pay/capture
//   5. "Simulate Delay" demo button — POST /api/disrupt (triggers the phone call)

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 font-sans">
      <h1 className="text-3xl font-semibold tracking-tight">Voice Travel Agent</h1>
      <p className="max-w-md text-center text-zinc-500">
        Books your complete trip by voice — and calls you when it falls apart.
      </p>
      <p className="rounded-full border border-zinc-300 px-4 py-1 text-sm text-zinc-400 dark:border-zinc-700">
        UI under construction — see plan.md (A4)
      </p>
    </main>
  );
}
