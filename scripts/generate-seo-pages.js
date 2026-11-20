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

const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.karmacredits.app';
// Within 160 characters so search results show it whole.
const HOME_DESCRIPTION =
  'KarmaVerse by 3R ZeroWaste is a climate-action app from India. Earn KarmaCoins XP reward points for everyday sustainable actions and redeem them for rewards.';

// Plain questions people (and AI assistants) ask. Used for FAQPage JSON-LD and the no-JS text.
const GENERAL_FAQS = [
  [
    'What is KarmaVerse?',
    'KarmaVerse by 3R ZeroWaste is a climate-action app from India. Members earn KarmaCoins XP for everyday sustainable actions, from doorstep recycling pickups to eco-quizzes, and redeem them for rewards.',
  ],
  [
    'Is KarmaCoins XP a cryptocurrency?',
    'No. KarmaCoins XP are in-app reward points in the KarmaVerse app. They are not a cryptocurrency, token, NFT or blockchain asset.',
  ],
  [
    'Is KarmaVerse the same as the Karmaverse crypto game?',
    'No. KarmaVerse by 3R ZeroWaste (karmaverse.earth) is a sustainability rewards app and is unrelated to the crypto game of a similar name that uses a KNOT token.',
  ],
  [
    'Who is behind KarmaVerse?',
    '3R ZeroWaste, a sustainability and waste-management company in India. In FY 2025–26 it managed 9,63,379 kg of waste, avoided 22,83,208 kg of CO₂ emissions and engaged 18.5 lakh+ citizens through sustainability and awareness programmes.',
  ],
  [
    'Is the KarmaVerse app available on Android?',
    'Yes. The KarmaVerse app is available on Android through Google Play.',
  ],
  [
    'How do I earn rewards for sustainable actions?',
    'Open KarmaVerse and take part in everyday sustainable actions, such as booking a doorstep recycling pickup or playing the eco-quiz. You earn KarmaCoins XP, which you can redeem for rewards.',
  ],
];

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: '3R ZeroWaste',
  legalName: '3R ZeroWaste Private Limited',
  url: 'https://0waste.co.in/',
  sameAs: ['https://www.instagram.com/3rzerowasteindia/'],
  logo: `${SITE}/apple-touch-icon.png`,
  email: 'info@0waste.co.in',
  telephone: '+91-70931-98828',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Plot 62, Sector 8, IMT Manesar',
    addressLocality: 'Gurugram',
    addressRegion: 'Haryana',
    postalCode: '122051',
    addressCountry: 'IN',
  },
};

