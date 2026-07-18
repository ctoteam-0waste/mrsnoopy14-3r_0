# Email notifications — developer handoff

You're reading this because KarmaVerse wants transactional emails (booking
confirmed, agent assigned, coins credited, etc.) sent from the backend at
`api.karmaverse.earth`. Everything you need is in this folder. This doc is the
single thing to read start to finish — the other files (`README.md`,
`IMPLEMENTATION_PLAN.md`) are supporting reference, not required reading.

## 0. Context you need

- The email **content** (subject/body for all 12 templates) is finalized —
  it's in `templates/templates.js`, already written, don't second-guess the
  copy without checking with the team first.
- **Sending method**: Nodemailer through the company's Gmail/Workspace account
  (`ceo@0waste.co.in`), not a third-party service like SendGrid — that was a
  deliberate choice to avoid a new vendor signup. `emailService.js` already
  implements this.
- **You'll be given an App Password** (a 16-character Google-generated code,
  separate from the account's login password) — ask for it if you don't have
  it yet. Don't try to use the normal account password; SMTP auth requires
  the App Password specifically.
- This client app (`KarmaCredits-RN`) has **no backend of its own** — it's a
  pure REST client. Booking creation is `POST /api/v1/bookings` and status
  changes come through `socket.io` events (`BOOKING_ACCEPTED`,
  `BOOKING_PICKED_UP`, `BOOKING_COMPLETED`, etc.) — both live in your backend
  codebase, not here. That's where every integration point below lives.

## 1. Install

```bash
npm install nodemailer
```

Copy `emailService.js` and the `templates/` folder into your backend repo
(anywhere that's easy to `require()` from your route handlers — e.g.
`src/services/email/`).

Add to your env config (`.env` locally, and whatever secrets mechanism you use
in production — Render env vars, etc.):

```
GMAIL_USER=ceo@0waste.co.in
GMAIL_APP_PASSWORD=<the 16-character code you were given>
EMAIL_FROM_NAME=KarmaVerse
```

## 2. Verify the connection before touching real routes

