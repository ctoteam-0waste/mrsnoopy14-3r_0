// Runs after `expo export --platform web`. Expo only ever produces one dist/index.html
// (this app is a client-rendered SPA with no SSR). To get real multi-page SEO — distinct
// <title>/description/OG/JSON-LD that crawlers see WITHOUT executing JS — this script
// clones that index.html for each public route and swaps in page-specific metadata.
// The React Navigation `linking` config (src/navigation/RootNavigator.tsx) then makes the
// live app boot into the matching screen when a user's JS actually runs on that URL.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const DIST = path.join(__dirname, '..', 'dist');
const SITE = 'https://karmaverse.earth';

const baseHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
const clean = (s) => s.replace(/KarmaVer\$e/g, 'KarmaVerse');
const faq = (question, answer) => ({
  '@type': 'Question',
  name: question,
  acceptedAnswer: { '@type': 'Answer', text: answer },
});

// Live-transpile legalContent.ts (single source of truth for Privacy/Terms copy) so the
// static noscript fallback below can never drift from what LegalScreen actually renders.
function loadLegalContent() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'legalContent.ts'), 'utf8');
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
  });
  const mod = { exports: {} };
  new Function('exports', 'module', outputText)(mod.exports, mod);
  return mod.exports;
}

const { TERMS, PRIVACY, DATA_DELETION } = loadLegalContent();

function renderLegalDocHtml(doc) {
  let html = `<h1>${escapeHtml(clean(doc.title))}</h1>`;
  if (doc.intro) html += `<p>${escapeHtml(clean(doc.intro))}</p>`;
  for (const section of doc.sections) {
    html += `<h2>${escapeHtml(clean(section.heading))}</h2>`;
    if (section.body) html += section.body.map((p) => `<p>${escapeHtml(clean(p))}</p>`).join('\n');
    if (section.bullets) {
      html += `<ul>${section.bullets.map((b) => `<li>${escapeHtml(clean(b))}</li>`).join('')}</ul>`;
    }
  }
  if (doc.closing) html += `<p>${escapeHtml(clean(doc.closing))}</p>`;
  return html;
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: '3R Zero Waste',
  url: 'https://0waste.co.in/',
  logo: `${SITE}/apple-touch-icon.png`,
  email: 'cto.team@0waste.co.in',
  telephone: '+91-70931-98828',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Plot 62, Sector 8 Rd, IMT Manesar',
    addressLocality: 'Gurugram',
    addressRegion: 'Haryana',
    postalCode: '122503',
    addressCountry: 'IN',
  },
};