const pages = [
  {
    urlPath: '', // home — already correct in the base file, but re-run for consistency
    outPath: 'index.html',
    title: 'KarmaVerse by 3R ZeroWaste — Climate-Action Rewards App',
    // Kept within 160 characters so search results show it whole.
    description: HOME_DESCRIPTION,
    jsonLd: [
      orgJsonLd,
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'KarmaVerse',
        alternateName: 'KarmaVerse by 3R ZeroWaste',
        url: `${SITE}/`,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Android, Web',
        installUrl: PLAY_URL,
        sameAs: [PLAY_URL],
        description:
          'KarmaVerse by 3R ZeroWaste is a climate-action app from India. Members earn KarmaCoins XP (in-app reward points) for everyday sustainable actions, from doorstep recycling pickups to eco-quizzes, and redeem them for rewards.',
        disambiguatingDescription:
          'KarmaVerse by 3R ZeroWaste (karmaverse.earth) is a sustainability rewards app from India. KarmaCoins XP are in-app reward points, not a cryptocurrency, token or NFT. It has no connection to any blockchain or crypto game of a similar name (such as the "Karmaverse" game with the KNOT token, or "Karma Coin").',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
        publisher: { '@type': 'Organization', name: '3R ZeroWaste', url: 'https://0waste.co.in/' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          ...GENERAL_FAQS.map(([q, a]) => faq(q, a)),
          faq(
            'Is doorstep pickup really free?',
            'Yes — doorstep pickup is 100% free, with no cost to the user, ever.'
          ),
          faq(
            'Where is doorstep pickup available?',
            'Doorstep pickup is currently available in Gurugram, Haryana and nearby areas within 50 km of central Gurugram. The app checks your exact address when you book.'
          ),
          faq(
            'What waste categories does KarmaVerse accept?',
            '10 categories: home appliances and electronics, phones and computers, mixed e-waste, plastic, paper and cardboard, metals, glass, batteries, footwear, and textiles.'
          ),
          faq(
            'How do I earn KarmaCoins XP?',
            'Schedule a pickup, an agent collects and verifies your waste on the spot, and KarmaCoins XP are credited to your wallet instantly.'
          ),
          faq(
            'What can I redeem KarmaCoins XP for?',
            'KarmaCoins XP can be redeemed for rewards in the KarmaVerse app.'
          ),
          faq(
            'How does the referral program work?',
            'When a friend signs up with your referral code, you both get 1,000 KarmaCoins XP.'
          ),
        ],
      },
    ],
    noscriptBody: `<h1>KarmaVerse by 3R ZeroWaste — Climate-Action Rewards App</h1>
    <p>
      KarmaVerse by 3R ZeroWaste is a climate-action app from India that rewards everyday
      sustainable actions. Members earn KarmaCoins XP, which are in-app reward points (not a
      cryptocurrency), for actions from doorstep recycling pickups to eco-quizzes, and can
      redeem them for rewards. The app is available on Android.
    </p>
    <h2>Frequently asked questions</h2>
    <dl>
      ${GENERAL_FAQS.map(([q, a]) => `<dt>${escapeHtml(q)}</dt>\n      <dd>${escapeHtml(a)}</dd>`).join('\n      ')}
      <dt>Is doorstep pickup really free?</dt>
      <dd>Yes — doorstep pickup is 100% free, with no cost to the user, ever.</dd>
      <dt>Where is doorstep pickup available?</dt>
      <dd>Doorstep pickup is currently available in Gurugram, Haryana and nearby areas within 50 km of central Gurugram. The app checks your exact address when you book.</dd>
      <dt>What waste categories does KarmaVerse accept?</dt>
      <dd>10 categories: home appliances and electronics, phones and computers, mixed e-waste, plastic, paper and cardboard, metals, glass, batteries, footwear, and textiles.</dd>
      <dt>How do I earn KarmaCoins XP?</dt>
      <dd>Schedule a pickup, an agent collects and verifies your waste on the spot, and KarmaCoins XP are credited to your wallet instantly.</dd>
      <dt>What can I redeem KarmaCoins XP for?</dt>
      <dd>KarmaCoins XP can be redeemed for rewards in the KarmaVerse app.</dd>
      <dt>How does the referral program work?</dt>
      <dd>When a friend signs up with your referral code, you both get 1,000 KarmaCoins XP.</dd>
    </dl>
    <p>More: <a href="/recycling-rewards-app/">Recycling rewards app</a> · <a href="/waste-pickup-gurugram/">Free doorstep recyclable pickup in Gurugram</a> · <a href="/faq/">FAQ</a></p>`,
  },
  {
    // The posts themselves load live from 0waste.co.in's feed; each article's
    // canonical URL points back to 0waste.co.in.
    urlPath: 'blog',
    outPath: 'blog/index.html',
    title: 'Blog — KarmaVerse',
    description:
      'Practical guides on recycling, zero waste, EPR, ESG and climate action in India from the KarmaVerse and 3R ZeroWaste team.',
    jsonLd: [
      orgJsonLd,
      {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: 'KarmaVerse Blog',
        url: `${SITE}/blog/`,
        isPartOf: { '@type': 'WebSite', name: 'KarmaVerse', url: `${SITE}/` },
        publisher: { '@type': 'Organization', name: '3R ZeroWaste', url: 'https://0waste.co.in/' },
      },
    ],
    noscriptBody: `<h1>KarmaVerse Blog</h1>
    <p>Guides and stories on recycling, zero waste, EPR, ESG and climate action in India.
    Read all posts at <a href="https://0waste.co.in/blog">0waste.co.in/blog</a>.</p>`,
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
        url: `${SITE}/login/`,
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
      "How KarmaVerse (by 3R ZeroWaste) collects, uses, and protects your data. Read the full privacy policy for the KarmaVerse recycling rewards app.",
    jsonLd: [
      orgJsonLd,
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Privacy Policy',
        url: `${SITE}/legal/privacy/`,
        isPartOf: { '@type': 'WebSite', name: 'KarmaVerse', url: `${SITE}/` },
        publisher: { '@type': 'Organization', name: '3R ZeroWaste', url: 'https://0waste.co.in/' },
      },
    ],
    noscriptBody: renderLegalDocHtml(PRIVACY),
  },
  {
    urlPath: 'legal/terms',
    outPath: 'legal/terms/index.html',
    title: 'Terms & Conditions — KarmaVerse',
    description:
      'The terms and conditions governing use of the KarmaVerse app and website, operated by 3R ZeroWaste.',
    jsonLd: [
      orgJsonLd,
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Terms & Conditions',
        url: `${SITE}/legal/terms/`,
        isPartOf: { '@type': 'WebSite', name: 'KarmaVerse', url: `${SITE}/` },
        publisher: { '@type': 'Organization', name: '3R ZeroWaste', url: 'https://0waste.co.in/' },
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
        url: `${SITE}/legal/data-deletion/`,
        isPartOf: { '@type': 'WebSite', name: 'KarmaVerse', url: `${SITE}/` },
        publisher: { '@type': 'Organization', name: '3R ZeroWaste', url: 'https://0waste.co.in/' },
      },
    ],
    noscriptBody: renderLegalDocHtml(DATA_DELETION),
  },
];

