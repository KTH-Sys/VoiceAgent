# Voice Travel Agent — DeepLearning.AI Voice AI Hackathon

A voice travel concierge that books your complete trip — and **calls your phone** when the trip gets disrupted.

Built for the *Voice AI Hackathon: The Complete Trip* (Sabre + Vocal Bridge). See [plan.md](plan.md) for the full project plan, task assignments (KTH / Allison), timeline, and demo script.

## Stack

- **Next.js** (App Router, TypeScript, Tailwind) — one app, UI + API routes
- **Vocal Bridge** — web voice agent + outbound phone calling
- **Sabre** (test env) — flight & hotel search/booking
- **PayPal** (sandbox) — checkout for the booking
- **LandingAI ADE** — passport/ID photo → traveler details

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in API keys (see plan.md §7 for account setup)
npm run dev                  # http://localhost:3000
```

All API keys are server-side only (`.env.local`, never committed).

## Repo layout

```
src/
  app/
    page.tsx                     # main UI: voice widget, trip card, upload, pay, Simulate Delay (A4)
    api/
      voice-token/route.ts       # mint Vocal Bridge browser session token (K1)
      flights/search/route.ts    # Sabre flight search (K2)
      hotels/search/route.ts     # Sabre hotel search (K3)
      book/route.ts              # confirm booking / PNR (K7)
      extract-document/route.ts  # LandingAI passport extraction (A3 + integration)
      pay/route.ts               # PayPal create order (K5)
      pay/capture/route.ts       # PayPal capture order (K5)
      disrupt/route.ts           # demo trigger → outbound disruption call (K6)
  lib/
    sabre.ts                     # Sabre auth + search/booking client
    vocalbridge.ts               # session tokens + outbound calls
    paypal.ts                    # orders create/capture
    landingai.ts                 # document extraction
    store.ts                     # in-memory trip state (no DB)
```

Every route currently returns **501 Not implemented** — task IDs (K1–K7, A1–A6) map to the assignment tables in [plan.md](plan.md).

## Team

- **KTH** — backend & integrations (Sabre, Vocal Bridge tools, PayPal, outbound call)
- **Allison** — accounts/credits, VB agent design, LandingAI schema, UI, demo script