const pages = [
  {
    urlPath: '', // home — already correct in the base file, but re-run for consistency
    outPath: 'index.html',
    title: 'KarmaVerse — Turning Sustainable Gestures into Rewards',
    description:
      "KarmaVerse is India's sustainability rewards ecosystem. Earn KarmaCoins for everyday eco-friendly actions — from doorstep recycling pickups to eco-quizzes — and redeem them for real rewards while creating measurable environmental impact.",
    jsonLd: [
      orgJsonLd,
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'KarmaVerse',
        url: `${SITE}/`,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Android, iOS, Web',
        description:
          "KarmaVerse is India's sustainability rewards ecosystem. Earn KarmaCoins for everyday eco-friendly actions — from doorstep recycling pickups to eco-quizzes — and redeem them for real rewards while creating measurable environmental impact.",
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
        publisher: { '@type': 'Organization', name: '3R Zero Waste', url: 'https://0waste.co.in/' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          faq(
            'Is doorstep pickup really free?',
            'Yes — doorstep pickup is 100% free, with no cost to the user, ever.'
          ),
          faq(
            'What waste categories does KarmaVerse accept?',
            '8 categories: plastic, paper, metal, e-waste, textile, cardboard, and more.'
          ),
          faq(
            'How do I earn KarmaCoins XP?',
            'Schedule a pickup, an agent collects and verifies your waste on the spot, and KarmaCoins XP are credited to your wallet instantly.'
          ),
          faq(
            'What can I redeem KarmaCoins XP for?',
            'Eco-friendly products, tree planting, or charitable donations.'
          ),
          faq(
            'How does the referral program work?',
            'Refer a friend and you both earn 1,000 KarmaCoins XP instantly.'
          ),
        ],
      },
    ],
    noscriptBody: `<h1>KarmaVerse — Turning Sustainable Gestures into Rewards</h1>
    <p>
      KarmaVerse is India's sustainability rewards ecosystem, built by 3R Zero Waste.
      Complete everyday sustainable actions — like doorstep recycling pickups for plastic,
      paper, metal, e-waste, textile and more — and earn KarmaCoins XP. Every action is
      verified, and coins are credited instantly, redeemable for eco-friendly products,
      gift cards, discounts, tree planting, or charitable donations.
    </p>
    <h2>Frequently asked questions</h2>
    <dl>
      <dt>Is doorstep pickup really free?</dt>
      <dd>Yes — doorstep pickup is 100% free, with no cost to the user, ever.</dd>
      <dt>What waste categories does KarmaVerse accept?</dt>
      <dd>8 categories: plastic, paper, metal, e-waste, textile, cardboard, and more.</dd>
      <dt>How do I earn KarmaCoins XP?</dt>
      <dd>Schedule a pickup, an agent collects and verifies your waste on the spot, and KarmaCoins XP are credited to your wallet instantly.</dd>
      <dt>What can I redeem KarmaCoins XP for?</dt>
      <dd>Eco-friendly products, tree planting, or charitable donations.</dd>
      <dt>How does the referral program work?</dt>
      <dd>Refer a friend and you both earn 1,000 KarmaCoins XP instantly.</dd>
    </dl>`,
  },
  {
    urlPath: 'login',
    outPath: 'login/index.html',
    title: 'Log In or Sign Up — KarmaVerse',
    description:
      'Log in or create your free KarmaVerse account to schedule doorstep recycling pickups and start earning KarmaCoins XP.',
    jsonLd: [
      orgJsonLd,
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Log In or Sign Up',
        url: `${SITE}/login`,
        isPartOf: { '@type': 'WebSite', name: 'KarmaVerse', url: `${SITE}/` },
      },
    ],
    noscriptBody: `<h1>Log In or Sign Up — KarmaVerse</h1>
    <p>
      Enter your email to log in or create a free KarmaVerse account. Once signed in you can
      schedule doorstep recycling pickups and start earning KarmaCoins XP.
    </p>`,
  },
  {
    urlPath: 'legal/privacy',
    outPath: 'legal/privacy/index.html',
    title: 'Privacy Policy — KarmaVerse',
    description:
      "How KarmaVerse (by 3R Zero Waste) collects, uses, and protects your data. Read the full privacy policy for the KarmaVerse recycling rewards app.",
    jsonLd: [
      orgJsonLd,
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Privacy Policy',
        url: `${SITE}/legal/privacy`,
        isPartOf: { '@type': 'WebSite', name: 'KarmaVerse', url: `${SITE}/` },
        publisher: { '@type': 'Organization', name: '3R Zero Waste', url: 'https://0waste.co.in/' },
      },
    ],
    noscriptBody: renderLegalDocHtml(PRIVACY),
  },
  {
    urlPath: 'legal/terms',
    outPath: 'legal/terms/index.html',
    title: 'Terms & Conditions — KarmaVerse',
    description:
      'The terms and conditions governing use of the KarmaVerse app and website, operated by 3R Zero Waste.',
    jsonLd: [
      orgJsonLd,
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Terms & Conditions',
        url: `${SITE}/legal/terms`,
        isPartOf: { '@type': 'WebSite', name: 'KarmaVerse', url: `${SITE}/` },
        publisher: { '@type': 'Organization', name: '3R Zero Waste', url: 'https://0waste.co.in/' },
      },
    ],
    noscriptBody: renderLegalDocHtml(TERMS),
  },
  {
    urlPath: 'legal/data-deletion',
    outPath: 'legal/data-deletion/index.html',
    title: 'Data Deletion — KarmaVerse',
    description:
      'How to request deletion of your KarmaVerse account and associated data, including data from third-party sign-in providers.',
    jsonLd: [
      orgJsonLd,
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Data Deletion',
        url: `${SITE}/legal/data-deletion`,
        isPartOf: { '@type': 'WebSite', name: 'KarmaVerse', url: `${SITE}/` },
        publisher: { '@type': 'Organization', name: '3R Zero Waste', url: 'https://0waste.co.in/' },
      },
    ],
    noscriptBody: renderLegalDocHtml(DATA_DELETION),
  },
];

function renderPage(base, page) {
  const canonical = `${SITE}/${page.urlPath}`;
  let html = base;

  html = html.replace(/<title>.*?<\/title>/s, `<title>${page.title}</title>`);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonical}$2`);
  html = html.replace(
    /(<meta name="description" content=")[^"]*(")/,
    `$1${page.description.replace(/"/g, '&quot;')}$2`
  );
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${page.title}$2`);
  html = html.replace(
    /(<meta property="og:description" content=")[^"]*(")/,
    `$1${page.description.replace(/"/g, '&quot;')}$2`
  );
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonical}$2`);
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${page.title}$2`);
  html = html.replace(
    /(<meta name="twitter:description" content=")[^"]*(")/,
    `$1${page.description.replace(/"/g, '&quot;')}$2`
  );

  // Replace the two <script type="application/ld+json"> blocks with this page's schema list.
  const ldBlocks = page.jsonLd
    .map((obj) => `    <script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n    </script>`)
    .join('\n');
  html = html.replace(
    /(<!-- Structured data: the organization behind KarmaVerse -->\s*<script type="application\/ld\+json">)[\s\S]*?(<\/script>\s*<!-- Structured data: the KarmaVerse product itself -->\s*<script type="application\/ld\+json">)[\s\S]*?(<\/script>)/,
    `<!-- Structured data -->\n${ldBlocks}`
  );

  // Swap the <noscript> fallback body so non-JS crawlers see content that actually
  // matches this page, instead of the generic homepage pitch on every route.
  html = html.replace(
    /<noscript>[\s\S]*?<\/noscript>/,
    `<noscript>\n      ${page.noscriptBody}\n      <p>You need to enable JavaScript to run this app.</p>\n    </noscript>`
  );

  return html;
}

for (const page of pages) {
  const outFile = path.join(DIST, page.outPath);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, renderPage(baseHtml, page));
  console.log(`SEO page written: ${page.outPath}`);
}

// Regenerate the sitemap with all real pages now that we know they exist.
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (p) => `  <url>
    <loc>${SITE}/${p.urlPath}</loc>
    <changefreq>weekly</changefreq>
    <priority>${p.urlPath === '' ? '1.0' : '0.6'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap);
console.log('sitemap.xml regenerated with', pages.length, 'URLs');