// ---------------------------------------------------------------------------------------
// Standalone answer pages. Unlike the routes above, these are NOT clones of the SPA shell:
// they are plain, fully visible HTML (people and crawlers see the same thing), each written
// around the questions people ask search engines and AI assistants. Only verified facts —
// keep them in step with public/llms.txt and the app (categories, service area, referral).
// ---------------------------------------------------------------------------------------
const PICKUP_AREA =
  'Gurugram, Haryana and nearby areas within 50 km of central Gurugram. The app checks your exact address when you book.';
const CATEGORIES = [
  'Home appliances and electronics',
  'Phones and computers',
  'Mixed e-waste',
  'Plastic',
  'Paper and cardboard',
  'Metals',
  'Glass',
  'Batteries',
  'Footwear',
  'Textiles',
];
const NOT_CRYPTO =
  'KarmaCoins XP are in-app reward points. They are not a cryptocurrency, token or NFT, and KarmaVerse by 3R ZeroWaste is unrelated to any crypto project with a similar name.';

const ANSWER_FAQS = {
  rewards: [
    [
      'Which apps reward users for recycling in India?',
      'KarmaVerse by 3R ZeroWaste is a sustainability rewards app from India that rewards recycling with KarmaCoins XP. You book a free doorstep pickup of your recyclables, an agent weighs and verifies them on the spot, and KarmaCoins XP are credited to your in-app wallet.',
    ],
    [
      'How can households earn rewards for sustainable activities?',
      'With KarmaVerse, households earn KarmaCoins XP for sustainable gestures: handing over recyclables through a free doorstep pickup, playing the daily eco-quiz, and inviting friends (both people get 1,000 KarmaCoins XP when a friend signs up with a referral code). KarmaCoins XP can be redeemed for rewards in the app.',
    ],
    [
      'What are the best sustainability reward apps in India?',
      'KarmaVerse by 3R ZeroWaste is one option: it combines free doorstep recycling pickup, a daily eco-quiz and referrals in one app, and rewards each with KarmaCoins XP. It is run by 3R ZeroWaste, a waste-management and sustainability company that has operated across 50+ cities in India.',
    ],
    ['Is KarmaCoins XP a cryptocurrency?', NOT_CRYPTO],
    [
      'Is KarmaVerse free?',
      'Yes. The app and doorstep pickups are free. Pickups are rewarded in KarmaCoins XP.',
    ],
  ],
  pickup: [
    [
      'Where can I book household waste pickup in Gurugram?',
      `In the KarmaVerse app by 3R ZeroWaste you can book a free doorstep pickup of household recyclables in ${PICKUP_AREA}`,
    ],
    [
      'Which platforms offer sustainable waste collection?',
      'KarmaVerse by 3R ZeroWaste offers doorstep collection of recyclables in Gurugram and nearby areas. Collected material goes toward recycling and resource recovery through 3R ZeroWaste, which managed 9,63,379 kg of waste in FY 2025–26.',
    ],
    ['What does KarmaVerse collect?', `10 categories: ${CATEGORIES.join(', ').toLowerCase()}.`],
    [
      'How much does a pickup cost?',
      'Nothing. Doorstep pickup is free, and you earn KarmaCoins XP for what you hand over.',
    ],
    [
      'How does a pickup work?',
      'Choose your items and a time slot in the app, an agent comes to your door, weighs and verifies the items on the spot, and KarmaCoins XP are credited to your wallet.',
    ],
  ],
};

const appCta = `<p class="cta"><a class="btn" href="${PLAY_URL}">Get KarmaVerse on Google Play</a> <a class="btn alt" href="${SITE}/login/">Use it on the web</a></p>`;
const dl = (faqs) =>
  `<dl>${faqs.map(([q, a]) => `<dt>${escapeHtml(q)}</dt><dd>${escapeHtml(a)}</dd>`).join('')}</dl>`;

