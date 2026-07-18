// Main demo screen — a tabbed shell so each part of the booking gets its own
// view instead of one long page.

import AppShell from "@/components/AppShell";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-5 font-sans md:p-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold uppercase tracking-[0.18em] text-yellow-400">Guidio</h1>
        <p className="text-sm text-white/45">
          Speak naturally with Guidio — it fills in each tab as you talk.
        </p>
      </header>

      <AppShell />
    </main>
  );
}
