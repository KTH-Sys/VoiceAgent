# Voice AI Hackathon Plan

**Event:** DeepLearning.AI Voice AI Hackathon: The Complete Trip (powered by Sabre + Vocal Bridge)
**Date:** Hacking runs 10:00 AM – 4:00 PM (~6 hours). Final pitches at 4:00 PM. Live demo required.
**Team:** KTH, Allison

---

## 1. The Idea

A voice travel concierge that books your whole trip — and calls you when it falls apart.**

Two acts, one agent:

1. **Book the complete trip by voice.** The user talks to a web voice agent: "Find me a flight from SFO to Dallas next Friday, and a hotel near downtown." The agent searches flights and hotels via **Sabre**, reads back options, and books the chosen one. Instead of dictating passport numbers letter-by-letter (painful by voice), the user snaps a photo of their passport/ID and **LandingAI ADE** extracts the traveler details to fill the booking. Payment is completed with **PayPal** sandbox checkout.

2. **The agent shows up when it matters most.** We simulate a flight disruption (a "delay" webhook / demo button). The agent **calls the user's phone** via Vocal Bridge outbound calling: "Hi, your AA flight to Dallas is delayed 4 hours — I found two alternatives, want me to rebook you on the 2:15?" The user rebooks entirely by voice on a phone call, and the fare difference is handled through PayPal.

### Why this wins
- **Matches the event tagline literally** — "not a chatbot… a voice agent that shows up when it matters most." Most teams will build inbound web voice; an *outbound phone call* during the live demo is a showstopper moment.
- **Uses all four sponsor APIs meaningfully**, not as checkboxes: Sabre (flights + hotels = "complete trip"), Vocal Bridge (web voice + outbound phone), LandingAI (document → structured traveler data, solves a real voice-UX pain), PayPal (payment + fare-difference flow).
- **Special category plays:** disruption story centers on an American Airlines flight (AA award), and payment flow is a real PayPal use case (PayPal award).
- **Demo-safe:** disruption is triggered by our own demo button, so nothing depends on real-world timing.

### Scope guardrails (6 hours!)
- Sabre **test environment** data only; hardcode sensible defaults (dates, city pairs) as fallbacks.
- "Booking" = Sabre search + create PNR if time allows; otherwise search real data + mock the confirm step. Judges care about the voice experience and real API data, not a real ticket.
- One happy-path demo script, rehearsed. Cut features, never cut rehearsal.

---

## 2. Architecture

```
┌─────────────┐  voice (mic)  ┌──────────────┐   tool calls   ┌────────────────────┐
│  Browser UI │ ────────────► │ Vocal Bridge │ ─────────────► │ Next.js API routes │
│  (Next.js)  │ ◄──────────── │  voice agent │ ◄───────────── │  (our backend)      │
└─────────────┘               └──────┬───────┘                └──────┬─────────────┘
      ▲                              │ outbound call                 │
      │ passport photo upload        ▼                               ▼
      │                        ☎ user's phone            Sabre (flights/hotels)
      └── LandingAI ADE ◄──────────────────────           PayPal (orders/checkout)
```

**Stack:** Next.js (App Router) — one repo, one deploy. `@vocalbridgeai/react` on the client; all API keys server-side in `.env.local`.

**Key backend routes:**
- `POST /api/voice-token` — mints Vocal Bridge session token (per VB developer guide)
- `POST /api/flights/search` — Sabre flight search (Bargain Finder Max / hackathon-2026 collection)
- `POST /api/hotels/search` — Sabre hotel search
- `POST /api/book` — create booking (or mock confirm) from selected offer + traveler profile
- `POST /api/extract-document` — proxy passport/ID image to LandingAI ADE, return structured traveler fields
- `POST /api/pay` — create PayPal sandbox order; `POST /api/pay/capture` — capture it
- `POST /api/disrupt` — demo trigger: marks trip disrupted, finds Sabre alternatives, fires Vocal Bridge **outbound call** to the user's phone

**State:** in-memory store (a module-level object) keyed by session — no database. It's a 6-hour demo.

---

## 3. Task Assignments

### KTH — integrations & backend
| # | Task | Notes |
|---|------|-------|
| K1 | Repo scaffold: Next.js app, env wiring, `/api/voice-token` route | First 45 min |
| K2 | Sabre auth + flight search route (test env, hackathon-2026 collection) | Highest risk — start early |
| K3 | Sabre hotel search route | Reuse auth from K2 |
| K4 | Wire Vocal Bridge agent tools → our API routes (search, book, pay) | AI-agent integration mode |
| K5 | PayPal sandbox: create order + capture routes, hook into booking flow | Option 1 (own dev account) |
| K6 | Outbound calling: `/api/disrupt` → Sabre alternatives → VB phone call | The wow moment — must work |
| K7 | Booking/PNR creation (or clean mock if Sabre booking APIs fight back) | Cuttable; mock is fine |

