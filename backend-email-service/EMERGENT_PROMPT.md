# Emergent prompt — redesign KarmaVer$e transactional emails

Paste everything below the line into Emergent.

---

You are redesigning the transactional email templates for **KarmaVer$e**, a sustainability-rewards
platform by **3R ZeroWaste** (India). I need production-ready, email-client-safe HTML. Follow the hard
constraints exactly — the emails plug into an existing backend and must not break it.

## What you must NOT change (hard contract)
- The sending function stays `sendTemplatedEmail(to, templateKey, data)` (Node.js + Nodemailer/Gmail
  SMTP, multipart HTML+text). You only produce the HTML/subjects; you do not change how mail is sent.
- Keep these exact **template keys** and each key's **exact variable set** — do not invent variables:
  - `WELCOME` → `{ name }`
  - `OTP` → `{ otp }`
  - `PASSWORD_RESET_CONFIRM` → `{ name }`
  - `BOOKING_PLACED` → `{ name, bookingId, date, timeSlot, address }`
  - `BOOKING_ACCEPTED` → `{ name, agentName, bookingId, eta }`
  - `BOOKING_PICKED_UP` → `{ name, coins, walletBalance }`
  - `BOOKING_COMPLETED` → `{ name, bookingId }`
  - `BOOKING_CANCELLED` → `{ name, bookingId, date }`
  - `QUIZ_STREAK_REMINDER` → `{ name, streak }`
  - `REFERRAL_REWARD` → `{ name, friendName, coins }`
  - `AGENT_WELCOME` → `{ name }`
  - `AGENT_WEEKLY_SUMMARY` → `{ name, totalPickups, rating, currentStreak }`
- Each template returns `{ subject, html }`.

## Brand
- Product wordmark: **KarmaVer$e** (the "$" is intentional). In-app currency: **KarmaCoins XP** (use
  this exact spelling everywhere — never "Karma Coins" or "KC"). Company: **3R ZeroWaste**.
- Contact: `info@0waste.co.in`, `+91 70931 98828`, Plot 62, Sector 8, IMT Manesar, Gurugram, Haryana
  122051. Website `https://0waste.co.in/`.
- Tagline you may use sparingly: "Kar Bhala Toh Ho Bhala."
- Palette: deep green `#052e16`, green `#15803d`, mint CTA `#4ade80` (button text `#052e16`), page bg
  `#f1f5f9`, card `#ffffff`, muted text `#64748b`, dark text `#0f172a`.
- Voice: warm, sustainability/rewards-focused, sentence case, minimal emojis. Avoid "waste management"
  framing.

## Assets / URLs
- Frontend (all CTAs): `https://karmaverse.earth/`. Deep links that work: `/OrderTracking`, `/Wallet`,
  `/Referral`, `/Quiz`, `/SchedulePickup`.
- Logo: reference an absolute HTTPS image at `https://karmaverse.earth/email-logo.png` (we will place
  this file). It is a white/transparent wordmark meant for dark backgrounds — put it on the dark green
  header. Provide a text fallback (`alt="KarmaVer$e"`).
- Social (footer icons): instagram.com/mykarmaverse, x.com/mykarmaverse,
  facebook.com/share/p/17GYy6Qyam, linkedin.com/showcase/136793967,
  youtube.com/channel/UCJjzqmfLvyFhGRwfjSGE4bw.

## Technical requirements (email-client safe)
- **Table-based, single column, ~600px max width**, centered; fluid `width:100%`.
- **100% inline CSS.** No external stylesheets. One optional `<style>` in `<head>` only for
  `@media` + dark-mode, but every critical style must also be inline (Gmail strips `<head>`).
- **Absolute HTTPS image URLs only.** Every `<img>` needs `alt`, explicit `width`, and
  `style="display:block"`.
- **Hidden preheader** span at the top of each email.
- **Outlook (Word engine):** add MSO/VML fallback for rounded buttons and use `role="presentation"`
  tables; assume `border-radius` may not render.
- **Dark mode:** add `<meta name="color-scheme">` + `<meta name="supported-color-schemes">` and a
  `@media (prefers-color-scheme: dark)` block; keep it legible if a client force-inverts.
- **Mobile:** single column already fluid; buttons full-width on small screens.
- Keep total HTML lean (avoid Gmail's ~102KB clipping).

## Reusable components to build (partials, not duplicated markup)
`Header` (logo on dark green), `Footer` (contact + address + social + legal + unsubscribe slot),
`Button` (mint CTA with Outlook VML fallback), `Greeting` (`Hi {ProperCaseName},`), `PickupDetails`
(labelled rows: booking id, date, time slot, address), `StatusBadge`, `Timeline` (placed → assigned →
picked up → completed, current step highlighted), `RewardsCard` (coins + wallet balance). Compose each
email from these.

## Data-safety rules (must implement in the template layer)
- **Proper-Case the name** at render (`shashi shekhar` → `Shashi Shekhar`). Fallback to `there` if empty.
- **Never expose the raw Mongo id.** Render booking id as `KC-` + last 5 chars of `bookingId`,
  uppercased (e.g. `KC-DE281`). Keep the raw value only for internal references, never shown.
- **Every variable needs a fallback** so a missing field never prints `undefined` (e.g. `eta` →
  "shortly", `walletBalance` → the coins figure, `agentName` → "your pickup partner").

## Per-email intent (design accordingly; keep the listed subject meaning, you may refine wording but keep "KarmaCoins XP"):
- `WELCOME` — warm onboarding, CTA "Get started" → `/`. 
- `OTP` — big, spaced 6-digit code; "valid 10 minutes; do not share". No CTA.
- `PASSWORD_RESET_CONFIRM` — confirmation + "contact support if this wasn't you".
- `BOOKING_PLACED` — PickupDetails card (KC-id, date, timeSlot, address) + Timeline (step 1). CTA
  "Track pickup" → `/OrderTracking`.
- `BOOKING_ACCEPTED` — agentName assigned, eta, Timeline (step 2). CTA "Track pickup".
- `BOOKING_PICKED_UP` — RewardsCard: `coins` credited, `walletBalance` total, Timeline (step 3). CTA
  "View wallet" → `/Wallet`.
- `BOOKING_COMPLETED` — thank-you, Timeline (step 4/done), gentle "rate your agent".
- `BOOKING_CANCELLED` — cancellation note (KC-id, date), CTA "Schedule a new pickup" → `/SchedulePickup`.
- `QUIZ_STREAK_REMINDER` — streak count, urgency (resets 5:30 AM IST), CTA "Play today's quiz" → `/Quiz`.
- `REFERRAL_REWARD` — friendName joined, coins earned, CTA "Invite more friends" → `/Referral`.
- `AGENT_WELCOME` — agent onboarding, CTA "Open dashboard".
- `AGENT_WEEKLY_SUMMARY` — stat tiles: totalPickups, rating, currentStreak.

## Deliverables
1. A shared layout/partials file and one function per template key, each returning `{ subject, html }`,
   drop-in compatible with the existing `templates.js`/`layout.js` structure (CommonJS, `wrapEmail`
   pattern is fine to keep or improve — but the exported `templates` object keyed by the names above
   must remain).
2. All 12 templates rendered with realistic sample data for preview.
3. Notes on anything that needs a value we don't yet pass (so we can decide backend changes) — but do
   NOT depend on new variables in the default render; degrade gracefully.

Produce clean, tested, Gmail/Outlook/Apple-Mail-safe HTML.