Run this standalone (a scratch script, a REPL, whatever's fastest) and
confirm an email actually arrives at an inbox you control:

```js
const { sendTemplatedEmail } = require('./emailService');

sendTemplatedEmail('your-own-email@gmail.com', 'WELCOME', { name: 'Test' })
  .then(() => console.log('sent'))
  .catch(console.error);
```

If this fails with an auth error, the App Password is wrong or 2-Step
Verification isn't actually enabled on the Gmail account — don't proceed
until this works.

## 3. The API

```js
const { sendTemplatedEmail } = require('./emailService');

await sendTemplatedEmail(toEmailAddress, TEMPLATE_KEY, data);
```

`data` is a plain object with exactly the placeholders that template needs —
see the signature of each function in `templates/templates.js` for the exact
field names. Passing an object missing a field just renders `undefined` in
that spot in the email — no validation happens for you, so double check the
fields match before wiring each one in.

**Golden rule**: never let an email failure break the user-facing request.
Always:

```js
sendTemplatedEmail(user.email, 'BOOKING_PLACED', { ... }).catch((err) =>
  logger.error('email send failed', { template: 'BOOKING_PLACED', err })
);
```

Note: **not** `await`ed, and the `.catch` only logs — the booking response
goes back to the app immediately either way, independent of whether the email
succeeds. Do this for every single call site below, no exceptions.

## 4. Integration points, in the order to implement them

Go in this order — each one is a superset risk of the last, and testing
catches problems early instead of after all 12 are wired in at once.

### 4.1 `WELCOME` — signup handler

Wherever the account gets created (likely near where you hash the password /
insert the user row), after the user is successfully created:

```js
// POST /api/v1/auth/register handler, after user creation succeeds
const user = await User.create({ name, email, phone, passwordHash });

sendTemplatedEmail(user.email, 'WELCOME', { name: user.name }).catch((err) =>
  logger.error('email send failed', { template: 'WELCOME', err })
);

return res.status(201).json({ user, token });
```

### 4.2 `OTP` — forgot-password flow

Wherever the OTP is generated and currently gets sent (SMS? push?) — add the
email alongside it:

```js
const otp = generateOtp();
await Otp.create({ userId: user.id, code: otp, expiresAt: ... });

sendTemplatedEmail(user.email, 'OTP', { otp }).catch((err) =>
  logger.error('email send failed', { template: 'OTP', err })
);
```

### 4.3 `BOOKING_PLACED` — `POST /api/v1/bookings`

Right after the booking row is inserted:

```js
const booking = await Booking.create({ userId, address, date, timeSlot, ... });

sendTemplatedEmail(user.email, 'BOOKING_PLACED', {
  name: user.name,
  bookingId: booking.id,
  date: booking.date,
  timeSlot: booking.timeSlot,
  address: booking.address,
}).catch((err) => logger.error('email send failed', { template: 'BOOKING_PLACED', err }));

return res.status(201).json({ booking });
```

### 4.4 `BOOKING_ACCEPTED`, `BOOKING_PICKED_UP`, `BOOKING_COMPLETED`

These three follow the identical pattern — find wherever your code currently
does `io.to(userId).emit('BOOKING_ACCEPTED', payload)` (and the equivalent for
the other two events) and add the email call right next to it, using the same
data you're already assembling for the socket payload:

```js
// wherever BOOKING_ACCEPTED currently gets emitted
io.to(userId).emit('BOOKING_ACCEPTED', { agentName, eta, bookingId });

sendTemplatedEmail(user.email, 'BOOKING_ACCEPTED', {
  name: user.name,
  agentName,
  bookingId,
  eta,
}).catch((err) => logger.error('email send failed', { template: 'BOOKING_ACCEPTED', err }));
```

```js
// wherever BOOKING_PICKED_UP currently gets emitted (coins credited)
io.to(userId).emit('BOOKING_PICKED_UP', { coins, walletBalance });

sendTemplatedEmail(user.email, 'BOOKING_PICKED_UP', {
  name: user.name,
  coins,
  walletBalance,
}).catch((err) => logger.error('email send failed', { template: 'BOOKING_PICKED_UP', err }));
```

```js
// wherever BOOKING_COMPLETED currently gets emitted
io.to(userId).emit('BOOKING_COMPLETED', { bookingId });

sendTemplatedEmail(user.email, 'BOOKING_COMPLETED', {
  name: user.name,
  bookingId,
}).catch((err) => logger.error('email send failed', { template: 'BOOKING_COMPLETED', err }));
```

### 4.5 `BOOKING_CANCELLED` — `PATCH /api/v1/bookings/:id/cancel`

```js
booking.status = 'cancelled';
await booking.save();

sendTemplatedEmail(user.email, 'BOOKING_CANCELLED', {
  name: user.name,
  bookingId: booking.id,
  date: booking.date,
}).catch((err) => logger.error('email send failed', { template: 'BOOKING_CANCELLED', err }));
```

### 4.6 `PASSWORD_RESET_CONFIRM`, `REFERRAL_REWARD`, `AGENT_WELCOME`

Same pattern — find the handler where the underlying action already
completes (password successfully changed, referral bonus already credited to
the wallet, agent account already activated) and add the matching call. Field
names are in `templates/templates.js` — `PASSWORD_RESET_CONFIRM` needs
`{ name }`, `REFERRAL_REWARD` needs `{ name, friendName, coins }`,
`AGENT_WELCOME` needs `{ name }`.

### 4.7 `QUIZ_STREAK_REMINDER` and `AGENT_WEEKLY_SUMMARY` — new cron jobs

These two don't have an existing trigger to attach to — they need scheduled
jobs that don't exist yet:

```js
// pseudo-code — adapt to whatever scheduling you already use (node-cron,
// a Render Cron Job, etc.). Runs once daily.
async function sendQuizStreakReminders() {
  const usersWhoHaventPlayedToday = await User.findAll({ where: { ... } });
  for (const user of usersWhoHaventPlayedToday) {
    sendTemplatedEmail(user.email, 'QUIZ_STREAK_REMINDER', {
      name: user.name,
      streak: user.currentStreak,
    }).catch((err) => logger.error('email send failed', { template: 'QUIZ_STREAK_REMINDER', err }));
  }
}
```

```js
// runs once weekly, per agent
async function sendAgentWeeklySummaries() {
  const agents = await Agent.findAll();
  for (const agent of agents) {
    const stats = await computeWeeklyStats(agent.id); // you'll need to write this query
    sendTemplatedEmail(agent.email, 'AGENT_WEEKLY_SUMMARY', {
      name: agent.name,
      totalPickups: stats.totalPickups,
      rating: stats.avgRating,
      currentStreak: stats.currentStreak,
    }).catch((err) => logger.error('email send failed', { template: 'AGENT_WEEKLY_SUMMARY', err }));
  }
}
```

If you're on Render, check whether a separate **Cron Job** service type fits
better than an in-process `setInterval`/`node-cron` timer — in-process timers
reset on every redeploy and can double-fire if the backend ever runs multiple
instances.

## 5. Testing checklist

Before calling this done, for each of the 12 templates: trigger it for real
(a real signup, a real test booking taken through its full lifecycle, a real
cancel) and confirm the email actually arrives, not just that the code ran
without throwing. Specifically check:

- [ ] All placeholders render real values, not `undefined` — the biggest risk
      is a trigger firing before all the data it needs is actually available
      yet (e.g. `BOOKING_ACCEPTED` needs `agentName` — make sure agent
      assignment happens *before* this fires, not after).
- [ ] A failed/slow email doesn't delay or break the API response it's
      attached to (test by temporarily breaking the App Password and
      confirming the booking still succeeds).
- [ ] The 12 templates that should send an email do; nothing was accidentally
      added for the ones that shouldn't (agent-reached, booking-in-pool, new
      rating, etc. — those stay push/in-app-notification only per
      `communication_template_mail.md`).

## 6. Known gotchas

- **Google may flag the account** if automated sending volume spikes
  suddenly — this is why section 4 goes one template at a time instead of
  wiring all 12 in a single PR. Watch the Gmail account's security
  notifications after each new one goes live.
- **~2,000 emails/day ceiling** on Workspace SMTP. Not a concern at current
  volume; if it becomes one, `templates.js` doesn't change — only
  `emailService.js` and the env vars swap to a provider like SendGrid.
- **No retry on transient SMTP failures** currently — a dropped connection
  mid-send just gets logged, not retried. Acceptable for launch; flag it if
  you see real loss in the logs later.
