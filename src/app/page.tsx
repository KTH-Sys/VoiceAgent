// Main demo screen: voice agent on the left, trip state + actions on the right.

import VoiceWidget from "@/components/VoiceWidget";
import TripDashboard from "@/components/TripDashboard";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 p-6 font-sans md:p-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Voice Travel Agent</h1>
        <p className="text-zinc-500">
          Books your complete trip by voice — and calls you when it falls apart.
        </p>
      </header>

      <div className="grid items-start gap-6 md:grid-cols-2">
        <VoiceWidget />
        <TripDashboard />
      </div>
    </main>
  );
}
