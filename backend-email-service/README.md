# KarmaVerse email service (reference implementation)

Drop this into the `api.karmaverse.earth` backend repo once you have access to it.
This client repo (`KarmaCredits-RN`) has no backend of its own — bookings are
created via `POST /api/v1/bookings` on that external service, and the same
service emits the `socket.io` events the app listens for
(`BOOKING_ACCEPTED`, `BOOKING_PICKED_UP`, `BOOKING_COMPLETED`, cancellation).
Email sends need to be triggered from those same spots.

## This version: Gmail/Workspace SMTP, no third-party email service

This sends through your existing `ceo@0waste.co.in` Google Workspace account via
Nodemailer + SMTP — no SendGrid/Resend/etc. signup. Tradeoffs to know going in:

- **Sending limit**: Google Workspace caps outbound mail at roughly 2,000/day
  (regular Gmail: ~500/day). Fine for booking-volume transactional email at
  current scale; revisit if you start real marketing-blast volume.
- **Deliverability**: generally good *because* it's a real Google-hosted mailbox
  with existing reputation — you skip the SPF/DKIM domain-verification step a
  new SendGrid sender would need. This is actually the main advantage of this
  approach over a fresh transactional-provider account.
- **Google's automation policy**: Workspace accounts sending programmatically
  (not a human clicking send) can get flagged if volume spikes suddenly or if
  Google's abuse detection mistakes it for compromised-account behavior. Keep
  volume steady, avoid identical-content blasts to many recipients at once, and
  watch the mailbox for any Google security alerts after go-live.

### Setup — App Password

Google Workspace SMTP requires an **App Password** (a 16-character token, not
your normal login password), which requires 2-Step Verification to be enabled
on the account first.

1. Turn on 2-Step Verification: [myaccount.google.com/security](https://myaccount.google.com/security)
   → "2-Step Verification" → follow the prompts (needs a phone number).
2. Generate an App Password: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   → name it "KarmaVerse backend" → copy the 16-character password shown once.
   - If that page says App Passwords are unavailable, your Workspace **admin**
     has to enable them: admin.google.com → Security → Authentication → 2-step
     verification → allow App Passwords for the org (or for this account).
3. `npm install nodemailer` in the backend repo, copy `emailService.js` and
   `templates/` into it.
4. Copy `.env.example` → `.env`. Set `GMAIL_USER=ceo@0waste.co.in` and
   `GMAIL_APP_PASSWORD` to the 16-character password from step 2 (remove the
   spaces Google displays it with).

If you outgrow the 2,000/day limit or want the API-based analytics/bounce
tracking a real transactional provider gives you, the earlier SendGrid version
of `emailService.js` is a drop-in swap — `templates.js` doesn't change either
way, only `emailService.js` and the env vars.

## Usage

```js
const { sendTemplatedEmail } = require('./emailService');

await sendTemplatedEmail(user.email, 'BOOKING_ACCEPTED', {
  name: user.name,
  agentName: agent.name,
  bookingId: booking.id,
  eta: '15 mins',
});
```

Always wrap sends in try/catch and **log, don't throw** — a failed email should
never fail the booking request itself:

```js
try {
  await sendTemplatedEmail(user.email, 'BOOKING_PLACED', { ... });
} catch (err) {
  logger.error('email send failed', err);
}
```

## Maximizing inbox placement (not spam)

No sender — Gmail SMTP, SendGrid, or otherwise — can guarantee 100% inbox
placement. These are the concrete things that actually move it:

- **Every send is multipart (HTML + plain text)**, handled automatically by
  `emailService.js` — this alone measurably helps with Gmail's filter versus
  HTML-only mail.
- **Warm up before real users see it**: during Phase 3/5 testing, open each
  test email and reply to at least one — this teaches Gmail's reputation
  system the sender is legitimate, before volume ramps up.
- **Roll out gradually** (one template at a time, per the implementation
  plan) rather than turning on all 12 at full volume on day one.
- **Monitor for real once live**: [Google Postmaster
  Tools](https://postmaster.google.com) (free) shows actual spam-rate and
  reputation data for a sending domain/account once volume is high enough to
  register — check it a week or two after go-live, it's the only source of
  truth better than guessing from anecdotal reports.

## Where to wire each template in

Based on this client repo's `src/services/booking.ts` and
`src/context/UserSocketContext.tsx`, the matching server-side trigger points are:

| Template | Backend trigger point |
|---|---|
| `WELCOME` | signup handler (email/password or Google sign-in) |
| `OTP` | forgot-password OTP-generation endpoint |
| `PASSWORD_RESET_CONFIRM` | password-reset-confirm endpoint |
| `BOOKING_PLACED` | `POST /api/v1/bookings` handler, right after insert |
| `BOOKING_ACCEPTED` | wherever the server does `io.to(userId).emit('BOOKING_ACCEPTED', ...)` |
| `BOOKING_PICKED_UP` | wherever it emits `BOOKING_PICKED_UP` (coins credited) |
| `BOOKING_COMPLETED` | wherever it emits `BOOKING_COMPLETED` |
| `BOOKING_CANCELLED` | `PATCH /api/v1/bookings/:id/cancel` handler |
| `QUIZ_STREAK_REMINDER` | optional daily cron for users who haven't played yet |
| `REFERRAL_REWARD` | wherever a referral signup credits the referrer |
| `AGENT_WELCOME` | agent account activation |
| `AGENT_WEEKLY_SUMMARY` | weekly cron job aggregating each agent's stats |

Add the `sendTemplatedEmail(...)` call directly next to each existing
`io.to(...).emit(...)` call (same event, same data you're already computing —
just also email it).

## Not included here (by design)

- **Rate reminder**, **agent reached**, **booking in pool**, **new booking
  available**, **booking taken**, **streak updated**, **per-rating** — the
  content doc marks these push/in-app-notification only, no email needed.
- Unsubscribe/preference management — these are transactional (tied to a
  booking/account action), not bulk marketing, so CAN-SPAM's unsubscribe
  requirement doesn't strictly apply. If you start sending non-transactional
  marketing (promos, newsletters) later, add a preference-center link and an
  unsubscribe list check before sending.
