# Email implementation — full flow & obstacles

Reference plan for rolling out transactional email (Gmail/Workspace SMTP,
no third-party service) across `ceo@0waste.co.in` → booking/account emails.

## Flow

### Phase 1 — Account prep (owner of ceo@0waste.co.in — 15 min, no dev needed)
1. Enable 2-Step Verification on the account.
2. Generate an App Password at `myaccount.google.com/apppasswords`.
3. Hand the 16-character password to whoever sets up the backend env vars
   (treat it like a secret — don't paste it in Slack/email in plaintext,
   use whatever secrets manager the backend already uses for its other env vars).

**Blocks everything downstream if skipped** — nothing else can be tested without this.

### Phase 2 — Backend integration (backend dev — half a day)
1. `npm install nodemailer`, copy `emailService.js` + `templates/` into the
   `api.karmaverse.earth` repo.
2. Add `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM_NAME` to the backend's
   env config (and to Render's environment variables if that's where it's
   deployed, not just a local `.env`).
3. Smoke test in isolation before touching any real routes:
   ```js
   const { sendTemplatedEmail } = require('./emailService');
   sendTemplatedEmail('your-own-email@gmail.com', 'WELCOME', { name: 'Test' })
     .then(() => console.log('sent'))
     .catch(console.error);
   ```
   Run this standalone first — confirms SMTP auth works before it's wired into
   real request paths where a failure is harder to see.

### Phase 3 — Wire trigger points one at a time (backend dev — ~2-3 days)
Don't wire all 12 templates in one PR. Go in this order — cheapest to verify
first, builds confidence before the harder ones:

1. `WELCOME` (signup handler) — easiest, one trigger, immediate feedback.
2. `OTP` (forgot-password) — also simple, high-value to get right (time-sensitive).
3. `BOOKING_PLACED` (`POST /api/v1/bookings`) — first one touching the booking flow.
4. `BOOKING_ACCEPTED`, `BOOKING_PICKED_UP`, `BOOKING_COMPLETED` — next to each
   existing `io.emit(...)` call for those events.
5. `BOOKING_CANCELLED`, `PASSWORD_RESET_CONFIRM`, `REFERRAL_REWARD`,
   `AGENT_WELCOME` — same pattern, lower traffic so lower risk.
6. `QUIZ_STREAK_REMINDER` and `AGENT_WEEKLY_SUMMARY` last — these need new
   cron jobs, not just an inline call at an existing trigger (see Phase 4).

After each one: trigger it for real (sign up a test account, place a test
booking, etc.) and confirm the email actually arrives — don't batch-verify
at the end.

### Phase 4 — New cron jobs (backend dev — half a day)
`QUIZ_STREAK_REMINDER` and `AGENT_WEEKLY_SUMMARY` don't have an existing
trigger point to hook into — they need scheduled jobs that don't exist yet.
- `node-cron` (in-process) if the backend runs as a single long-lived
  process. If it's on Render, check whether a **Render Cron Job** (separate
  service type) fits better than an in-process timer, since in-process cron
  disappears on redeploys/restarts and can double-fire across multiple
  instances if the backend ever scales horizontally.
- Query: users who haven't played today's quiz (daily), agents' weekly stats
  (weekly) — both need a DB query written that doesn't exist yet.

### Phase 5 — Staging verification (both — half a day)
Run the full user journey once, end to end, watching the inbox: sign up →
place booking → (simulate) agent accepted → picked up → completed → cancel a
second booking. Confirms the whole chain works together, not just each piece
in isolation.

### Phase 6 — Production rollout (backend dev — ongoing)
Ship behind a feature check if possible (e.g. an env flag) so it can be
disabled instantly without a redeploy if something goes wrong at real volume.

---

## Obstacles likely to come up

**Google Workspace admin blocks App Passwords org-wide.**
Some Workspace orgs disable App Passwords by default for security. If step 2
of Phase 1 says "not available," the Workspace admin has to enable it under
Admin Console → Security → Authentication → App Passwords. Find out who the
Workspace admin is *before* starting, not when blocked.

**Google flags the account for automated sending.**
Workspace mailboxes aren't built for programmatic/API sending — a sudden
volume spike or very repetitive content can trigger Google's abuse detection
(security alert, temporary sending block, or a "was this you?" prompt).
Mitigation: ramp up gradually rather than turning on all 12 triggers at full
production volume on day one (Phase 3's one-at-a-time ordering helps with
this), and check the account's Google security notifications after each new
trigger goes live.

**The 2,000/day ceiling gets hit.**
Not urgent now, but revisit once booking volume grows — plan is a same-shaped
swap to SendGrid (`templates.js` is provider-agnostic, only `emailService.js`
+ env vars change).

**Email send blocks or slows the booking API response.**
If `sendTemplatedEmail(...)` is `await`-ed directly in the request handler,
a slow/failed SMTP call adds latency to the user-facing API call, or an
uncaught error breaks the booking response entirely. Always fire-and-forget
or wrap in try/catch that only logs (shown in the README) — the booking must
succeed even if the email doesn't send.

**Missing data at the trigger point.**
Some events fire before all template placeholders are actually available —
e.g. `BOOKING_ACCEPTED` needs `agentName` and `eta`; if the assignment logic
computes those slightly after the socket emit, the email call needs the same
data, not assumed-available data. Needs a quick check per trigger that every
placeholder the template expects is actually populated at that exact point
in the code, not just "close enough."

**No retry on transient failures.**
A dropped connection mid-send currently just fails silently (logged, not
retried). Acceptable for launch; worth a simple retry-once wrapper if bounce
reports show real loss later.

**Content changes require a backend deploy.**
Templates live in code (`templates.js`), not a CMS — any copy tweak (marketing
wants different wording) means a PR + deploy, not a quick edit. Fine at
current scale; flag it if marketing ends up iterating on copy frequently.

**Deliverability to non-Gmail inboxes.**
Gmail-to-Gmail generally lands fine. Gmail-to-Outlook/Yahoo/corporate mail
servers can still occasionally spam-fold, especially early on before the
sending pattern looks "established." Watch spam-complaint/bounce signals if
you can see them (Workspace admin console has some visibility); if non-Gmail
deliverability becomes a real problem, that's the strongest signal to migrate
to SendGrid rather than staying on Workspace SMTP.
