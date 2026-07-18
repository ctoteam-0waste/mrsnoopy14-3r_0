const { wrapEmail } = require('./layout');

// One function per template, mirroring communication_template_mail.md 1:1.
// Only events that doc marks with an **Email** section are included — the
// rest (AGENT_REACHED, BOOKING_IN_POOL, NEW_BOOKING_AVAILABLE, BOOKING_TAKEN,
// STREAK_UPDATED, NEW_RATING_RECEIVED per-event) stay push/in-app only.

const templates = {
  WELCOME: ({ name }) => ({
    subject: `Welcome to KarmaCoins XP, ${name}!`,
    html: wrapEmail({
      preheader: 'Your account is ready — start earning Karma Coins today.',
      bodyHtml: `<p>Hi ${name}, welcome aboard!</p>
        <p>Start scheduling pickups, earn Karma Coins for every recyclable item, and play the daily
        quiz to grow your streak. Let's make waste management rewarding.</p>`,
      ctaLabel: 'Get started',
      ctaUrl: 'https://karmaverse.earth/',
    }),
  }),

  OTP: ({ otp }) => ({
    subject: 'Your KarmaCoins XP verification code',
    html: wrapEmail({
      preheader: `Your verification code is ${otp}`,
      bodyHtml: `<p>Your OTP is:</p>
        <p style="font-size:28px;font-weight:800;letter-spacing:4px;color:#052e16;margin:16px 0;">${otp}</p>
        <p>It is valid for 10 minutes. Do not share this code with anyone.</p>`,
    }),
  }),

  PASSWORD_RESET_CONFIRM: ({ name }) => ({
    subject: 'Your password has been changed',
    html: wrapEmail({
      preheader: 'Your KarmaCoins XP password was updated.',
      bodyHtml: `<p>Hi ${name}, your KarmaCoins XP password was successfully updated.</p>
        <p>If you didn't make this change, please contact support immediately.</p>`,
    }),
  }),

  BOOKING_PLACED: ({ name, bookingId, date, timeSlot, address }) => ({
    subject: `Pickup request received — #${bookingId}`,
    html: wrapEmail({
      preheader: `Your pickup for ${date}, ${timeSlot} has been received.`,
      bodyHtml: `<p>Hi ${name}, we've received your pickup request for <strong>${date}, ${timeSlot}</strong>
        at ${address}.</p>
        <p>We'll notify you once an agent is assigned.</p>`,
    }),
  }),

  BOOKING_ACCEPTED: ({ name, agentName, bookingId, eta }) => ({
    subject: 'An agent is on the way!',
    html: wrapEmail({
      preheader: `${agentName} has been assigned to your pickup.`,
      bodyHtml: `<p>Hi ${name}, <strong>${agentName}</strong> has been assigned to your pickup
        #${bookingId}.</p>
        <p>They'll reach your location around ${eta}.</p>`,
    }),
  }),

  BOOKING_PICKED_UP: ({ name, coins, walletBalance }) => ({
    subject: `You earned ${coins} Karma Coins!`,
    html: wrapEmail({
      preheader: `${coins} Karma Coins credited to your wallet.`,
      bodyHtml: `<p>Hi ${name}, your items have been verified and <strong>${coins} Karma Coins</strong>
        have been credited to your wallet.</p>
        <p>Total balance: <strong>${walletBalance}</strong>.</p>`,
    }),
  }),

  BOOKING_COMPLETED: ({ name, bookingId }) => ({
    subject: `Pickup #${bookingId} completed — thank you!`,
    html: wrapEmail({
      preheader: 'Thanks for recycling with KarmaCoins XP.',
      bodyHtml: `<p>Hi ${name}, your pickup is complete. Thanks for recycling with KarmaCoins XP.</p>
        <p>Don't forget to rate your agent!</p>`,
    }),
  }),

  BOOKING_CANCELLED: ({ name, bookingId, date }) => ({
    subject: `Your pickup #${bookingId} was cancelled`,
    html: wrapEmail({
      preheader: `Your pickup scheduled for ${date} has been cancelled.`,
      bodyHtml: `<p>Hi ${name}, your pickup scheduled for ${date} has been cancelled.</p>
        <p>You can schedule a new pickup anytime from the app.</p>`,
      ctaLabel: 'Schedule a new pickup',
      ctaUrl: 'https://karmaverse.earth/',
    }),
  }),

  QUIZ_STREAK_REMINDER: ({ name, streak }) => ({
    subject: `Don't lose your ${streak}-day quiz streak!`,
    html: wrapEmail({
      preheader: `Play today's quiz before it resets.`,
      bodyHtml: `<p>Hi ${name}, you haven't played today's KarmaCoins quiz yet.</p>
        <p>Play now before it resets at 5:30 AM IST.</p>`,
      ctaLabel: 'Play today’s quiz',
      ctaUrl: 'https://karmaverse.earth/',
    }),
  }),

  REFERRAL_REWARD: ({ name, friendName, coins }) => ({
    subject: `You earned ${coins} Karma Coins for referring ${friendName}!`,
    html: wrapEmail({
      preheader: `${friendName} joined using your referral code.`,
      bodyHtml: `<p>Hi ${name}, your friend <strong>${friendName}</strong> just joined KarmaCoins XP
        using your referral code.</p>
        <p><strong>${coins} Karma Coins</strong> have been added to your wallet.</p>`,
    }),
  }),

  // Agent app
  AGENT_WELCOME: ({ name }) => ({
    subject: `Welcome to the KarmaCoins XP Agent team, ${name}!`,
    html: wrapEmail({
      preheader: 'Your agent account is active.',
      bodyHtml: `<p>Hi ${name}, your agent account is active.</p>
        <p>Go online from the dashboard to start receiving pickup requests near you.</p>`,
    }),
  }),

  AGENT_WEEKLY_SUMMARY: ({ name, totalPickups, rating, currentStreak }) => ({
    subject: `Your week on KarmaCoins XP — ${totalPickups} pickups completed`,
    html: wrapEmail({
      preheader: `${totalPickups} pickups, ${rating} avg rating this week.`,
      bodyHtml: `<p>Hi ${name}, here's your weekly summary:</p>
        <ul style="padding-left:18px;margin:12px 0;">
          <li>${totalPickups} pickups completed</li>
          <li>Average rating: ${rating}</li>
          <li>Current streak: ${currentStreak} days</li>
        </ul>
        <p>Keep up the great work!</p>`,
    }),
  }),
};

module.exports = { templates };