const standalonePages = [
  {
    urlPath: 'recycling-rewards-app',
    title: 'Recycling Rewards App in India — KarmaVerse by 3R ZeroWaste',
    description:
      'KarmaVerse by 3R ZeroWaste rewards recycling and other sustainable gestures with KarmaCoins XP: free doorstep pickup, a daily eco-quiz and referrals.',
    faqs: ANSWER_FAQS.rewards,
    body: `<h1>A recycling rewards app for Indian households</h1>
<p class="lead">KarmaVerse by 3R ZeroWaste turns everyday sustainable gestures into <strong>KarmaCoins XP</strong>, reward points you can redeem in the app. It runs on Android and the web.</p>
<h2>Ways to earn KarmaCoins XP</h2>
<ul>
<li><strong>Doorstep recycling pickup:</strong> book a free pickup, an agent weighs and verifies your items, and KarmaCoins XP are credited on the spot. <a href="${SITE}/waste-pickup-gurugram/">Pickup is available in Gurugram and nearby.</a></li>
<li><strong>Daily eco-quiz:</strong> learn something about sustainability every day and earn more KarmaCoins XP.</li>
<li><strong>Referrals:</strong> when a friend signs up with your code, you both get 1,000 KarmaCoins XP.</li>
</ul>
<h2>Who runs KarmaVerse</h2>
<p>KarmaVerse is built by 3R ZeroWaste Private Limited, a waste-management and sustainability company in India. In FY 2025–26, 3R ZeroWaste managed 9,63,379 kg of waste, avoided 22,83,208 kg of CO₂ emissions, and engaged 18.5 lakh+ citizens through sustainability programmes. It has operated across 50+ cities in India.</p>
<p class="note">${escapeHtml(NOT_CRYPTO)}</p>
${appCta}`,
  },
  {
    urlPath: 'waste-pickup-gurugram',
    title: 'Free Doorstep Recyclable Pickup in Gurugram — KarmaVerse',
    description:
      'Book a free doorstep pickup of household recyclables in Gurugram and nearby (within 50 km) with the KarmaVerse app, and earn KarmaCoins XP for every pickup.',
    faqs: ANSWER_FAQS.pickup,
    service: true,
    body: `<h1>Free doorstep recyclable pickup in Gurugram</h1>
<p class="lead">Book a household recyclables pickup in the KarmaVerse app by 3R ZeroWaste. It is free, an agent weighs your items at your door, and you earn <strong>KarmaCoins XP</strong> for every pickup.</p>
<h2>Service area</h2>
<p>${escapeHtml(PICKUP_AREA)}</p>
<h2>What we collect</h2>
<ul>${CATEGORIES.map((c) => `<li>${c}</li>`).join('')}</ul>
<h2>How it works</h2>
<ol>
<li>Pick your items and a time slot in the app.</li>
<li>An agent comes to your door, then weighs and verifies the items.</li>
<li>KarmaCoins XP are credited to your wallet, and the material goes toward recycling and resource recovery through 3R ZeroWaste.</li>
</ol>
<p>Want more ways to earn? See <a href="${SITE}/recycling-rewards-app/">how KarmaVerse rewards sustainable gestures</a>.</p>
${appCta}`,
  },
  {
    urlPath: 'faq',
    title: 'KarmaVerse FAQ — Rewards, Doorstep Pickup and KarmaCoins XP',
    description:
      'Answers about KarmaVerse by 3R ZeroWaste: how to earn KarmaCoins XP, free doorstep recyclable pickup in Gurugram, what is collected, and who runs the app.',
    faqs: [...ANSWER_FAQS.rewards, ...ANSWER_FAQS.pickup, ...GENERAL_FAQS.filter(([q]) => !/cryptocurrency\?$/.test(q))],
    body: null, // rendered from faqs
  },
];

