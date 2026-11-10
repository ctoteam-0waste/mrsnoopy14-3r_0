// Shared brand tokens + HTML building blocks for every transactional email.
// Single source of truth so all 12 templates stay visually consistent and every
// header/footer/button/card lives in ONE place (no duplicated markup).

const path = require('path');
const fs = require('fs');

const BRAND = {
  name: 'KarmaVer$e',            // display wordmark (body/logo)
  namePlain: 'KarmaVerse',       // subject-safe (avoids "$" spam signals)
  currency: 'KarmaCoins XP',     // in-app currency — exact spelling everywhere
  company: '3R ZeroWaste',
  site: 'https://karmaverse.earth',
  logo: 'https://karmaverse.earth/email-logo.png', // public HTTPS (served by Netlify)
  androidUrl: 'https://play.google.com/store/apps/details?id=com.karmacredits.app',
  iosUrl: 'https://karmaverse.earth/', // TODO: point to the App Store listing once iOS is live

  supportEmail: 'info@0waste.co.in',
  phone: '+91 70931 98828 / +91 99071 91928',
  address: 'Plot 62, Sector 8, IMT Manesar, Gurugram, Haryana 122051',
  colors: {
    deep: '#052e16', green: '#15803d', mint: '#4ade80', mintText: '#052e16',
    page: '#f1f5f9', card: '#ffffff', text: '#0f172a', body: '#334155',
    muted: '#64748b', faint: '#94a3b8', line: '#e2e8f0',
  },
  social: [
    ['Instagram', 'https://www.instagram.com/mykarmaverse/'],
    ['Facebook', 'https://www.facebook.com/share/p/17GYy6Qyam/'],
    ['LinkedIn', 'https://www.linkedin.com/showcase/136793967'],
    ['X', 'https://x.com/mykarmaverse'],
    ['YouTube', 'https://www.youtube.com/channel/UCJjzqmfLvyFhGRwfjSGE4bw'],
  ],
};

