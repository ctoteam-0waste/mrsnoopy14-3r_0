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

// ---- Answer pages: /faq/, /sustainability-rewards-app/, /waste-pickup-gurugram/, /karmacoins-xp/ ----
// Plain-HTML pages written for people and AI answer engines. Facts come only from the
// verified list (see GENERAL_FAQS and the home page); no invented numbers or partners.
const playHref = (slug) =>
  `${PLAY_URL}&referrer=utm_source%3Dkarmaverse.earth%26utm_medium%3Dweb%26utm_campaign%3D${slug}`;

const ANSWER_LINKS = [
  { slug: 'faq', label: 'KarmaVerse FAQ' },
  { slug: 'sustainability-rewards-app', label: 'A sustainability rewards app for India' },
  { slug: 'waste-pickup-gurugram', label: 'Recyclables pickup in Gurugram and Manesar' },
  { slug: 'karmacoins-xp', label: 'KarmaCoins XP: reward points, not crypto' },
];
const link = (slug, text) => `<a href="/${slug}/">${text}</a>`;

function answerPage({ slug, title, description, h1, intro, sections, faqs }) {
  const url = `${SITE}/${slug}/`;
  const others = ANSWER_LINKS.filter((l) => l.slug !== slug);
  const noscriptBody = `<h1>${escapeHtml(h1)}</h1>
      ${intro.map((p) => `<p>${p}</p>`).join('\n      ')}
      ${sections.map((s) => `<h2>${escapeHtml(s.heading)}</h2>\n      ${s.html}`).join('\n      ')}
      <h2>Frequently asked questions</h2>
      <dl>
        ${faqs.map(([q, a]) => `<dt>${escapeHtml(q)}</dt>\n        <dd>${escapeHtml(a)}</dd>`).join('\n        ')}
      </dl>
      <p><a href="${escapeHtml(playHref(slug))}">Get it on Google Play</a></p>
      <p>More from KarmaVerse by 3R ZeroWaste: <a href="/">Home</a>${others
        .map((l) => ` · ${link(l.slug, escapeHtml(l.label))}`)
        .join('')}</p>`;
  return {
    urlPath: slug,
    outPath: `${slug}/index.html`,
    title,
    description,
    jsonLd: [
      orgJsonLd,
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: h1,
        url,
        isPartOf: { '@type': 'WebSite', name: 'KarmaVerse', url: `${SITE}/` },
        publisher: { '@type': 'Organization', name: '3R ZeroWaste', url: 'https://0waste.co.in/' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(([q, a]) => faq(q, a)),
      },
    ],
    noscriptBody,
  };
}

