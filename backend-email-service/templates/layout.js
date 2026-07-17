// Shared HTML wrapper so every template gets the same header/footer without
// repeating markup. Keep this simple — a single-column transactional layout
// renders reliably across Gmail/Outlook/Apple Mail without an MJML build step.
function wrapEmail({ preheader = '', bodyHtml, ctaLabel, ctaUrl }) {
  const cta = ctaLabel && ctaUrl
    ? `<tr><td align="center" style="padding: 28px 0 8px;">
         <a href="${ctaUrl}" style="background:#4ade80;color:#052e16;font-weight:700;font-size:15px;
            text-decoration:none;padding:14px 28px;border-radius:12px;display:inline-block;">
           ${ctaLabel}
         </a>
       </td></tr>`
    : '';

  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:20px;overflow:hidden;max-width:480px;width:100%;">
        <tr><td style="background:#052e16;padding:24px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.3px;">KarmaVer$e</span>
        </td></tr>
        <tr><td style="padding:32px;color:#0f172a;font-size:15px;line-height:1.6;">
          ${bodyHtml}
        </td></tr>
        ${cta}
        <tr><td style="padding:20px 32px;border-top:1px solid #f1f5f9;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">
            A 3R Zero Waste initiative &middot; <a href="https://0waste.co.in/" style="color:#16a34a;">0waste.co.in</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { wrapEmail };
