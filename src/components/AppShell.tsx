"use client";

// Tabbed shell. The voice widget is mounted once and only *hidden* when you
// switch tabs — unmounting it would tear down the live call.

import { useState } from "react";
import VoiceWidget from "@/components/VoiceWidget";
import UserDetailPanel from "@/components/UserDetailPanel";
import { TripStatus, TripSummary, PaymentPanel, DemoControls } from "@/components/TripDashboard";
import { TripProvider, useTripContext } from "@/lib/TripContext";
import { tripStage } from "@/lib/useTrip";

// Traveler leads: identify who's flying before the conversation starts.
const TABS = ["Traveler", "Talk", "Trip", "Payment"] as const;
type Tab = (typeof TABS)[number];

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const [trip] = useTripContext();
  const stage = tripStage(trip);

  // A filled dot means that tab already has something worth looking at.
  const ready: Record<Tab, boolean> = {
    Traveler: Boolean(trip?.traveler?.fullName),
    Talk: false,
    Trip: Boolean(trip?.flight || trip?.hotel),
    Payment: stage >= 2,
  };

  return (
    <div
      role="tablist"
      aria-label="Sections"
      className="flex w-full gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1.5 backdrop-blur"
    >
      {TABS.map((tab) => {
        const selected = tab === active;
        return (
          <button
            key={tab}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab)}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
              selected
                ? "bg-yellow-400 text-black"
                : "text-white/55 hover:bg-white/8 hover:text-white"
            }`}
          >
            {tab}
            {ready[tab] && !selected && (
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function Shell() {
  const [tab, setTab] = useState<Tab>("Traveler");

  return (
    <div className="flex flex-col gap-5">
      <TripStatus />
      <TabBar active={tab} onChange={setTab} />

      {tab === "Traveler" && (
        <div role="tabpanel" aria-label="Traveler">
          {/* Once the document is read, send them straight into the conversation. */}
          <UserDetailPanel onContinue={() => setTab("Talk")} />
        </div>
      )}

      {/* Always mounted so the call survives tab switches. */}
      <div className={tab === "Talk" ? "" : "hidden"} role="tabpanel" aria-label="Talk">
        <VoiceWidget />
      </div>

      {tab === "Trip" && (
        <div role="tabpanel" aria-label="Trip" className="flex flex-col gap-4">
          <TripSummary />
          <DemoControls />
        </div>
      )}

      {tab === "Payment" && (
        <div role="tabpanel" aria-label="Payment">
          <PaymentPanel />
        </div>
      )}
    </div>
  );
}

export default function AppShell() {
  return (
    <TripProvider>
      <Shell />
    </TripProvider>
  );
}