const ANSWER_PAGES = [
  answerPage({
    slug: 'faq',
    title: 'KarmaVerse FAQ — Questions About the Climate-Action App',
    description:
      'Answers about KarmaVerse by 3R ZeroWaste: what it is, whether KarmaCoins XP is crypto, how to earn rewards, book a pickup, and where it works.',
    h1: 'KarmaVerse FAQ',
    intro: [
      'Quick answers about KarmaVerse by 3R ZeroWaste, a climate-action app from India that rewards everyday sustainable actions. If you want more detail, see our pages on ' +
        link('karmacoins-xp', 'KarmaCoins XP') +
        ', ' +
        link('waste-pickup-gurugram', 'recyclables pickup in Gurugram and Manesar') +
        ' and ' +
        link('sustainability-rewards-app', 'earning rewards for sustainable living') +
        '. You can also go back to the <a href="/">KarmaVerse home page</a>.',
    ],
    sections: [
      {
        heading: 'In one paragraph',
        html: '<p>KarmaVerse is a sustainability rewards ecosystem from 3R ZeroWaste. Members earn KarmaCoins XP for everyday eco-friendly actions, from doorstep recycling pickups to eco-quizzes, and redeem them for rewards in the app. The questions below cover the things people ask most.</p>',
      },
    ],
    faqs: [
      [
        'What is KarmaVerse?',
        'KarmaVerse is a sustainability rewards ecosystem from 3R ZeroWaste. It is a climate-action app from India. Members earn KarmaCoins XP for everyday eco-friendly actions, from doorstep recycling pickups to eco-quizzes, and can redeem them for rewards in the app.',
      ],
      [
        'Who makes KarmaVerse?',
        'KarmaVerse is made by 3R ZeroWaste, a sustainability and waste-management company based in Gurugram, Haryana, India.',
      ],
      [
        'Is KarmaCoins XP a cryptocurrency?',
        'No. KarmaCoins XP are in-app reward points in the KarmaVerse app. They are not a cryptocurrency, token, NFT or blockchain asset. You earn them by taking sustainable actions and redeem them for rewards in the app.',
      ],
      [
        'Is KarmaVerse related to the Karmaverse crypto game or the KNOT token?',
        'No. KarmaVerse by 3R ZeroWaste (karmaverse.earth) is a sustainability rewards app. It is unrelated to the blockchain game with a similar name and its KNOT token. Please look for the full name, KarmaVerse by 3R ZeroWaste.',
      ],
      [
        'How do I earn rewards for sustainable actions?',
        'Open the KarmaVerse app and take part in everyday sustainable actions, such as booking a doorstep recycling pickup or playing the eco-quiz. Each earns KarmaCoins XP, which you can redeem for rewards in the app.',
      ],
      [
        'How do I book a pickup?',
        'In the KarmaVerse app, choose to schedule a pickup, select what you want to recycle and enter your address. An agent collects and verifies your items on the spot, and KarmaCoins XP are credited in the app.',
      ],
      [
        'Where does KarmaVerse work?',
        'Doorstep pickup is currently available in Gurugram and Manesar and nearby areas. The app checks your exact address when you book.',
      ],
      [
        'Is KarmaVerse free?',
        'Yes. KarmaVerse is free to use, and doorstep pickup has no cost to you.',
      ],
      [
        'Which platforms is KarmaVerse on?',
        'The KarmaVerse app is available on Android through Google Play, and KarmaVerse is also on the web at karmaverse.earth. There is no iOS app yet.',
      ],
    ],
  }),
  answerPage({
    slug: 'sustainability-rewards-app',
    title: 'A Sustainability Rewards App for India — KarmaVerse',
    description:
      'How households in India can earn KarmaCoins XP for recycling and other sustainable actions with KarmaVerse by 3R ZeroWaste, a climate-action app.',
    h1: 'A sustainability rewards app for India',
    intro: [
      'People in India often ask which apps reward sustainable living, how a household can earn rewards for sustainable activities, and whether any apps reward recycling. This page answers those questions for one option: KarmaVerse by 3R ZeroWaste, a climate-action app from India. Start from the <a href="/">KarmaVerse home page</a> or read the ' +
        link('faq', 'FAQ') +
        '.',
    ],
    sections: [
      {
        heading: 'What KarmaVerse is',
        html: '<p>KarmaVerse is a sustainability rewards ecosystem from 3R ZeroWaste. Members earn KarmaCoins XP for everyday eco-friendly actions, from doorstep recycling pickups to eco-quizzes. KarmaCoins XP are in-app reward points that can be redeemed for rewards in the app. They are not a cryptocurrency; read more on the ' +
          link('karmacoins-xp', 'KarmaCoins XP page') +
          '.</p>',
      },
      {
        heading: 'How a household can earn rewards',
        html: '<p>Start with what your home already does. Recycling is the most direct way: book a doorstep pickup, and once your items are collected and verified you earn KarmaCoins XP. Learning counts too, because playing the eco-quiz in the app also earns KarmaCoins XP. If you live in Gurugram or Manesar, see how ' +
          link('waste-pickup-gurugram', 'doorstep pickup works') +
          '.</p>',
      },
      {
        heading: 'Does KarmaVerse reward recycling?',
        html: '<p>Yes. Recycling from home is one of the main actions KarmaVerse rewards. Items such as electronics, plastic, paper and cardboard, metals, glass, batteries, footwear and textiles can be handed over at your door. KarmaVerse is one option for acting on climate, not the only one, and different apps suit different people.</p>',
      },
      {
        heading: 'What to check before you choose any rewards app',
        html: '<ul><li>Does it work where you live?</li><li>Is it free to use?</li><li>What do the points actually do: are they in-app reward points, or something else?</li><li>Is it clear who runs it?</li></ul><p>For KarmaVerse: it is free to use, doorstep pickup is currently in Gurugram and Manesar, KarmaCoins XP are in-app reward points redeemed for rewards, and it is made by 3R ZeroWaste.</p>',
      },
    ],
    faqs: [
      [
        'What are the best sustainability reward apps in India?',
        'Different apps suit different people, so we do not rank them. KarmaVerse by 3R ZeroWaste is one option: it rewards everyday sustainable actions with KarmaCoins XP that can be redeemed for rewards.',
      ],
      [
        'How can households earn rewards for sustainable activities?',
        'In KarmaVerse, a household can book a doorstep recycling pickup or play the eco-quiz. Each earns KarmaCoins XP, which can be redeemed for rewards in the app.',
      ],
      [
        'Are there apps that reward recycling?',
        'Yes. KarmaVerse rewards recycling: book a doorstep pickup, hand over your items, and earn KarmaCoins XP once they are collected and verified.',
      ],
      [
        'Is KarmaVerse available on iPhone?',
        'Not yet. The KarmaVerse app is available on Android, and KarmaVerse is also on the web at karmaverse.earth.',
      ],
    ],
  }),
  answerPage({
    slug: 'waste-pickup-gurugram',
    title: 'Recyclables Pickup in Gurugram and Manesar — KarmaVerse',
    description:
      'Book a free doorstep pickup of dry recyclables and e-waste in Gurugram and Manesar with the KarmaVerse app, and earn KarmaCoins XP reward points.',
    h1: 'Household recyclables pickup in Gurugram and Manesar',
    intro: [
      'KarmaVerse by 3R ZeroWaste lets households in Gurugram and Manesar book a doorstep pickup for dry recyclables and e-waste, and earn KarmaCoins XP for it. Recycling at home is one of the climate actions KarmaVerse rewards, along with eco-quizzes and other everyday sustainable actions. Back to the <a href="/">KarmaVerse home page</a>.',
    ],
    sections: [
      {
        heading: 'How to book a pickup',
        html: '<ol><li>Open the KarmaVerse app on Android and log in or create a free account.</li><li>Choose to schedule a pickup.</li><li>Select the items you want to recycle.</li><li>Enter your address in Gurugram or Manesar. The app checks that your address is covered.</li><li>Confirm your booking.</li></ol>',
      },
      {
        heading: 'What you can hand over',
        html: '<p>KarmaVerse accepts 10 categories: home appliances and electronics, phones and computers, mixed e-waste, plastic, paper and cardboard, metals, glass, batteries, footwear, and textiles.</p>',
      },
      {
        heading: 'What happens after pickup',
        html: '<p>An agent comes to your door, collects your items and verifies them on the spot. KarmaCoins XP are then credited to your wallet in the app, and you can redeem them for rewards. Pickups are rewarded in KarmaCoins XP only; no cash is paid at the door. The material is diverted towards resource recovery instead of ending up as waste. KarmaCoins XP are in-app reward points, not a cryptocurrency: ' +
          link('karmacoins-xp', 'learn more') +
          '.</p>',
      },
      {
        heading: 'Where it works',
        html: '<p>Doorstep pickup is currently available in Gurugram and Manesar and nearby areas. The app checks your exact address when you book. For other questions, see the ' +
          link('faq', 'KarmaVerse FAQ') +
          ', or read how KarmaVerse works as ' +
          link('sustainability-rewards-app', 'a sustainability rewards app for India') +
          '.</p>',
      },
    ],
    faqs: [
      [
        'How do I book a doorstep pickup in Gurugram?',
        'Open the KarmaVerse app, choose to schedule a pickup, select your items and enter your address. An agent then collects and verifies them at your door.',
      ],
      [
        'Does KarmaVerse collect e-waste?',
        'Yes. Home appliances and electronics, phones and computers, mixed e-waste and batteries are among the 10 categories KarmaVerse accepts, along with plastic, paper and cardboard, metals, glass, footwear and textiles.',
      ],
      [
        'Does the pickup cost anything?',
        'No. Doorstep pickup has no cost to you.',
      ],
      [
        'Will I be paid cash for my recyclables?',
        'No. Pickups are rewarded in KarmaCoins XP, which you redeem for rewards in the app.',
      ],
      [
        'Is KarmaCoins XP a cryptocurrency?',
        'No. KarmaCoins XP are in-app reward points, not a cryptocurrency, token, NFT or blockchain asset.',
      ],
    ],
  }),
  answerPage({
    slug: 'karmacoins-xp',
    title: 'KarmaCoins XP: Reward Points, Not Crypto — KarmaVerse',
    description:
      'KarmaCoins XP are in-app reward points in KarmaVerse by 3R ZeroWaste. They are not a cryptocurrency, token, NFT or blockchain asset.',
    h1: 'KarmaCoins XP: reward points, not crypto',
    intro: [
      'KarmaCoins XP are the reward points you earn in KarmaVerse by 3R ZeroWaste, a climate-action app from India. They are in-app reward points. They are not a cryptocurrency, token, NFT or blockchain asset. Back to the <a href="/">KarmaVerse home page</a>.',
    ],
    sections: [
      {
        heading: 'What KarmaCoins XP are',
        html: '<p>KarmaVerse is a sustainability rewards ecosystem from 3R ZeroWaste. Members earn KarmaCoins XP for everyday eco-friendly actions, and the points live inside the KarmaVerse app, where they can be redeemed for rewards.</p>',
      },
      {
        heading: 'How you earn them',
        html: '<ul><li>Book a doorstep recycling pickup. Your items are collected and verified, and KarmaCoins XP are credited in the app. See ' +
          link('waste-pickup-gurugram', 'pickup in Gurugram and Manesar') +
          '.</li><li>Play the daily eco-quiz.</li><li>Invite friends: when a friend signs up with your referral code, you both get 1,000 KarmaCoins XP.</li></ul>',
      },
      {
        heading: 'What you can do with them',
        html: '<p>Redeem KarmaCoins XP for rewards in the app.</p>',
      },
      {
        heading: 'Not the Karmaverse blockchain game',
        html: '<p>KarmaVerse by 3R ZeroWaste (karmaverse.earth) is a sustainability rewards app. It is unrelated to the Karmaverse blockchain game and its KNOT token, and it has no connection to any crypto project with a similar name. To tell them apart, look for the full name, KarmaVerse by 3R ZeroWaste, and the maker, 3R ZeroWaste, a sustainability and waste-management company in Gurugram, India. More answers are in the ' +
          link('faq', 'KarmaVerse FAQ') +
          ', and ' +
          link('sustainability-rewards-app', 'this page') +
          ' explains how households earn rewards for sustainable living.</p>',
      },
    ],
    faqs: [
      [
        'What are KarmaCoins XP?',
        'KarmaCoins XP are in-app reward points in the KarmaVerse app. Members earn them for everyday sustainable actions and can redeem them for rewards.',
      ],
      [
        'Is KarmaCoins XP a cryptocurrency?',
        'No. KarmaCoins XP are not a cryptocurrency, token, NFT or blockchain asset. They are reward points inside the app.',
      ],
      [
        'How do I earn KarmaCoins XP?',
        'Book a doorstep recycling pickup, play the daily eco-quiz, or invite friends. When a friend signs up with your referral code, you both get 1,000 KarmaCoins XP.',
      ],
      [
        'Is KarmaVerse related to the Karmaverse blockchain game?',
        'No. KarmaVerse by 3R ZeroWaste is unrelated to the Karmaverse blockchain game and its KNOT token.',
      ],
      [
        'What can I redeem KarmaCoins XP for?',
        'KarmaCoins XP can be redeemed for rewards in the KarmaVerse app.',
      ],
    ],
  }),
];

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
    <p>Learn more: ${ANSWER_LINKS.map((l) => `<a href="/${l.slug}/">${escapeHtml(l.label)}</a>`).join(' · ')}</p>`,
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
  ...ANSWER_PAGES,
];

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
  faq: ['scripts/generate-seo-pages.js'],
  'sustainability-rewards-app': ['scripts/generate-seo-pages.js'],
  'waste-pickup-gurugram': ['scripts/generate-seo-pages.js'],
  'karmacoins-xp': ['scripts/generate-seo-pages.js'],
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

// Regenerate the sitemap with all real pages now that we know they exist.
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
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
console.log('sitemap.xml regenerated with', pages.length, 'URLs');