### Allison — agent design, UI, documents, demo
| # | Task | Notes |
|---|------|-------|
| A1 | **Account setup for the whole team** (do this first, some credits are time-gated): Sabre developer hub (use event-registration email!), Vocal Bridge signup + `VBHACKMONTH` promo on Developer Plan, LandingAI account at ade.landing.ai (before 7/16 for the +10k credits), PayPal developer dashboard + sandbox buyer/merchant accounts | ~45 min, unblocks everything |
| A2 | Create the Vocal Bridge agent **via UI**: name, personality, greeting, system prompt ("TripGuardian, a warm efficient travel concierge…"). Test it in the VB Test tab | No code needed to start |
| A3 | LandingAI: test passport/ID/itinerary samples in the **Visual Playground**, settle on the extraction schema (name, passport no., DOB, expiry), hand the working config to KTH for A/K integration | Playground first, API second |
| A4 | Frontend UI: trip summary card (flight + hotel + price), document upload widget, "Pay with PayPal" button, big red **"Simulate Delay"** demo button | Simple + clean beats fancy |
| A5 | Demo script + 3-min pitch: story of one traveler ("Sam books a trip… then AA 1234 is delayed…"), who says what, backup screenshots/recording in case wifi dies | Start by 2:00 PM |
| A6 | End-to-end testing as the "user": talk to the agent, break it, log the failure phrases so KTH/prompt can be fixed | Ongoing after 1 PM |

---

## 4. Timeline (hacking 10:00 → 4:00)

| Time | KTH | Allison |
|------|-----|---------|
| 10:00–10:45 | K1 scaffold + voice-token route | A1 all account setups + credits |
| 10:45–12:00 | K2 Sabre auth + flight search | A2 VB agent created & talking in Test tab |
| 12:00–1:00 | K4 wire agent tools to flight search — **first end-to-end voice search** 🎯 | A3 LandingAI playground + schema |
| 1:00–2:00 | K3 hotels + K5 PayPal routes | A4 UI: trip card, upload, pay button |
| 2:00–3:00 | K6 outbound disruption call | A5 demo script + pitch; A6 testing |
| 3:00–3:30 | K7 booking polish **or cut**; bug fixes from A6 | Rehearse full demo twice |
| 3:30–4:00 | Freeze code. Rehearse once more. Backup recording. | Same |

**Milestone checkpoints:** 12:30 — voice flight search works end-to-end (if not, drop hotels, focus flights). 2:30 — outbound call works (if not, demo disruption on the web voice agent instead and say "phone call" in the pitch as roadmap).

---

## 5. Demo Script (3 minutes)

1. *(30s)* Setup: "Booking a trip means five apps and two phone trees. "???" is one conversation."
2. *(60s)* Allison talks to the web agent: books SFO→DFW on AA + a Dallas hotel. Uploads passport photo — fields auto-fill (LandingAI). Pays with PayPal sandbox — confirmation on screen.
3. *(60s)* KTH hits "Simulate Delay." **Allison's phone rings on stage.** The agent explains the delay, offers Sabre alternatives, she rebooks by voice.
4. *(30s)* Close: "Every agent can act. Ours speaks — and it calls you before you even know something's wrong." Mention the stack: Sabre, Vocal Bridge, LandingAI, PayPal.

---

## 6. Risks & Fallbacks

| Risk | Fallback |
|------|----------|
| Sabre test env flaky / auth trouble | Cache one good search response as fixture; agent reads from fixture |
| Outbound calling not working by 2:30 | Disruption handled in web voice session; pitch phone call as next step |
| PNR/booking API too complex for 6h | Mock confirmation number after real search + real payment |
| Wifi dies during demo | Backup screen recording made at 3:30 (A5) |
| Voice agent mishears in noisy room | Rehearse exact phrases; keep utterances short; external mic if available |

---

## 7. Pre-Hackathon Checklist (do BEFORE event day)

- [ ] Both: register accounts with the **same email used for event registration** (Sabre free access + LandingAI bonus credits depend on it)
- [ ] Allison: claim `VBHACKMONTH` on Vocal Bridge Developer Plan; set calendar reminder to cancel auto-renew
- [ ] Allison: LandingAI account before **7/16** (10,000 bonus credits)
- [ ] KTH: skim Sabre hackathon-2026 product collection + VB developer guide (vocalbridgeai.com/app/developer-guide)
- [ ] KTH: confirm PayPal sandbox order create/capture works with a curl test
- [ ] Gather sample passport/ID images (use spec/sample docs, not real passports)
- [ ] Verify Allison's phone can receive the VB outbound test call
