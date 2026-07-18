const nodemailer = require('nodemailer');
const { templates } = require('./templates/templates');

// Sends through your existing Gmail/Google Workspace account via SMTP —
// no third-party email service. See README for the App Password setup and
// the sending-limit tradeoffs (Workspace: ~2,000/day, Gmail: ~500/day).
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Gmail's spam filter (and most others) weight a proper multipart email —
// HTML plus a plain-text alternative — above HTML-only. This derives a
// readable text version from the HTML so every send is multipart automatically.
function htmlToText(html) {
  return html
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&middot;/g, '-')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Send a templated transactional email.
 * @param {string} to - recipient email address
 * @param {keyof typeof templates} templateKey - e.g. 'BOOKING_ACCEPTED'
 * @param {object} data - placeholder values the template needs (see templates.js)
 */
async function sendTemplatedEmail(to, templateKey, data) {
  const build = templates[templateKey];
  if (!build) {
    throw new Error(`Unknown email template: ${templateKey}`);
  }
  const { subject, html } = build(data);

  await transporter.sendMail({
    to,
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.GMAIL_USER}>`,
    subject,
    html,
    text: htmlToText(html),
  });
}

module.exports = { sendTemplatedEmail };
