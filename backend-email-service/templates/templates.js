const { wrapEmail, detailTable, rewardsCard, shortId, safe, escapeHtml, properCase, BRAND } = require('./layout');

// One function per template. Keys and their variable sets are a FIXED contract with
// the backend — do not rename or add variables. Every value is run through a
// fallback so a missing field never renders "undefined". Booking ids are shown as
// KC-XXXXX (never the raw Mongo _id); names are Proper-Cased in the greeting.
const SITE = BRAND.site;

// Unsubscribe link for NON-TRANSACTIONAL (marketing) emails only. The backend should
// pass a per-recipient tokenised URL; falls back to a generic preferences page.
// Transactional emails (OTP, booking, password) must NOT include this — they're exempt.
const unsub = (u) => u || `${SITE}/unsubscribe`;
// Thousands separator for big numbers (4055 -> 4,055) — falls back to the raw value.
const comma = (v) => { const n = Number(String(v).replace(/[^\d.]/g, '')); return Number.isFinite(n) ? n.toLocaleString('en-US') : String(v); };
// True when a value is present and non-empty (used to conditionally render optional fields).
const has0 = (v) => v != null && String(v).trim() !== '';

const templates = {
  WELCOME: ({ name }) => ({
    subject: `Welcome to ${BRAND.namePlain} — start earning ${BRAND.currency}`,
    html: wrapEmail({
      preheader: 'Where everyday actions create measurable environmental impact.',
      heading: `Welcome to ${BRAND.name}`,
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;font-weight:700;color:${BRAND.colors.text};">Where everyday actions create measurable environmental impact.</p>
        <p style="margin:0 0 12px;">Book a verified resource recovery service, engage with sustainability initiatives, and earn <strong>${BRAND.currency}</strong> as you contribute to a more circular and resource-efficient future.</p>
        <p style="margin:0;color:${BRAND.colors.muted};font-style:italic;">Sustainability begins with action. Impact follows.</p>`,
      ctaLabel: 'Get started',
      ctaUrl: `${SITE}/`,
    }),
  }),

  OTP: ({ otp }) => ({
    subject: `Your ${BRAND.namePlain} verification code`,
    html: wrapEmail({
      preheader: `Your verification code${otp ? ` is ${escapeHtml(otp)}` : ''}`,
      heading: 'Verify your email address',
      bodyHtml: `<p style="margin:0 0 4px;">Enter this 6-digit code in the ${BRAND.name} app to verify your email and continue:</p>
        <p style="font-size:34px;font-weight:800;letter-spacing:10px;color:${BRAND.colors.deep};margin:18px 0;text-align:center;">${safe(otp, '------')}</p>
        <p style="margin:0;color:${BRAND.colors.muted};">This code is valid for 10 minutes. Never share it with anyone — our team will never ask for it.</p>`,
    }),
  }),

  PASSWORD_RESET_CONFIRM: ({ name }) => ({
    subject: `Your ${BRAND.namePlain} password was changed`,
    html: wrapEmail({
      preheader: `Your ${BRAND.namePlain} password was updated.`,
      heading: 'Password updated',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">Your ${BRAND.name} password was successfully updated.</p>
        <p style="margin:0;">If you didn't make this change, please <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.colors.green};font-weight:700;">contact support</a> immediately.</p>`,
    }),
  }),

  BOOKING_PLACED: ({ name, bookingId, date, timeSlot, address }) => ({
    subject: `Your ${BRAND.namePlain} pickup is booked — ${shortId(bookingId) || 'confirmed'}`,
    html: wrapEmail({
      preheader: `Your pickup for ${safe(date, 'your selected date')} has been received.`,
      heading: 'Pickup request received',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 4px;">Thanks — we've received your pickup request. Here are the details:</p>
        ${detailTable([
          ['Booking ID', shortId(bookingId) || '—'],
          ['Date', safe(date, 'To be confirmed')],
          ['Time slot', safe(timeSlot, 'To be confirmed')],
          ['Pickup address', safe(address, '—')],
        ])}
        <p style="margin:14px 0 0;">We'll notify you as soon as a pickup partner is assigned.</p>`,
      ctaLabel: 'Track pickup',
      ctaUrl: `${SITE}/OrderTracking${bookingId ? `?bookingId=${encodeURIComponent(bookingId)}` : ''}`,
    }),
  }),

  BOOKING_ACCEPTED: ({ name, agentName, bookingId }) => ({
    subject: `Your ${BRAND.namePlain} pickup partner is on the way`,
    html: wrapEmail({
      preheader: `${safe(agentName, 'Your pickup partner')} has been assigned to your pickup.`,
      heading: 'A partner is on the way',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 6px;"><strong>${safe(agentName, 'Your pickup partner')}</strong> has been assigned to your pickup${shortId(bookingId) ? ` <strong>${shortId(bookingId)}</strong>` : ''}.</p>
        <p style="margin:0;">They're on their way to your location now. Tap <strong>Track pickup</strong> below to see their live location and estimated arrival time.</p>`,
      ctaLabel: 'Track pickup',
      ctaUrl: `${SITE}/OrderTracking${bookingId ? `?bookingId=${encodeURIComponent(bookingId)}` : ''}`,
    }),
  }),

  BOOKING_PICKED_UP: ({ name, coins, walletBalance }) => ({
    subject: `You earned ${safe(coins, 'your')} ${BRAND.currency} on ${BRAND.namePlain}!`,
    html: wrapEmail({
      preheader: `${safe(coins, 'Your')} ${BRAND.currency} credited to your ${BRAND.namePlain} wallet.`,
      heading: 'Coins credited',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 2px;">Your items have been verified and your reward is in.</p>
        ${rewardsCard(safe(coins, '0'), walletBalance == null ? null : safe(walletBalance, ''))}`,
      ctaLabel: 'View wallet',
      ctaUrl: `${SITE}/Wallet`,
    }),
  }),

  BOOKING_COMPLETED: ({ name, bookingId }) => ({
    subject: `Your ${BRAND.namePlain} pickup is complete — thank you!`,
    html: wrapEmail({
      preheader: `Thanks for keeping resources in the loop with ${BRAND.namePlain}.`,
      heading: 'Pickup complete',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">Your pickup${shortId(bookingId) ? ` <strong>${shortId(bookingId)}</strong>` : ''} is complete. Thank you for keeping valuable resources in the loop with ${BRAND.name} and making a real impact.</p>
        <p style="margin:0;">Loved your experience? Don't forget to rate your pickup partner in the app.</p>`,
    }),
  }),

  BOOKING_CANCELLED: ({ name, bookingId, date }) => ({
    subject: `Your ${BRAND.namePlain} pickup was cancelled`,
    html: wrapEmail({
      preheader: `Your pickup scheduled for ${safe(date, 'your selected date')} was cancelled.`,
      heading: 'Booking cancelled',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">Your pickup${shortId(bookingId) ? ` <strong>${shortId(bookingId)}</strong>` : ''} scheduled for <strong>${safe(date, 'your selected date')}</strong> has been cancelled.</p>
        <p style="margin:0;">Changed your mind? You can schedule a new pickup anytime.</p>`,
      ctaLabel: 'Schedule a new pickup',
      ctaUrl: `${SITE}/SchedulePickup`,
    }),
  }),

  // ENGAGEMENT (scheduled nudge) — requires marketing opt-in + unsubscribe, same as
  // DAILY_QUIZ below. Sent daily to opted-in users who haven't played yet.
  QUIZ_STREAK_REMINDER: ({ name, streak, unsubscribeUrl }) => {
    const s = streak == null || String(streak).trim() === '' ? null : escapeHtml(streak);
    return {
      subject: s ? `Don't lose your ${s}-day quiz streak on ${BRAND.namePlain}!` : `Play today's quiz on ${BRAND.namePlain}`,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: "Play today's quiz before it resets.",
        heading: 'Your quiz is waiting',
        greetingName: name,
        bodyHtml: `<p style="margin:0 0 8px;">You haven't played today's ${BRAND.currency} quiz yet.</p>
          ${s ? `<p style="margin:0 0 8px;">You're on a <strong>${s}-day</strong> streak — keep it alive!</p>` : ''}
          <p style="margin:0;">Play now before it resets tonight.</p>`,
        ctaLabel: "Play today's quiz",
        ctaUrl: `${SITE}/Quiz`,
      }),
    };
  },

  REFERRAL_REWARD: ({ name, friendName, coins }) => ({
    subject: `You earned ${safe(coins, '')} ${BRAND.currency} on ${BRAND.namePlain} — referral bonus!`,
    html: wrapEmail({
      preheader: `${safe(friendName, 'A friend')} joined using your referral code.`,
      heading: 'Referral reward credited',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 2px;">Your friend <strong>${safe(friendName, 'a friend')}</strong> just joined ${BRAND.name} using your referral code.</p>
        ${rewardsCard(safe(coins, '0'), null)}
        <p style="margin:0;">Invite more friends and you both keep earning.</p>`,
      ctaLabel: 'Invite more friends',
      ctaUrl: `${SITE}/Referral`,
    }),
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // NON-TRANSACTIONAL (engagement / marketing)
  // These are NOT triggered by a single transaction — the backend sends them on a
  // schedule or to a targeted segment. They REQUIRE the user to be opted in to
  // marketing emails and must honour unsubscribe (footer "Manage preferences").
  // Send only to opted-in users, and respect a frequency cap.
  // ─────────────────────────────────────────────────────────────────────────

  // Monthly recap of the user's recycling impact. Send once a month to actives.
  // `coins` = coins earned THIS month, `coinsSpent` = coins redeemed this month,
  // `balance` = current available balance. `joinedThisMonth` flags a user who
  // registered mid/late-month so the recap reads as a partial snapshot, not a full one.
  IMPACT_REPORT: ({ name, month, kg, pickups, coins, coinsSpent, balance, xp, joinedThisMonth, unsubscribeUrl }) => {
    const num = (v) => (v != null && String(v).trim() !== '' ? Number(v) || 0 : 0);
    const has = (v) => v != null && String(v).trim() !== '';
    const hasKg = num(kg) > 0;
    const didNothing = !hasKg && num(pickups) === 0 && num(coins) === 0; // registered but inactive this month
    const newThisMonth = joinedThisMonth === true || String(joinedThisMonth) === 'true';
    return {
      subject: `Your ${safe(month, 'monthly')} impact with ${BRAND.namePlain}`,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: didNothing
          ? `Your everyday materials are waiting — turn them into ${BRAND.currency}.`
          : `See the impact you made${hasKg ? ` — ${escapeHtml(String(kg))} kg recovered` : ''} this month.`,
        heading: `Your ${safe(month, 'monthly')} impact`,
        greetingName: name,
        bodyHtml: didNothing
          ? `<p style="margin:0 0 12px;">${newThisMonth ? `Welcome to ${BRAND.name}! You joined partway through ${safe(month, 'this month')}, so there's nothing to report just yet — but your first pickup is all it takes to change that.` : `No pickups this month — but it's never too late to start. Your everyday materials can still become ${BRAND.currency} — and a healthier planet.`}</p>
             <p style="margin:0;">Book a free pickup and make next month count.</p>`
          : `<p style="margin:0 0 4px;">${newThisMonth ? `Welcome aboard! Since you joined partway through ${safe(month, 'this month')}, here's your partial snapshot so far:` : `Here's the difference your everyday green gestures made this month:`}</p>
             ${detailTable([
               ['Resources given a second life', hasKg ? `${escapeHtml(String(kg))} kg` : '—'],
               ['Green pickups completed', safe(pickups, '0')],
               [`${BRAND.currency} earned this month`, safe(coins, '0')],
               ...(has(coinsSpent) ? [[`${BRAND.currency} redeemed this month`, safe(coinsSpent, '0')]] : []),
               ...(has(balance) ? [[`Available balance`, `${escapeHtml(comma(balance))} ${BRAND.currency}`]] : []),
               ...(has(xp) ? [['XP earned', safe(xp)]] : []),
             ])}
             <p style="margin:14px 0 0;">Every kilogram keeps our shared ecosystem lighter. Keep the momentum going!</p>`,
        ctaLabel: didNothing ? 'Book a free pickup' : 'Schedule your next pickup',
        ctaUrl: `${SITE}/SchedulePickup`,
      }),
    };
  },

  // Monthly sustainability NEWSLETTER (replaces the weekly eco-tip). `articles` is an
  // array of { title, excerpt, image, url }. Only previews are included — never the
  // full article — and each card links out to the app/site. Keeps the HTML light.
  NEWSLETTER: ({ name, month, articles, unsubscribeUrl }) => {
    const list = Array.isArray(articles) ? articles.slice(0, 5) : [];
    // Each card deep-links to THAT specific article inside the app's Knowledge Hub
    // (/ArticleDetail?id=<id> — the same route the app uses); falls back to the
    // article's own url if the backend already built one, then to the hub itself.
    const linkFor = (a) => (a && a.url) || (a && a.id ? `${SITE}/ArticleDetail?id=${encodeURIComponent(String(a.id))}` : `${SITE}/KnowledgeHub`);
    const cards = list.map((a) => {
      const href = linkFor(a);
      const meta = [a && a.category, a && a.readTime].filter((x) => has0(x)).map((x) => escapeHtml(String(x))).join(' &middot; ');
      const excerpt = safe(a && (a.excerpt || a.intro), '');
      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border:1px solid ${BRAND.colors.line};border-radius:14px;overflow:hidden;">
        ${a && a.image ? `<tr><td><a href="${href}" target="_blank"><img src="${a.image}" width="536" alt="${safe(a && a.title, 'Article')}" style="display:block;width:100%;max-width:536px;height:auto;border:0;" /></a></td></tr>` : ''}
        <tr><td style="padding:16px 18px;">
          ${meta ? `<div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${BRAND.colors.green};margin:0 0 6px;">${meta}</div>` : ''}
          <h3 style="margin:0 0 6px;font-size:16px;line-height:1.3;font-weight:800;"><a href="${href}" target="_blank" style="color:${BRAND.colors.text};text-decoration:none;">${safe(a && a.title, 'Untitled')}</a></h3>
          <p style="margin:0 0 12px;font-size:13.5px;line-height:1.55;color:${BRAND.colors.body};">${excerpt}</p>
          <a href="${href}" style="font-size:13px;font-weight:800;color:${BRAND.colors.green};text-decoration:none;">Read more &rarr;</a>
        </td></tr>
      </table>`;
    }).join('');
    return {
      subject: `Your ${safe(month, 'monthly')} sustainability update from ${BRAND.namePlain}`,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: `Sustainability tips and stories from ${BRAND.namePlain}.`,
        heading: `${safe(month, 'This month')}'s sustainability update`,
        greetingName: name,
        bodyHtml: `<p style="margin:0 0 14px;">A few things worth knowing this month, straight from the ${BRAND.name} Knowledge Hub:</p>
          ${cards || `<p style="margin:0 0 12px;color:${BRAND.colors.muted};">Fresh sustainability stories are on the way — explore the Knowledge Hub in the meantime.</p>`}`,
        ctaLabel: 'Explore the Knowledge Hub',
        ctaUrl: `${SITE}/KnowledgeHub`,
      }),
    };
  },

  // Rewards / redemption email — three states driven by the recipient's data so we
  // never tell a zero-balance user to "redeem now":
  //   A) has a redeemable balance (eligible)     → "ready to redeem", CTA Redeem now
  //   B) zero balance                             → "start earning", CTA Schedule a pickup
  //   C) has balance but not yet eligible         → "almost there", CTA View rewards
  // `balance` = redeemable coins, `xp` optional, `eligible` (default true) gates C,
  // `minRedeem` optional threshold shown in state C.
  REDEMPTION_LIVE: ({ name, balance, xp, eligible, minRedeem, unsubscribeUrl }) => {
    const num = (v) => (v != null && String(v).trim() !== '' ? Number(String(v).replace(/[^\d.]/g, '')) || 0 : 0);
    const has = (v) => v != null && String(v).trim() !== '';
    const hasBalance = num(balance) > 0;
    const notEligible = eligible === false || String(eligible) === 'false';
    const state = !hasBalance ? 'earn' : (notEligible ? 'soon' : 'ready');

    const balanceCard = (labelText) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;"><tr><td align="center" style="padding:18px;">
        <div style="font-size:34px;line-height:1.1;font-weight:900;color:${BRAND.colors.green};">${escapeHtml(comma(balance))}</div>
        <div style="font-size:13px;font-weight:700;color:${BRAND.colors.muted};margin-top:2px;">${labelText}</div>
        ${has(xp) ? `<div style="font-size:13px;font-weight:700;color:${BRAND.colors.muted};margin-top:6px;">${escapeHtml(comma(xp))} XP earned</div>` : ''}
      </td></tr></table>`;

    const copy = {
      ready: {
        subject: `Your ${BRAND.currency} are ready to redeem on ${BRAND.namePlain}`,
        preheader: `Turn your ${BRAND.currency} into real rewards.`,
        heading: 'Your rewards are ready',
        body: `<p style="margin:0 0 12px;">Good news — your ${BRAND.currency} can now be redeemed for real rewards.</p>
          ${balanceCard(`${BRAND.currency} ready to redeem`)}
          <p style="margin:0;">Every gesture you've made for the ecosystem brought you here. Keep going, and keep earning.</p>`,
        ctaLabel: 'Redeem now',
        ctaUrl: `${SITE}/Wallet`,
      },
      soon: {
        subject: `Your ${BRAND.namePlain} rewards are almost ready`,
        preheader: `You're close — a little more and your ${BRAND.currency} unlock.`,
        heading: 'Almost there',
        body: `<p style="margin:0 0 12px;">You're building a great balance${has(minRedeem) ? ` — you need <strong>${escapeHtml(comma(minRedeem))} ${BRAND.currency}</strong> to start redeeming` : ''}. Keep it going and your rewards will unlock soon.</p>
          ${balanceCard(`${BRAND.currency} so far`)}
          <p style="margin:0;">A pickup, quiz, or referral gets you there faster.</p>`,
        ctaLabel: 'View rewards',
        ctaUrl: `${SITE}/Wallet`,
      },
      earn: {
        subject: `Start earning redeemable ${BRAND.currency} with ${BRAND.namePlain}`,
        preheader: `Your everyday materials can become real rewards.`,
        heading: 'Start earning rewards',
        body: `<p style="margin:0 0 12px;">You can now redeem ${BRAND.currency} for real rewards — you just need a balance to begin. Your everyday materials are the easiest way to start.</p>
          <p style="margin:0;">Book a free pickup and watch your rewards grow.</p>`,
        ctaLabel: 'Schedule a pickup',
        ctaUrl: `${SITE}/SchedulePickup`,
      },
    }[state];

    return {
      subject: copy.subject,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: copy.preheader,
        heading: copy.heading,
        greetingName: name,
        bodyHtml: copy.body,
        ctaLabel: copy.ctaLabel,
        ctaUrl: copy.ctaUrl,
      }),
    };
  },

  // Generic product/feature announcement. Flexible per campaign:
  //   `title`   — feature name (subject always carries the brand)
  //   `image`   — screenshot/hero URL (optional)
  //   `body`    — short description
  //   `benefits`— array of key user benefits (optional; rendered as a checklist)
  //   `ctaLabel`/`ctaUrl` — link straight to the feature, not the homepage
  FEATURE_ANNOUNCEMENT: ({ name, title, image, body, benefits, ctaLabel, ctaUrl, unsubscribeUrl }) => {
    const list = Array.isArray(benefits) ? benefits.filter((b) => has0(b)) : [];
    const benefitsHtml = list.length
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 14px;">${list.map((b) => `<tr><td style="padding:4px 0;font-size:14px;color:${BRAND.colors.body};"><span style="color:${BRAND.colors.green};font-weight:800;">&#10003;</span>&nbsp;&nbsp;${safe(b, '')}</td></tr>`).join('')}</table>`
      : '';
    const imgHtml = has0(image)
      ? `<img src="${image}" width="536" alt="${safe(title, 'New feature')}" style="display:block;width:100%;max-width:536px;height:auto;border:1px solid ${BRAND.colors.line};border-radius:14px;margin:0 0 16px;" />`
      : '';
    return {
      subject: has0(title) ? `${safe(title)} — ${BRAND.namePlain}` : `What's new on ${BRAND.namePlain}`,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: safe(title, `A new update just landed on ${BRAND.namePlain}.`),
        heading: safe(title, "What's new"),
        greetingName: name,
        bodyHtml: `${imgHtml}<p style="margin:0 0 12px;">${safe(body, `We've just rolled out an update to make ${BRAND.name} even better. Open the app to check it out.`)}</p>${benefitsHtml}`,
        ctaLabel: safe(ctaLabel, 'Open the app'),
        ctaUrl: safe(ctaUrl, `${SITE}/`),
      }),
    };
  },

  // Re-engagement / win-back for lapsed users.
  WIN_BACK: ({ name, unsubscribeUrl }) => ({
    subject: `We miss you at ${BRAND.namePlain}`,
    html: wrapEmail({
      unsubscribeUrl: unsub(unsubscribeUrl),
      preheader: 'Your next green gesture is just one pickup away.',
      heading: 'We miss you',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">It's been a while! Your everyday materials can still become ${BRAND.currency} — and real impact for the ecosystem.</p>
        <p style="margin:0;">Book a free pickup whenever you're ready and keep valuable resources moving in the loop.</p>`,
      ctaLabel: 'Book a free pickup',
      ctaUrl: `${SITE}/SchedulePickup`,
    }),
  }),

  // Seasonal / festival greeting. `occasion` e.g. "happy diwali" (auto title-cased so
  // festival names always render correctly: "Happy Diwali", "Eid Mubarak"); `message` optional.
  SEASONAL_GREETING: ({ name, occasion, message, unsubscribeUrl }) => {
    const occ = has0(occasion) ? escapeHtml(properCase(occasion)) : '';
    return {
      subject: occ ? `${occ} from ${BRAND.namePlain}` : `Warm wishes from ${BRAND.namePlain}`,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: occ || `Season's greetings from the ${BRAND.namePlain} team.`,
        heading: occ || 'Warm wishes',
        greetingName: name,
        bodyHtml: `<p style="margin:0 0 12px;">${safe(message, `Wishing you and your family a bright, joyful and sustainable ${occ || 'celebration'}. Thank you for keeping resources in the loop with us and making a real difference.`)}</p>`,
        ctaLabel: 'Open the app',
        ctaUrl: `${SITE}/`,
      }),
    };
  },

  // Daily eco-quiz nudge (email version of the push). Play to earn coins; resets nightly.
  DAILY_QUIZ: ({ name, streak, unsubscribeUrl }) => {
    const st = streak != null && String(streak).trim() !== '' && Number(streak) > 0 ? escapeHtml(String(streak)) : null;
    return {
      subject: `Today's eco quiz is live on ${BRAND.namePlain}`,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: `3 quick questions, instant ${BRAND.currency}.`,
        heading: "Today's eco quiz is live",
        greetingName: name,
        bodyHtml: `<p style="margin:0 0 8px;">Answer 3 quick questions on sustainability and earn ${BRAND.currency} — it resets tonight.</p>
          ${st ? `<p style="margin:0 0 8px;">You're on a <strong>${st}-day</strong> streak — keep it alive!</p>` : ''}
          <p style="margin:0;">A few minutes, a little knowledge, real rewards.</p>`,
        ctaLabel: "Play today's quiz",
        ctaUrl: `${SITE}/Quiz`,
      }),
    };
  },

  // Birthday greeting (reusable). Optional `bonus` = birthday KarmaCoins XP the backend
  // credited — when present the CTA points at the wallet, otherwise a soft app nudge.
  BIRTHDAY: ({ name, bonus, unsubscribeUrl }) => {
    const gift = has0(bonus) && Number(String(bonus).replace(/[^\d.]/g, '')) > 0;
    return {
      subject: `Happy birthday from ${BRAND.namePlain}!`,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: gift ? `A little birthday gift is waiting in your wallet.` : `Wishing you a wonderful day from all of us.`,
        heading: 'Happy birthday!',
        greetingName: name,
        bodyHtml: `<p style="margin:0 0 12px;">From everyone at ${BRAND.name}, we hope your day is bright, joyful and kind to the planet.</p>
          ${gift ? `${rewardsCard(escapeHtml(comma(bonus)), null)}<p style="margin:0;">Consider it our way of saying thanks for being part of a more sustainable future. Enjoy!</p>` : `<p style="margin:0;">Here's to another year of small gestures that keep our shared ecosystem lighter.</p>`}`,
        ctaLabel: gift ? 'See my wallet' : 'Open the app',
        ctaUrl: gift ? `${SITE}/Wallet` : `${SITE}/`,
      }),
    };
  },

  // Streak-tier upgrade celebration (email version of the push). `tier` = tier name.
  TIER_UPGRADE: ({ name, tier, unsubscribeUrl }) => ({
    subject: `You've reached ${safe(tier, 'a new')} tier on ${BRAND.namePlain}`,
    html: wrapEmail({
      unsubscribeUrl: unsub(unsubscribeUrl),
      preheader: 'Each reward coin is now worth more.',
      heading: `You've reached ${safe(tier, 'a new tier')}!`,
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">Your consistency is paying off — you've reached <strong>${safe(tier, 'a new')} tier</strong>. Each of your reward coins is now worth more than it was at your previous tier.</p>
        <p style="margin:0;">Keep the streak alive with a pickup, quiz, or referral to hold your tier — and climb higher for even more value.</p>`,
      ctaLabel: 'See my wallet',
      ctaUrl: `${SITE}/Wallet`,
    }),
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSACTIONAL additions — event-driven, no unsubscribe footer.
  // ─────────────────────────────────────────────────────────────────────────

  // Password reset OTP — distinct from the email-verification OTP above.
  FORGOT_PASSWORD_OTP: ({ otp }) => ({
    subject: `Your ${BRAND.namePlain} password reset code`,
    html: wrapEmail({
      preheader: `Your password reset code${otp ? ` is ${escapeHtml(otp)}` : ''}`,
      heading: 'Reset your password',
      bodyHtml: `<p style="margin:0 0 4px;">Use this code in the ${BRAND.name} app to reset your password:</p>
        <p style="font-size:34px;font-weight:800;letter-spacing:10px;color:${BRAND.colors.deep};margin:18px 0;text-align:center;">${safe(otp, '------')}</p>
        <p style="margin:0;color:${BRAND.colors.muted};">This code is valid for 10 minutes. Never share it — our team will never ask for it. If you didn't request this, you can safely ignore this email.</p>`,
    }),
  }),

  // Cash payout completed.
  PAYOUT_SUCCESS: ({ name, amount }) => ({
    subject: `Your ${BRAND.namePlain} payout is on its way`,
    html: wrapEmail({
      preheader: `${amount ? `₹${escapeHtml(String(amount))}` : 'Your payout'} has been sent to your account.`,
      heading: 'Payout sent',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">Good news — ${amount ? `<strong>₹${escapeHtml(String(amount))}</strong>` : 'your payout'} has been sent to your account. Depending on your bank, it may take a little time to reflect.</p>
        <p style="margin:0;">Thank you for turning everyday actions into real impact.</p>`,
      ctaLabel: 'View wallet',
      ctaUrl: `${SITE}/Wallet`,
    }),
  }),

  // Cash payout failed.
  PAYOUT_FAILED: ({ name, amount }) => ({
    subject: `We couldn't process your ${BRAND.namePlain} payout`,
    html: wrapEmail({
      preheader: `Your ${amount ? `₹${escapeHtml(String(amount))} ` : ''}payout couldn't be processed — your coins are safe.`,
      heading: "Payout didn't go through",
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">We couldn't process your ${amount ? `<strong>₹${escapeHtml(String(amount))}</strong> ` : ''}payout. Your ${BRAND.currency} are safe and remain in your wallet.</p>
        <p style="margin:0;">Please check your payout details and try again, or <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.colors.green};font-weight:700;">contact support</a> if the problem continues.</p>`,
      ctaLabel: 'View wallet',
      ctaUrl: `${SITE}/Wallet`,
    }),
  }),

  // Redemption confirmed.
  REDEMPTION_CONFIRMED: ({ name, coins }) => ({
    subject: `Your ${BRAND.namePlain} redemption is confirmed`,
    html: wrapEmail({
      preheader: `You redeemed ${safe(coins, 'your')} ${BRAND.currency}.`,
      heading: 'Redemption confirmed',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 2px;">Your redemption is confirmed.</p>
        ${rewardsCard(safe(coins, '0'), null)}
        <p style="margin:0;">The details are in your wallet. Keep earning and keep redeeming.</p>`,
      ctaLabel: 'View wallet',
      ctaUrl: `${SITE}/Wallet`,
    }),
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // NON-TRANSACTIONAL additions — marketing opt-in + unsubscribe required.
  // ─────────────────────────────────────────────────────────────────────────

  // Streak milestone celebration (email companion to the push).
  STREAK_MILESTONE: ({ name, streak, unsubscribeUrl }) => ({
    subject: `You hit a ${safe(streak, 'new')}-day streak on ${BRAND.namePlain}!`,
    html: wrapEmail({
      unsubscribeUrl: unsub(unsubscribeUrl),
      preheader: 'Each reward coin is worth more the longer your streak runs.',
      heading: `${safe(streak, 'A new')}-day streak!`,
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">You're on a roll — a <strong>${safe(streak, 'growing')}-day</strong> streak of green actions. The longer your streak runs, the more each reward coin is worth.</p>
        <p style="margin:0;">Keep it alive with a pickup, quiz, or referral.</p>`,
      ctaLabel: 'See my wallet',
      ctaUrl: `${SITE}/Wallet`,
    }),
  }),

  // Coins nearing expiry — only when an expiry policy is enabled.
  COINS_EXPIRING: ({ name, coins, date, unsubscribeUrl }) => ({
    subject: `Your ${BRAND.currency} expire soon — redeem on ${BRAND.namePlain}`,
    html: wrapEmail({
      unsubscribeUrl: unsub(unsubscribeUrl),
      preheader: `${safe(coins, 'Some')} ${BRAND.currency} expire${date ? ` on ${escapeHtml(String(date))}` : ' soon'}.`,
      heading: 'Coins expiring soon',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;"><strong>${safe(coins, 'Some')} ${BRAND.currency}</strong> in your wallet expire${date ? ` on <strong>${escapeHtml(String(date))}</strong>` : ' soon'}. Redeem them before they're gone.</p>
        <p style="margin:0;">A quick redemption is all it takes.</p>`,
      ctaLabel: 'Redeem now',
      ctaUrl: `${SITE}/Wallet`,
    }),
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // NON-TRANSACTIONAL — lifecycle coverage additions (activation, growth,
  // impact, promo, feedback). All require marketing opt-in + unsubscribe.
  // ─────────────────────────────────────────────────────────────────────────

  // Activation: signed up but hasn't booked a first pickup yet. Drip-friendly.
  FIRST_PICKUP_NUDGE: ({ name, unsubscribeUrl }) => ({
    subject: `Your first pickup is one tap away on ${BRAND.namePlain}`,
    html: wrapEmail({
      unsubscribeUrl: unsub(unsubscribeUrl),
      preheader: `Book a free pickup and earn your first ${BRAND.currency}.`,
      heading: 'Ready for your first pickup?',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">You're all set up — the only thing left is your first pickup. Hand over the everyday materials lying around your home and we'll turn them into ${BRAND.currency}.</p>
        <p style="margin:0;">It's free, it's quick, and every pickup keeps valuable resources in the loop.</p>`,
      ctaLabel: 'Book a free pickup',
      ctaUrl: `${SITE}/SchedulePickup`,
    }),
  }),

  // Expansion + activation: pickups just went live in the user's area.
  SERVICE_AREA_LIVE: ({ name, area, unsubscribeUrl }) => {
    const a = has0(area) ? escapeHtml(String(area)) : '';
    return {
      subject: a ? `${BRAND.namePlain} is now live in ${a}` : `${BRAND.namePlain} just launched near you`,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: `Book your first free pickup${a ? ` in ${a}` : ''}.`,
        heading: a ? `We're now in ${a}!` : "We've launched near you!",
        greetingName: name,
        bodyHtml: `<p style="margin:0 0 12px;">Great news — ${BRAND.name} pickups just went live ${a ? `in <strong>${a}</strong>` : 'in your area'}. You can now book a free pickup and start turning everyday materials into ${BRAND.currency}.</p>
          <p style="margin:0;">Be one of the first in your neighbourhood to make an impact.</p>`,
        ctaLabel: 'Book a free pickup',
        ctaUrl: `${SITE}/SchedulePickup`,
      }),
    };
  },

  // One-time celebration after the user's first completed pickup (email companion
  // to the push). `coins` = coins credited for that pickup.
  FIRST_PICKUP_DONE: ({ name, coins, unsubscribeUrl }) => ({
    subject: `Your first pickup is done — welcome to the loop!`,
    html: wrapEmail({
      unsubscribeUrl: unsub(unsubscribeUrl),
      preheader: `You earned your first ${BRAND.currency}.`,
      heading: 'Your first pickup is done!',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 2px;">You just completed your very first pickup — and turned everyday materials into real impact.</p>
        ${rewardsCard(safe(coins, '0'), null)}
        <p style="margin:0;">This is only the beginning. Keep going and watch your ${BRAND.currency} — and your impact — grow.</p>`,
      ctaLabel: 'Schedule your next pickup',
      ctaUrl: `${SITE}/SchedulePickup`,
    }),
  }),

  // Growth: promotional invite to refer friends (distinct from REFERRAL_REWARD,
  // which is the transactional payout). `code` optional referral code to show;
  // `coins` optional per-side reward (defaults to 1,000).
  REFERRAL_INVITE: ({ name, code, coins, unsubscribeUrl }) => {
    const amt = has0(coins) ? escapeHtml(comma(coins)) : '1,000';
    const codeCard = has0(code)
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;"><tr><td align="center" style="padding:16px;">
          <div style="font-size:12px;font-weight:700;color:${BRAND.colors.muted};letter-spacing:.08em;text-transform:uppercase;">Your referral code</div>
          <div style="font-size:26px;font-weight:900;letter-spacing:4px;color:${BRAND.colors.green};margin-top:4px;">${escapeHtml(String(code))}</div>
        </td></tr></table>`
      : '';
    return {
      subject: `Invite a friend, you both earn ${BRAND.currency}`,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: `Share your code — you each get ${amt} ${BRAND.currency}.`,
        heading: 'Invite friends, both earn',
        greetingName: name,
        bodyHtml: `<p style="margin:0 0 12px;">Know someone who'd love to turn everyday materials into rewards? Share ${BRAND.name} — when they sign up with your code, <strong>you each earn ${amt} ${BRAND.currency}</strong>.</p>
          ${codeCard}
          <p style="margin:0;">The more friends you bring, the more you both keep earning.</p>`,
        ctaLabel: 'Invite friends',
        ctaUrl: `${SITE}/Referral`,
      }),
    };
  },

  // Limited-time promotional offer / bonus-coins campaign. Flexible per campaign:
  //   `title`/`body` — campaign copy; `endDate` — when it ends; `ctaLabel`/`ctaUrl`.
  LIMITED_OFFER: ({ name, title, body, endDate, ctaLabel, ctaUrl, unsubscribeUrl }) => ({
    subject: has0(title) ? `${safe(title)} — ${BRAND.namePlain}` : `A limited-time ${BRAND.currency} boost is live`,
    html: wrapEmail({
      unsubscribeUrl: unsub(unsubscribeUrl),
      preheader: has0(endDate) ? `Ends ${escapeHtml(String(endDate))} — don't miss out.` : `For a limited time only.`,
      heading: safe(title, 'Limited-time offer'),
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">${safe(body, `For a limited time, every pickup earns you extra ${BRAND.currency}. There's never been a better moment to book.`)}</p>
        ${has0(endDate) ? `<p style="margin:0 0 12px;font-weight:700;color:${BRAND.colors.deep};">Offer ends ${escapeHtml(String(endDate))}.</p>` : ''}
        <p style="margin:0;">Book now and make the most of it.</p>`,
      ctaLabel: safe(ctaLabel, 'Book a pickup'),
      ctaUrl: safe(ctaUrl, `${SITE}/SchedulePickup`),
    }),
  }),

  // Lifetime impact milestone (distinct from the monthly IMPACT_REPORT): a
  // cumulative achievement — total kg recovered, CO2 saved, pickups done.
  IMPACT_MILESTONE: ({ name, kg, co2, pickups, unsubscribeUrl }) => {
    const num = (v) => (v != null && String(v).trim() !== '' ? Number(String(v).replace(/[^\d.]/g, '')) || 0 : 0);
    const has = (v) => v != null && String(v).trim() !== '';
    const hasKg = num(kg) > 0;
    return {
      subject: hasKg ? `You've recovered ${escapeHtml(comma(kg))} kg with ${BRAND.namePlain}!` : `A new impact milestone on ${BRAND.namePlain}`,
      html: wrapEmail({
        unsubscribeUrl: unsub(unsubscribeUrl),
        preheader: hasKg ? `${escapeHtml(comma(kg))} kg of resources given a second life — and counting.` : `Your everyday actions are adding up to real impact.`,
        heading: hasKg ? `${escapeHtml(comma(kg))} kg recovered!` : 'A new impact milestone!',
        greetingName: name,
        bodyHtml: `<p style="margin:0 0 4px;">Look how far your everyday green gestures have come with ${BRAND.name}:</p>
          ${detailTable([
            ['Resources given a second life', hasKg ? `${escapeHtml(comma(kg))} kg` : '—'],
            ...(has(co2) ? [['CO₂ emissions avoided', `${escapeHtml(comma(co2))} kg`]] : []),
            ...(has(pickups) ? [['Green pickups completed', safe(pickups, '0')]] : []),
          ])}
          <p style="margin:14px 0 0;">Every kilogram keeps our shared ecosystem lighter. Thank you for keeping resources in the loop.</p>`,
        ctaLabel: 'Schedule your next pickup',
        ctaUrl: `${SITE}/SchedulePickup`,
      }),
    };
  },

  // Feedback / NPS survey request. `surveyUrl` links to the survey form.
  FEEDBACK_SURVEY: ({ name, surveyUrl, unsubscribeUrl }) => ({
    subject: `We'd love your feedback on ${BRAND.namePlain}`,
    html: wrapEmail({
      unsubscribeUrl: unsub(unsubscribeUrl),
      preheader: `Two minutes of your time helps us make ${BRAND.namePlain} better.`,
      heading: 'How are we doing?',
      greetingName: name,
      bodyHtml: `<p style="margin:0 0 12px;">Your experience shapes ${BRAND.name}. If you have two minutes, we'd love to hear what's working, what isn't, and what you'd like to see next.</p>
        <p style="margin:0;">Every response is read by a real person on our team — thank you for helping us improve.</p>`,
      ctaLabel: 'Share your feedback',
      ctaUrl: safe(surveyUrl, `${SITE}/feedback`),
    }),
  }),
};

module.exports = { templates };