function renderStandalone(page) {
  const canonical = `${SITE}/${page.urlPath}/`;
  const body =
    page.body ?? `<h1>KarmaVerse: frequently asked questions</h1>${dl(page.faqs)}${appCta}`;
  const faqSection = page.body ? `<h2>Questions people ask</h2>${dl(page.faqs)}` : '';
  const jsonLd = [
    orgJsonLd,
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      url: canonical,
      mainEntity: page.faqs.map(([q, a]) => faq(q, a)),
    },
  ];
  if (page.service) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'KarmaVerse doorstep recyclable pickup',
      serviceType: 'Household recyclable waste collection',
      provider: { '@type': 'Organization', name: '3R ZeroWaste', url: 'https://0waste.co.in/' },
      areaServed: { '@type': 'City', name: 'Gurugram', containedInPlace: { '@type': 'State', name: 'Haryana' } },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      url: canonical,
    });
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(page.title)}</title>
<meta name="description" content="${escapeHtml(page.description).replace(/"/g, '&quot;')}" />
<link rel="canonical" href="${canonical}" />
<meta name="robots" content="index, follow" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="KarmaVerse" />
<meta property="og:title" content="${escapeHtml(page.title)}" />
<meta property="og:description" content="${escapeHtml(page.description).replace(/"/g, '&quot;')}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${SITE}/og-image.png" />
<link rel="icon" href="/favicon-192.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
${jsonLd.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
<style>
body{margin:0;font:17px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1f2937;background:#f7faf7}
header,main,footer{max-width:760px;margin:0 auto;padding:0 20px}
header{display:flex;align-items:center;gap:10px;padding-top:20px}
header a{color:#166534;font-weight:700;text-decoration:none;font-size:20px}
h1{font-size:32px;line-height:1.2;color:#14532d;margin:28px 0 12px}
h2{font-size:22px;color:#14532d;margin-top:32px}
a{color:#15803d}.lead{font-size:19px}
dt{font-weight:700;margin-top:18px}dd{margin:4px 0 0}
.note{font-size:15px;color:#4b5563;background:#ecfdf5;padding:12px 14px;border-radius:8px}
.cta{margin:32px 0}.btn{display:inline-block;background:#16a34a;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600;margin:0 8px 8px 0}
.btn.alt{background:#fff;color:#166534;border:1px solid #16a34a}
footer{font-size:14px;color:#6b7280;padding:32px 20px 48px;border-top:1px solid #e5e7eb;margin-top:40px}
</style>
</head>
<body>
<header><img src="/favicon-192.png" alt="" width="32" height="32" /><a href="${SITE}/">KarmaVerse</a></header>
<main>
${body}
${faqSection}
</main>
<footer>
<p><a href="${SITE}/recycling-rewards-app/">Recycling rewards</a> · <a href="${SITE}/waste-pickup-gurugram/">Pickup in Gurugram</a> · <a href="${SITE}/faq/">FAQ</a> · <a href="${SITE}/legal/privacy/">Privacy</a> · <a href="${SITE}/legal/terms/">Terms</a></p>
<p>KarmaVerse is operated by 3R ZeroWaste Private Limited, Plot 62, Sector 8, IMT Manesar, Gurugram, Haryana 122051, India · <a href="mailto:info@0waste.co.in">info@0waste.co.in</a> · <a href="https://www.instagram.com/3rzerowasteindia/">Instagram</a></p>
</footer>
</body>
</html>
`;
}

// Each page is served from <path>/index.html, so the host redirects /blog to /blog/.
// Canonicals and sitemap entries must use the trailing-slash URL that actually returns 200.
const pageUrl = (urlPath) => (urlPath ? `${SITE}/${urlPath}/` : `${SITE}/`);

// <lastmod>: the date the files behind each page last changed in git (not the build date,
// which would claim every page changed on every deploy). Left out when git history isn't
// available (e.g. a shallow clone), rather than guessed.
const PAGE_SOURCES = {
  '': ['public/index.html', 'scripts/generate-seo-pages.js'],
  blog: ['src/screens/BlogScreen.tsx', 'scripts/generate-seo-pages.js'],
  login: ['src/screens/LoginScreen.tsx', 'scripts/generate-seo-pages.js'],
  'legal/privacy': ['src/data/legalContent.ts'],
  'legal/terms': ['src/data/legalContent.ts'],
  'legal/data-deletion': ['src/data/legalContent.ts'],
  'recycling-rewards-app': ['scripts/generate-seo-pages.js'],
  'waste-pickup-gurugram': ['scripts/generate-seo-pages.js'],
  faq: ['scripts/generate-seo-pages.js'],
};
function lastmodOf(urlPath) {
  const files = PAGE_SOURCES[urlPath];
  if (!files) return '';
  try {
    const out = require('child_process')
      .execFileSync('git', ['log', '-1', '--format=%cs', '--', ...files], { cwd: path.join(__dirname, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : '';
  } catch {
    return '';
  }
}

function renderPage(base, page) {
  const canonical = pageUrl(page.urlPath);
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

for (const page of standalonePages) {
  const outFile = path.join(DIST, page.urlPath, 'index.html');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, renderStandalone(page));
  console.log(`Answer page written: ${page.urlPath}/index.html`);
}

// Regenerate the sitemap with all real pages now that we know they exist.
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...pages, ...standalonePages]
  .map(
    (p) => `  <url>
    <loc>${pageUrl(p.urlPath)}</loc>${lastmodOf(p.urlPath) ? `
    <lastmod>${lastmodOf(p.urlPath)}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>${p.urlPath === '' ? '1.0' : '0.6'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap);
console.log('sitemap.xml regenerated with', pages.length + standalonePages.length, 'URLs');