// ── Data-safety helpers (every template runs values through these) ──
function escapeHtml(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// Non-empty escaped value, else the fallback (prevents "undefined" from ever rendering).
function safe(v, fallback = '') {
  const s = v == null ? '' : String(v).trim();
  return s ? escapeHtml(s) : fallback;
}
// "shashi shekhar" → "Shashi Shekhar"; empty → "there".
function properCase(name) {
  const s = String(name == null ? '' : name).trim();
  if (!s) return 'there';
  return s.toLowerCase().replace(/\b([a-z])/g, (_, c) => c.toUpperCase());
}
// Raw Mongo _id → customer-facing "KC-XXXXX" (never expose the raw id).
function shortId(id) {
  const s = String(id == null ? '' : id).replace(/[^a-zA-Z0-9]/g, '');
  if (!s) return '';
  return 'KC-' + s.slice(-5).toUpperCase();
}
const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(BRAND.address);

// ── Brand images (logo + social icons) ──
// Emails embed these as CID INLINE ATTACHMENTS by default: the image bytes ride
// inside the message, so they render even when the client blocks external images
// AND never depend on karmaverse.earth being deployed/reachable. Files are bundled
// in ../assets so this module is fully self-contained.
const ASSET_DIR = path.join(__dirname, '..', 'assets');
const IMAGES = {
  logo:      { cid: 'kv-logo',            file: 'email-logo.png',       url: BRAND.site + '/email-logo.png' },
  instagram: { cid: 'kv-social-instagram', file: 'social/instagram.png', url: BRAND.site + '/email/social/instagram.png' },
  facebook:  { cid: 'kv-social-facebook',  file: 'social/facebook.png',  url: BRAND.site + '/email/social/facebook.png' },
  linkedin:  { cid: 'kv-social-linkedin',  file: 'social/linkedin.png',  url: BRAND.site + '/email/social/linkedin.png' },
  x:         { cid: 'kv-social-x',         file: 'social/x.png',         url: BRAND.site + '/email/social/x.png' },
  youtube:   { cid: 'kv-social-youtube',   file: 'social/youtube.png',   url: BRAND.site + '/email/social/youtube.png' },
  appstore:  { cid: 'kv-badge-appstore',   file: 'appstore.png',         url: BRAND.site + '/email/appstore.png' },
  appstore_soon: { cid: 'kv-badge-appstore-soon', file: 'appstore_soon.png', url: BRAND.site + '/email/appstore_soon.png' },
  googleplay:{ cid: 'kv-badge-googleplay', file: 'googleplay.png',       url: BRAND.site + '/email/googleplay.png' },
};

// iOS launches 30 Sep 2026. Until then the App Store badge shows "Coming soon" and
// links to the site (not a dead store URL); it auto-flips to the live badge + real
// store link on launch day — no manual change needed on 30 Sep.
const IOS_LAUNCH = Date.parse('2026-09-30T00:00:00+05:30');
const iosLive = () => Date.now() >= IOS_LAUNCH;
const iosBadgeKey = () => (iosLive() ? 'appstore' : 'appstore_soon');
const iosBadgeHref = () => (iosLive() ? BRAND.iosUrl : BRAND.site);

// 'cid'   → cid:<id>  (real sends — inline attachments; the default)
// 'url'   → public HTTPS on karmaverse.earth (if a client can't do inline)
// 'local' → file:// path to the bundled asset (browser preview only)
let ASSET_MODE = 'cid';
function setAssetMode(mode) { ASSET_MODE = mode; }
function imgSrc(key) {
  const a = IMAGES[key];
  if (!a) return '';
  if (ASSET_MODE === 'url') return a.url;
  if (ASSET_MODE === 'local') return 'file:///' + path.join(ASSET_DIR, a.file).split(path.sep).join('/');
  // Self-contained preview (e.g. a shared HTML page under a strict CSP that blocks
  // external hosts) — inline the bundled PNG bytes as a data URI.
  if (ASSET_MODE === 'datauri') {
    const b64 = fs.readFileSync(path.join(ASSET_DIR, a.file)).toString('base64');
    return 'data:image/png;base64,' + b64;
  }
  return 'cid:' + a.cid;
}
// nodemailer-shaped inline attachments for every brand image (attach on every
// send so the cid: references in the HTML always resolve).
function inlineAttachments() {
  return Object.values(IMAGES).map(a => ({
    filename: path.basename(a.file),
    path: path.join(ASSET_DIR, a.file),
    cid: a.cid,
    contentDisposition: 'inline',
  }));
}

// ── Reusable components ──
function button(label, url) {
  const bg = BRAND.colors.mint, color = BRAND.colors.mintText;
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:26px auto 4px;">
    <tr><td align="center" bgcolor="${bg}" style="border-radius:12px;">
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:46px;v-text-anchor:middle;width:250px;" arcsize="26%" strokecolor="${bg}" fillcolor="${bg}"><w:anchorlock/><center style="color:${color};font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${escapeHtml(label)}</center></v:roundrect><![endif]-->
      <!--[if !mso]><!-- --><a href="${url}" style="background:${bg};color:${color};display:inline-block;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:15px;font-weight:700;line-height:46px;text-align:center;text-decoration:none;width:250px;border-radius:12px;">${escapeHtml(label)}</a><!--<![endif]-->
    </td></tr>
  </table>`;
}

// rows: [[label, value], ...] — values must already be escaped/safe().
function detailTable(rows) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 4px;border:1px solid ${BRAND.colors.line};border-radius:12px;">
    ${rows.map(([l, v], i) => `<tr>
      <td style="padding:12px 16px;${i ? `border-top:1px solid ${BRAND.colors.line};` : ''}font-size:12px;color:${BRAND.colors.muted};font-weight:600;width:42%;">${l}</td>
      <td style="padding:12px 16px;${i ? `border-top:1px solid ${BRAND.colors.line};` : ''}font-size:14px;color:${BRAND.colors.text};font-weight:700;">${v}</td>
    </tr>`).join('')}
  </table>`;
}

// coins/balance already safe(); balance null → hidden.
function rewardsCard(coins, balance) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;border-radius:16px;background:#f0fdf4;border:1px solid #bbf7d0;">
    <tr><td align="center" style="padding:22px;">
      <div style="font-size:12px;color:${BRAND.colors.green};font-weight:800;text-transform:uppercase;letter-spacing:1px;">Coins credited</div>
      <div style="font-size:36px;line-height:1.1;color:${BRAND.colors.green};font-weight:900;margin:8px 0;">+${coins} ${BRAND.currency}</div>
      ${balance != null ? `<div style="font-size:13px;color:${BRAND.colors.muted};font-weight:600;">Wallet balance: <strong style="color:${BRAND.colors.text};">${balance} ${BRAND.currency}</strong></div>` : ''}
    </td></tr>
  </table>`;
}

// ── Full email shell ──
function wrapEmail({ preheader = '', heading = '', greetingName, bodyHtml = '', ctaLabel, ctaUrl, unsubscribeUrl }) {
  const c = BRAND.colors;
  // Greet with the first name only (e.g. "Shashi Shekhar" -> "Shashi").
  const firstName = properCase(String(greetingName ?? '').trim().split(/\s+/)[0] || '');
  const greeting = greetingName !== undefined
    ? `<p style="margin:0 0 14px;font-size:16px;color:${c.text};font-weight:700;">Hi ${firstName},</p>` : '';
  const cta = (ctaLabel && ctaUrl) ? button(ctaLabel, ctaUrl) : '';
  // PNG icons (email clients strip SVG/icon fonts) — a centered row of round brand
  // icons, each linking to the real profile. Embedded inline via cid: (see IMAGES).
  const socialRow = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>${
    BRAND.social.map(([n, u]) => {
      const slug = n.toLowerCase();
      return `<td style="padding:0 5px;"><a href="${u}" target="_blank" style="text-decoration:none;"><img src="${imgSrc(slug)}" width="28" height="28" alt="${n}" title="${n}" style="display:block;border:0;outline:none;" /></a></td>`;
    }).join('')
  }</tr></table>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <!--[if mso]><style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${c.page};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.page};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${c.card};border-radius:20px;overflow:hidden;">
        <tr><td align="center" style="background:${c.deep};padding:26px 32px;">
          <img src="${imgSrc('logo')}" width="180" alt="${BRAND.name}" style="display:block;border:0;outline:none;text-decoration:none;max-width:180px;height:auto;">
        </td></tr>
        <tr><td style="padding:32px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
          ${heading ? `<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:${c.text};font-weight:800;">${heading}</h1>` : ''}
          ${greeting}
          <div style="font-size:15px;line-height:1.6;color:${c.body};">${bodyHtml}</div>
          ${cta}
        </td></tr>
        <tr><td align="center" style="padding:20px 32px;background:#ffffff;border-top:1px solid ${c.line};font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
          <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:${c.text};">Get the ${BRAND.name} app</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
            <td style="padding:0 5px;"><a href="${BRAND.androidUrl}" target="_blank" style="text-decoration:none;"><img src="${imgSrc('googleplay')}" width="150" alt="Get it on Google Play" style="display:block;border:0;outline:none;height:auto;"></a></td>
            <td style="padding:0 5px;"><a href="${iosBadgeHref()}" target="_blank" style="text-decoration:none;"><img src="${imgSrc(iosBadgeKey())}" width="150" alt="${iosLive() ? 'Download on the App Store' : 'App Store — coming soon'}" style="display:block;border:0;outline:none;height:auto;"></a></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:22px 32px;background:#f8fafc;border-top:1px solid ${c.line};font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
          <div style="margin:0 0 14px;">${socialRow}</div>
          <p style="margin:0 0 4px;font-size:12px;color:${c.faint};">
            <a href="mailto:${BRAND.supportEmail}" style="color:${c.green};text-decoration:none;font-weight:700;">Contact us</a>
            &middot; <a href="mailto:${BRAND.supportEmail}" style="color:${c.green};text-decoration:none;">${BRAND.supportEmail}</a>
            &middot; ${BRAND.phone}
          </p>
          <p style="margin:0 0 10px;font-size:12px;color:${c.faint};">
            <a href="${mapsUrl}" style="color:${c.faint};text-decoration:underline;">${BRAND.address}</a>
          </p>
          ${unsubscribeUrl ? `<p style="margin:0 0 8px;font-size:11px;color:${c.faint};">
            You're receiving this because you opted in to ${BRAND.name} updates.
            <a href="${unsubscribeUrl}" style="color:${c.green};text-decoration:underline;font-weight:700;">Unsubscribe</a>
          </p>` : ''}
          <p style="margin:0;font-size:11px;color:#cbd5e1;">
            &copy; ${new Date().getFullYear()} ${BRAND.company}. All rights reserved.
            &middot; <a href="${BRAND.site}/preferences" style="color:#cbd5e1;text-decoration:underline;">Manage preferences</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { BRAND, wrapEmail, button, detailTable, rewardsCard, properCase, shortId, safe, escapeHtml, inlineAttachments, setAssetMode };
