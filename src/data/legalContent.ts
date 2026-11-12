// Legal content for KarmaVer$e. Edit the copy here — the LegalScreen renders it,
// and the website serves it at /legal/:type (terms | privacy | terms-of-use | data-deletion).
// Source of truth: 3R ZeroWaste legal documentation —
//   Terms & Conditions v2.0, Privacy Policy v2.0, Terms of Use v1.0 (August 2026).
// Placeholders in the source docs (officer names, effective date, business hours) are
// shown here as role + contact; fill the names/date/hours before publishing.

export interface LegalSection {
  heading: string;
  body?: string[];    // paragraphs
  bullets?: string[]; // bullet points
}

export interface LegalDoc {
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
  closing?: string;
}

export const TERMS: LegalDoc = {
  title: 'Terms & conditions',
  updated: '2 September 2026',
  intro:
    `KarmaVer$e is operated by 3R ZeroWaste Private Limited (CIN U37200UP2020PTC131568) ("Company", "we", "us", "our"), with its registered office at 1/12 Pal Road, Shipra Suncity, Indirapuram, Ghaziabad, Uttar Pradesh 201010, and its operating office at Plot 62, Sector 8, IMT Manesar, Gurugram, Haryana 122051. These Terms & Conditions ("Terms") govern your access to and use of the KarmaVer$e app, website, and related services (the "Service"). Our Privacy Policy is incorporated by reference and forms part of your agreement with us. By creating an account, scheduling a pickup, or otherwise using the Service, you confirm that you have read and accepted these Terms. If you do not accept them, you must not use the Service.`,
  sections: [
    {
      heading: 'At a glance',
      body: ['This summary is for convenience only. It is not part of the agreement and does not override the full Terms below.'],
      bullets: [
        'What we do — we collect segregated recyclable waste from your address, free of charge, in areas we currently serve.',
        'What you get — KarmaCoins XP, loyalty reward points. They are not money and not a payment instrument.',
        'Welcome bonus — 500 KarmaCoins XP once, when you sign up (Early Bird offer, while it runs). It redeems at the same rate and from the same date as quiz and referral coins.',
        'No cash at pickup — Agents do not pay cash for your material. Every Pickup is rewarded only in KarmaCoins XP, which you can later redeem in the app.',
        'Where we operate — Gurugram, Haryana and nearby areas within 50 km of central Gurugram, at present. The app checks your exact address when you book; bookings outside a live service area cannot be accepted.',
        'Cashing out — redemption opens on the dates in the KarmaCoins XP section. Payouts run through RazorpayX and require KYC.',
        'Rate for quiz, referral & welcome bonus coins — depends on your unbroken verified-pickup streak at the moment you redeem.',
        'Rate for pickup coins — always the best rate: 10 coins = ₹1. Your streak does not affect it.',
        'Age — you must be 18 or older to use KarmaVerse.',
        'Complaints — in-app "Need help?" first, then our Grievance Officer. Escalation rights are preserved.',
      ],
    },
    {
      heading: 'Definitions',
      bullets: [
        'Agent — an independent pickup partner engaged and verified by the Company to collect, weigh, and verify recyclable waste. Agents are not employees of the Company.',
        'KarmaCoins XP — loyalty reward points issued by the Company. They can be sent to another registered User only through the in-app "Send coins" feature (the Transfer button in your Wallet) and are otherwise non-transferable. A promotional benefit; not currency, not a security, and not a prepaid payment instrument.',
        'Payment Partner — RazorpayX, or any successor payment service provider engaged to disburse redemption payouts.',
        'Pickup — a scheduled collection of segregated recyclable waste from a Pickup Address by an Agent.',
        'Pickup Address — the address and coordinates you select or confirm in the app for a given Pickup.',
        'Service Area — a geographic boundary within which Pickups are currently offered.',
        'Serviceability Check — the automated validation that determines whether a Pickup Address falls within an active Service Area.',
        'Streak — your run of consecutive days on which a Pickup was completed and verified.',
        'Wallet — the in-app record of your KarmaCoins XP balance and transaction history.',
      ],
    },
    {
      heading: 'Eligibility',
      bullets: [
        'You must be 18 years of age or older to register for, hold an account on, or use the Service. You confirm this when you sign up.',
        'We do not knowingly permit anyone under 18 to register. If we learn that an account belongs to someone under 18, we will close it and delete its personal data, except where the law requires us to keep it.',
        'You must be competent to contract under the Indian Contract Act, 1872.',
        'You must provide accurate, complete, and current registration information and keep it updated.',
        'The Service is offered for use in India; Pickups are further limited to active Service Areas. Registration does not by itself entitle you to a Pickup.',
      ],
    },
    {
      heading: 'Account registration and security',
      bullets: [
        'Register using a valid email address and mobile number, or by signing in with your Google, Facebook, or Apple account.',
        'One account per person. Duplicate, automated, or fraudulently created accounts may be suspended or terminated and any associated KarmaCoins XP forfeited.',
        'You are responsible for keeping your credentials, device, and registered mobile number secure, and for all activity under your account.',
        'Notify us promptly through in-app support if you believe your account has been accessed without authorisation. Until you do, activity under your account is treated as yours.',
        'We may require verification of your mobile number, email, or identity before enabling certain features, including redemption payouts.',
        'Optional profile questions — age, gender, marital status, and employment — are never required to book a Pickup or earn coins, and you can leave them blank. We do not ask about your sexual orientation.',
      ],
    },
    {
      heading: 'Service areas and pickup serviceability',
      body: [
        'Pickups are currently available only within our active Service Area: Gurugram, Haryana and nearby areas within 50 km of central Gurugram (see Active service areas below). If your Pickup Address falls outside an active Service Area, the app will not permit a booking. This is an operational limit, not a fault in the app.',
        'When you schedule a Pickup you select or confirm a Pickup Address; we derive its coordinates, locality, city, state, and PIN code and run a Serviceability Check against our active Service Areas. If the address is inside an active area you may choose a slot; if not, you cannot complete the booking there.',
      ],
      bullets: [
        'We will not change your address for you, and we will never silently substitute a different, serviceable address for the one you selected.',
        'We will not confirm a booking we cannot verify. Where serviceability cannot be reliably established, we decline to create the booking rather than accept one we may be unable to fulfil.',
        'Time slots are shown only after your Pickup Address passes the Serviceability Check.',
        'The check is enforced on our servers, independently of the app. Attempting to bypass it by modifying, replaying, or forging a request is a breach and may result in termination.',
        'Service Areas may be added, reduced, suspended, or withdrawn at any time. Coverage within an area may be partial. Where an area is withdrawn and you hold a confirmed future booking, we will notify you and cancel or reschedule it, without affecting coins already credited.',
        'We request device location only to find or confirm a Pickup Address and run the check. We do not collect background location. If you decline location access, you can still search and confirm an address manually.',
      ],
    },
    {
      heading: 'Services we provide',
      bullets: [
        'Waste pickup scheduling — free collection of segregated plastic, paper, metal, glass, e-waste, textile, organic, and declared hazardous household materials, within active Service Areas.',
        'KarmaCoins XP rewards — reward points credited on the type and Agent-verified weight of material collected.',
        'Daily eco-quiz — a daily quiz through which additional KarmaCoins XP may be earned.',
        'Referral programme — bonus KarmaCoins XP for introducing new Users.',
        'Redemption — the ability to redeem KarmaCoins XP for rewards, eco-friendly products, donations, or a cash payout through our Payment Partner, subject to the timelines below.',
        'We may add, modify, suspend, or withdraw any part of the Service. Where a change materially reduces a benefit you have already earned, we will give reasonable prior notice.',
      ],
    },
    {
      heading: 'Pickup terms',
      bullets: [
        'A booking is confirmed only when a Pickup ID is generated and shown to you. We may cancel, reschedule, or decline a Pickup for operational, weather, safety, regulatory, or capacity reasons, and will notify you.',
        'Ensure the waste is properly segregated, dry where applicable, safely packed, and accessible at the scheduled address and time.',
        'Someone aged 18 or over should be present to hand over the material. If nobody is available, the Pickup may be recorded as missed. Repeated late cancellations or missed Pickups may lead to booking restrictions.',
        'The Agent verifies the category and weighs the material at collection. Final KarmaCoins XP are based on that verification, not on your estimate. Dispute a verification through in-app support within 7 days.',
        'By handing over material you confirm it is lawfully yours to dispose of, and title passes to the Company or its recycling partner on collection.',
        'Check for personal belongings, documents, storage media, and valuables before handing over. We cannot return items once collected. For e-waste, wipe or remove data-bearing storage before handover.',
      ],
    },
    {
      heading: 'Waste categories and prohibited items',
      body: [
        'Hazardous household waste and e-waste must be declared at booking. Undeclared hazardous material may result in refusal, cancellation, and suspension. E-waste and hazardous waste are collected only where the required authorisations are held, so availability may vary by area and over time.',
      ],
      bullets: [
        'Do not present: medical, biomedical, clinical, or sanitary waste, including sharps and used PPE.',
        'Do not present: explosives, ammunition, fireworks, compressed gas cylinders, or pressurised containers.',
        'Do not present: radioactive material; flammable liquids, fuels, solvents, or unlabelled chemicals.',
        'Do not present: asbestos or construction and demolition debris.',
        'Do not present: animal remains, decomposing food waste presenting a health risk, or human waste.',
        'Do not present: anything whose possession, transfer, or disposal is restricted under law, or stolen goods.',
        'Presenting prohibited items may result in refusal, suspension, forfeiture of KarmaCoins XP, recovery of costs, and reporting to authorities.',
      ],
    },
    {
      heading: 'KarmaCoins XP',
      body: [
        'KarmaCoins XP are loyalty reward points issued as a promotional benefit. They are not legal tender, e-money, a prepaid payment instrument, a security, or a virtual digital asset. You cannot buy them, sell them, transfer them outside the app, or hold them as a store of value. Any cash payout is a discretionary promotional disbursement, not the redemption of stored value.',
      ],
      bullets: [
        'Earning — coins are credited on the category and Agent-verified weight of material collected, and for the daily quiz or qualifying referrals. Rates are set by the Company and may change prospectively. Pickups are rewarded only in KarmaCoins XP — Agents do not pay cash at the doorstep.',
        'Welcome bonus — each new User receives a one-time Early Bird welcome bonus of 500 KarmaCoins XP, credited to the Wallet on sign-up. It is given once per person: accounts created again after deletion, duplicate accounts, and accounts we close for fraud or abuse are not eligible, and the bonus may be reversed. Welcome bonus coins are reward coins: like quiz and referral coins, they redeem only from the date and at the Streak-based rate set out below. The Early Bird offer is promotional; we may change its amount or end it for new sign-ups at any time, without affecting bonuses already credited.',
        'Sending coins — you may send KarmaCoins XP to another registered User, identified by their mobile number, through the in-app "Send coins" feature (the Transfer button in your Wallet). The recipient’s name is shown before you confirm. Pickup coins move one-for-one. Quiz, referral and welcome bonus coins move at their ₹ value, so the number the recipient receives can differ from the number you send, depending on each side’s Streak rate; the exact amounts are shown before you confirm. Buying or selling coins for money, inside or outside the app, is not permitted, and we may reverse transfers made in error or through fraud or abuse.',
        'Adjustment — we may adjust, reverse, or revoke coins credited in error or through fraud, abuse, manipulation, system fault, or breach, and will notify you of the reason.',
        'Expiry — coins may carry an expiry period notified in the app; at least 30 days’ notice is given before an expiry is introduced or shortened for coins already in your Wallet.',
        'Redemption is enabled in stages — Pickup coins after 30 September 2026 (subject to verification); Quiz coins after 31 December 2026; Referral coins and Welcome bonus coins after 31 December 2026 (subject to anti-abuse rules).',
        'Payouts run through RazorpayX, subject to its terms, KYC, and RBI regulations. You may need to provide bank/UPI details and identity documents. You are responsible for any tax on amounts you receive. A minimum balance or payout amount may apply and is shown before you confirm.',
      ],
    },
    {
      heading: 'Redemption rate for pickup coins',
      body: [
        'KarmaCoins XP earned from a verified Pickup always redeem at the best available rate of 10 coins = ₹1, regardless of your Streak. Your daily activity does not change the value of coins you earned by recycling.',
      ],
    },
    {
      heading: 'Streak-based rate for quiz, referral & welcome bonus coins',
      body: [
        'Coins earned through the daily eco-quiz, the referral programme, or the welcome bonus redeem at a rate set by your unbroken daily Streak of verified Pickups, read at the moment you redeem. This rewards consistent, genuine recycling and prevents one-time or bulk sign-ups being cashed out at the best rate on day one.',
      ],
      bullets: [
        'Seedling · Bronze · Day 1–2 · 100 coins = ₹1 · 1×',
        'Sapling · Silver · Day 3–6 · 75 coins = ₹1 · 1.3×',
        'Grove · Gold · Day 7–13 · 50 coins = ₹1 · 2×',
        'Woodland · Platinum · Day 14–20 · 30 coins = ₹1 · 3.3×',
        'Forest · Diamond · Day 21–29 · 20 coins = ₹1 · 5×',
        'Evergreen · Royal · Day 30+ · 10 coins = ₹1 · 10× (best rate)',
        'Each day with a verified Pickup advances your Streak by one; completing the quiz or making a referral earns coins but does not advance the Streak.',
        'Miss a single day without a verified Pickup and the Streak resets to Seedling — you keep all coins earned, only the rate on quiz, referral and welcome bonus coins returns to the Seedling rate until you rebuild it.',
        'A day is not counted against you where a Pickup you booked was cancelled, missed, or unavailable because of us, an Agent, or a suspended Service Area — report it and we will restore the Streak where our records confirm it.',
        'We may change the stages, rates, or multipliers, with at least 30 days’ notice of any change that reduces the rate on coins already in your Wallet.',
      ],
    },
    {
      heading: 'Referral programme',
      bullets: [
        'Each User receives a unique referral code. When a genuinely new User signs up with your code, both the referrer and the referee are credited 1,000 bonus KarmaCoins XP. Referral coins can be redeemed only from the date and at the Streak-based rate set out above.',
        'The referee must be a genuinely new User who has not previously held an account.',
        'Self-referrals, referrals to accounts you control, fake or automated sign-ups, and coordinated abuse result in reversal of the bonus, termination of the accounts involved, and forfeiture of all coins in them.',
        'We may cap the number of eligible referrals in any period, and may modify or discontinue the programme on notice.',
      ],
    },
    {
      heading: 'Acceptable use',
      bullets: [
        'Do not provide false, misleading, or impersonated information at registration, booking, or during a Pickup.',
        'Do not create multiple accounts or use another person’s account.',
        'Do not manipulate or exploit the KarmaCoins XP, Streak, quiz, or referral systems, including by falsifying weights, splitting Pickups, or presenting the same material more than once.',
        'Do not circumvent the Serviceability Check, including by spoofing device location or modifying, replaying, or forging API requests.',
        'Do not use bots, scrapers, automated tools, or scripts; do not reverse-engineer or extract the source code, except where the law does not permit that restriction.',
        'Do not probe, scan, overload, or interfere with the Service, or attempt unauthorised access to any account or system.',
        'Do not abuse, threaten, harass, or discriminate against Agents, other Users, or Company personnel.',
        'Do not upload unlawful, infringing, obscene, or harmful content, or use the Service for any unlawful purpose.',
      ],
    },
    {
      heading: 'Agents',
      bullets: [
        'Agents are independent contractors — not employees. Nothing in these Terms creates an employment, partnership, joint venture, or agency relationship.',
        'We verify Agents before onboarding but do not guarantee their conduct. You may rate an Agent after each Pickup; poor ratings or substantiated complaints may lead to removal.',
        'Do not make direct payment arrangements with Agents outside the platform. Agents are not authorised to demand or accept payment for a Pickup — report any such request immediately.',
        'Report any dispute or safety concern involving an Agent through in-app support; safety concerns are acted on promptly.',
      ],
    },
    {
      heading: 'Intellectual property',
      bullets: [
        'All Content, trademarks, logos, app design, quiz material, and software associated with KarmaVer$e are owned by or licensed to the Company and protected under applicable law.',
        'Subject to your compliance, we grant you a limited, non-exclusive, non-transferable, revocable licence to use the app for personal, non-commercial use.',
        'You may not copy, modify, distribute, sell, lease, publicly display, or create derivative works from any part of the Service, except as expressly permitted.',
        'The "KarmaVer$e" name and logo and "KarmaCoins XP" branding are trademarks of the Company.',
        'Your content — you retain ownership of photographs, ratings, and reviews you submit, and grant us a worldwide, royalty-free, non-exclusive licence to host, store, reproduce, and display them to operate, improve, and promote the Service. This licence ends when you delete the material or your account, except for copies retained as described in the Privacy Policy or required by law.',
        'Feedback you voluntarily submit may be used by us without obligation to compensate or credit you.',
      ],
    },
    {
      heading: 'Third-party services',
      bullets: [
        'The Service relies on third-party providers — sign-in (Google, Facebook, Apple), mapping and geocoding, cloud hosting, messaging providers, and our Payment Partner. Their availability is outside our control.',
        'Where you follow a link to a third-party site or a redemption or donation partner, that third party’s own terms and privacy policy apply. We are not responsible for their content, products, or practices.',
        'Making a third-party service available through the app is not an endorsement of it.',
      ],
    },
    {
      heading: 'Complaints, disputes & grievance redressal',
      bullets: [
        'In-app support — use "Need help?" first. This is the fastest route and creates a traceable ticket.',
        'Grievance Officer — if you are not satisfied, escalate using the contact details below.',
        'External remedies — nothing here limits your right to approach a consumer forum, the Data Protection Board of India, or any other competent authority.',
        'Raise a dispute about coin calculation, Agent conduct, or a redemption within 7 days of the relevant Pickup or transaction.',
        'We acknowledge a reported issue within 2 business days, resolve routine issues within 15 business days, and resolve grievances escalated to the Grievance Officer within 30 days.',
        'The Service does not charge Users for Pickups, so cash refunds do not arise for Pickup services. Where a Pickup is missed, delayed, or done incorrectly through our or an Agent’s error, we may credit compensatory coins, restore your Streak, reschedule, or take other corrective action.',
      ],
    },
    {
      heading: 'Suspension and termination',
      bullets: [
        'You may stop using the Service at any time and delete your account through settings or support. Deleting your account permanently erases your KarmaCoins XP, including unredeemed coins — redeem eligible coins first.',
        'We may suspend or terminate your account, with notice where practicable, for breach of these Terms, suspected fraud or abuse, risk to the safety of Agents or others, or where required by law.',
        'Where we suspend pending investigation, we will tell you the reason unless doing so would prejudice an investigation or breach a legal obligation, and will restore the account if the concern is not substantiated.',
        'Coins from fraudulent or abusive activity may be forfeited. Coins genuinely earned through verified Pickups are not forfeited merely because an account is closed for convenience.',
        'Termination does not relieve either party of obligations accrued before it; the intellectual-property, liability, indemnity, general-provisions, and governing-law sections survive.',
      ],
    },
    {
      heading: 'Disclaimers and limitation of liability',
      bullets: [
        'The Service is provided on an "as is" and "as available" basis. We do not warrant it will be uninterrupted or error-free, or that mapping, geocoding, or serviceability data will be free of inaccuracies. Estimated coin values shown before verification are indicative only.',
        'To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential, or punitive damages, or loss of profits, data, or goodwill.',
        'Our aggregate liability arising out of the Service is limited to the greater of (a) the rupee value of the KarmaCoins XP in your Wallet when the claim arose, at the rate applicable to you, and (b) ₹5,000.',
        'Nothing limits or excludes our liability for death or personal injury caused by our negligence, fraud, any liability that cannot lawfully be excluded (including your rights under the Consumer Protection Act, 2019), or our obligations as a Data Fiduciary under the DPDP Act, 2023.',
        'We are not liable for failure or delay caused by events beyond our reasonable control, including natural disasters, epidemics, strikes, civil unrest, network or power outages, government action, or failure of the Payment Partner.',
      ],
    },
    {
      heading: 'Indemnity',
      body: [
        'You agree to indemnify the Company and its officers, employees, and Agents against reasonable losses, claims, and costs arising from (a) your breach of these Terms, (b) your presentation of prohibited or undeclared hazardous material, (c) your infringement of any third-party right, or (d) your violation of applicable law. This does not apply to the extent the loss is caused by our own act, omission, or negligence. We will notify you promptly of any claim and will not settle it without your consent, not to be unreasonably withheld.',
      ],
    },
    {
      heading: 'Changes to these Terms',
      bullets: [
        'We may update these Terms to reflect changes to the Service, our practices, or legal or regulatory requirements.',
        'Material changes — including to coin earn or redemption rates, Streak mechanics, expiry, or your rights — are notified through the app, by email, or by other reasonable means at least 30 days before they take effect, except where a shorter period is required by law or to address a security or legal risk.',
        'Non-material changes, such as clarifications and corrections, take effect on publication. The "Last updated" date and version number are revised.',
        'Continued use after a change takes effect constitutes acceptance. Changes apply prospectively and will not retroactively reduce coins already credited.',
      ],
    },
    {
      heading: 'General & governing law',
      bullets: [
        'These Terms, with the Privacy Policy and any promotion-specific terms, form the entire agreement between you and the Company regarding the Service.',
        'If any provision is held invalid, it is severed and the remainder continues. Our failure to enforce a right is not a waiver of it.',
        'You may not assign your rights without our consent; we may assign these Terms, including on a merger or sale of assets, provided your rights are not reduced.',
        'These Terms are made in English; any translation is for convenience, and the English version prevails in case of conflict.',
        'These Terms are governed by the laws of India. Subject to your consumer rights, the courts at Gurugram, Haryana have exclusive jurisdiction. Nothing removes your right to bring proceedings before the consumer forum where you reside or work under the Consumer Protection Act, 2019.',
        'Both parties agree to attempt informal resolution through in-app support and the Grievance Officer for at least 30 days before legal proceedings, without preventing urgent interim relief.',
      ],
    },
    {
      heading: 'Contact us',
      bullets: [
        'General support — in-app "Need help?"',
        'General enquiries — info@karmaverse.earth · 070931 98828 / 099071 91928',
        'Grievance Officer (Terms, content, and platform complaints) — grievance@karmaverse.earth',
        'Data protection / privacy requests — see the Privacy Policy, Contact section',
        'Registered office — 3R ZeroWaste Private Limited, 1/12 Pal Road, Shipra Suncity, Indirapuram, Ghaziabad, Uttar Pradesh 201010',
        'Operating office — Plot 62, Sector 8, IMT Manesar, Gurugram, Haryana 122051',
      ],
    },
    {
      heading: 'Active service areas',
      bullets: [
        'Gurgaon / Gurugram, Haryana and nearby areas within 50 km of central Gurugram — Active · Pickups available.',
        'Delhi, Noida, Faridabad, and Ghaziabad — addresses within that 50 km radius are already covered; the rest of each city is Planned · not yet available.',
        '"Planned" areas are indicative only and create no commitment as to timing. Coverage within an active area may be partial; the version shown in the app is authoritative.',
      ],
    },
  ],
  closing: 'By using KarmaVer$e, you acknowledge that you have read, understood, and agreed to these Terms & Conditions.\n© 2026 KarmaVer$e by 3R ZeroWaste Private Limited. All rights reserved.',
};

export const PRIVACY: LegalDoc = {
  title: 'Privacy policy',
  updated: '2 September 2026',
  intro:
    `3R ZeroWaste Private Limited (CIN U37200UP2020PTC131568) ("Company", "we", "us", "our") operates the KarmaVer$e app and website (the "Service"). We are the Data Fiduciary for the personal data described here, which means we determine why and how it is processed. This Policy explains what personal data we collect, why, who we share it with, how long we keep it, and your rights under India’s Digital Personal Data Protection Act, 2023. It should be read together with our Terms & Conditions.`,
  sections: [
    {
      heading: 'At a glance',
      body: ['This summary is for convenience only. The detailed sections below govern.'],
      bullets: [
        'Who controls my data? 3R ZeroWaste Private Limited, as Data Fiduciary under the DPDP Act, 2023.',
        'What is most sensitive? Your pickup address and location, and — if you cash out — your bank or UPI details.',
        'Do you track my location in the background? No. We access location only while you are scheduling or a Pickup is being fulfilled.',
        'Who sees my address? Only the Agent assigned to your Pickup, and our staff on a need-to-know basis. Never other Users.',
        'Do you sell my data? No. We do not sell personal data.',
        'Where is it stored? Primarily on servers in India.',
        'Can I delete it? Yes. Deleting your account erases your data within 30 days, apart from records we must keep by law.',
        'Who do I complain to? Our Data Protection Officer, then the Data Protection Board of India.',
      ],
    },
    {
      heading: 'Notice, consent, and legal basis',
      body: [
        'Under the DPDP Act we tell you, in clear terms, what personal data we collect and why, before or when we ask for it — through this Policy and short in-context notices (for example, when we ask for location access).',
      ],
      bullets: [
        'Your consent — optional profile details, marketing, device location, and any processing we ask you to agree to separately.',
        'Performance of our agreement — creating your account, scheduling and fulfilling Pickups, calculating and crediting KarmaCoins XP, and processing redemptions.',
        'Legal obligation — tax, accounting, and audit records; lawful requests from authorities; breach notification.',
        'Protecting the Service — detecting and preventing fraud, abuse, and security incidents.',
        'You may withdraw consent at any time, as easily as you gave it, through in-app settings, device settings, or by contacting us. Withdrawal takes effect going forward. Withdrawing location consent means you enter addresses manually; withdrawing consent needed to fulfil a Pickup may mean we cannot provide it.',
      ],
    },
    {
      heading: 'Personal data we collect',
      bullets: [
        'Account details (required) — name and email; mobile number when you sign up with email (optional with social sign-in, and can be added later in your profile). If you sign in with Google, Facebook, or Apple, we receive only your name, email address, and an account identifier from that provider (from Facebook, your basic public profile; from Apple, the email you choose to share, which may be an Apple private relay address). We never receive your password for those accounts, and we never post to them.',
        'Pickup address (required to book) — full address, locality, city, state, PIN code, coordinates, and any landmarks or notes.',
        'Pickup details (required to book) — waste categories, estimated quantity, hazardous-waste declarations, and chosen slot.',
        'Profile details (optional, never needed for pickups or rewards) — age, gender, marital status, employment status. We do not ask about sexual orientation. Earlier versions of the app had an optional sexual-orientation question; it has been removed, we do not use any answer given, and stored answers are being deleted.',
        'Redemption details (only if you request a payout) — bank account or UPI ID and any KYC documents our Payment Partner requires.',
        'Communications — support tickets, ratings, reviews, photographs, and dispute details, as you provide them.',
        'Quiz and referral activity — answers, scores, referral-code usage, and the referral relationship between accounts.',
        'Collected automatically — device and app data, usage data, approximate or precise location, and network data (IP, connection info) for security and fraud prevention. Cookies are used on the website only.',
        'Generated through the Service — Agent-verified category and weight of material, verification photographs, your Wallet and transaction history, and serviceability results.',
        'What we do not collect — government identity numbers (except KYC required by our Payment Partner for a payout), sexual orientation, health or biometric data, and no data knowingly from anyone under 18.',
      ],
    },
    {
      heading: 'Location data — in detail',
      body: [
        'Location is the most sensitive category of data the Service routinely handles, so we set out our practices separately.',
      ],
      bullets: [
        'Why — to help you find and confirm the Pickup address, to check serviceability (Pickups are offered only within 50 km of central Gurugram), and to route the assigned Agent and confirm collection at the booked address.',
        'We access device location only while you are actively scheduling a Pickup or during fulfilment of a booked Pickup. We do not collect background location and do not build a movement history.',
        'We ask at the point of need, with an explanation. If you decline, you can still search and confirm a Pickup address manually — only convenience features are affected. Permission can be revoked anytime in device settings.',
        'The coordinates stored against a booking are those of the Pickup Address you confirmed, not a live device position.',
        'The assigned Agent sees the address, coordinates, contact number, categories, and slot needed for the collection, and only around the assigned Pickup; access ends when it is completed or cancelled. Your location and address are never exposed to other Users.',
        'Location data is used only for Pickup-related purposes — never for advertising or profiling — and is never sold or rented. Where serviceability cannot be confirmed, we decline the booking rather than assume.',
      ],
    },
    {
      heading: 'How we use your personal data',
      bullets: [
        'Create, authenticate, and manage your account.',
        'Schedule, assign, and fulfil Pickups, and check whether a location is serviceable.',
        'Calculate, credit, and manage KarmaCoins XP, Streaks, and bonuses.',
        'Process redemption payouts (shared with the Payment Partner).',
        'Provide support and resolve disputes.',
        'Personalise your experience, such as suggesting slots or quiz content.',
        'Detect, investigate, and prevent fraud and abuse, and maintain security and reliability.',
        'Send service communications (confirmations, coin updates, payout status, policy changes) and, only with your consent, marketing — which you can opt out of at any time.',
        'Improve the Service and plan coverage using aggregated or de-identified data, and comply with legal obligations.',
      ],
    },
    {
      heading: 'How we share your personal data',
      bullets: [
        'With Agents — the address, contact number, and pickup details needed to complete your booking, only for the period around it, under confidentiality obligations.',
        'With other Users, only when coins are sent — when someone enters your registered mobile number to send you KarmaCoins XP, the app shows them your name so they can confirm the right recipient. The transfer then appears in both Users’ transaction history. Your address, email, and other details are never shown.',
        'With our Payment Partner (RazorpayX) — the account and transaction details needed to process a cash payout, handled under its own privacy policy and RBI regulations.',
        'With service providers — vendors who help run the Service under written confidentiality and data-protection obligations.',
        'With recycling and fulfilment partners — where needed to process collected material or fulfil a reward or donation you chose.',
        'For legal reasons — where required by law or to protect rights, property, or safety; we notify you where we may lawfully do so.',
        'In a business transfer — data may transfer as part of a merger, acquisition, or sale of assets, subject to this Policy, with notice.',
        'We do not sell your personal data, and do not share it for third parties’ own independent marketing.',
      ],
    },
    {
      heading: 'Cookies, security & transfers',
      bullets: [
        'Cookies are used on our website (the app does not use cookies, though it uses device identifiers). Strictly-necessary cookies keep you signed in; performance and functionality cookies can be disabled. We do not use cookies for cross-site behavioural advertising.',
        'We apply reasonable administrative, technical, and physical safeguards — including encryption in transit, access controls, logging, and periodic review. Access is limited to those who need it; Agent access is scoped to their Pickup.',
        'Payment details for redemption are transmitted to our Payment Partner using industry-standard encryption; we do not permanently store full bank or card details beyond what is needed to show transaction status.',
        'In the event of a breach, we notify each affected User and the Data Protection Board of India within the timelines under the DPDP Act.',
        'We primarily store and process data on servers in India. Some providers may process data outside India under contractual and technical safeguards consistent with the DPDP Act. No method of transmission or storage is completely secure.',
      ],
    },
    {
      heading: 'How long we keep your data',
      bullets: [
        'Account and profile data — while your account is active; erased within 30 days of deletion, except where retention is legally required.',
        'KarmaCoins XP and Wallet — erased on account deletion; unredeemed coins are lost.',
        'Pickup records, addresses, and coordinates — erased with your account, subject to financial-record retention below.',
        'Transaction, redemption, and financial records — up to 8 years, to meet tax, accounting, payment-industry, and audit requirements.',
        'Support tickets and dispute records — up to 3 years. Security and access logs — up to 180 days, or longer during an investigation.',
        'Fraud and abuse records for terminated accounts — up to 3 years, to prevent re-registration. Aggregated or de-identified data may be kept indefinitely.',
      ],
    },
    {
      heading: 'Your rights',
      bullets: [
        'Access — a summary of the personal data we hold, our processing, and who we shared it with.',
        'Correction and updating — most profile fields can be edited in the app.',
        'Erasure — where data is no longer necessary, subject to the retention requirements above.',
        'Withdraw consent — for any consent-based processing, at any time.',
        'Grievance redressal — raise a grievance and receive a response within the prescribed timeline.',
        'Nominate — nominate another individual to exercise your rights in the event of death or incapacity.',
        'Complain to the Board — file a complaint with the Data Protection Board of India if you are not satisfied with our response.',
        'Other choices — opt out of marketing; manage location, camera, and notification permissions in device settings; delete your account from settings; request a copy of your records. We do not charge for exercising these rights.',
      ],
    },
    {
      heading: 'Your duties, children & automated processing',
      bullets: [
        'The DPDP Act asks that you comply with applicable law when exercising your rights, do not impersonate another person, do not suppress material information (for example during a KYC check), and do not register false or frivolous grievances.',
        'The Service is only for Users aged 18 and above. We do not knowingly collect personal data from anyone under 18; if we learn an account belongs to someone under 18, we close it and delete its personal data, except where the law requires us to keep it. Report a suspected under-18 account to info@0waste.co.in.',
        'We use automated processing for serviceability checks, slot allocation, coin and Streak calculation, and fraud detection. Automated fraud checks may temporarily restrict an account or payout; you can ask for a human review through in-app support or our Data Protection Officer. Final coins for a Pickup are based on an Agent’s human verification.',
      ],
    },
    {
      heading: 'Changes to this Policy',
      body: [
        'We may update this Policy for changes in our practices or for legal, operational, or regulatory reasons. Material changes — a new purpose, a new category of recipient, or a longer retention period — are notified through the app, by email, or by other reasonable means at least 30 days before they take effect. Where a change requires your consent, we will ask for it. Continued use after a change takes effect constitutes acceptance, except where consent is separately required.',
      ],
    },
    {
      heading: 'Contact us',
      bullets: [
        'Data Protection Officer / privacy requests — privacy@karmaverse.earth',
        'Privacy grievances and escalations — Grievance Officer, grievance@karmaverse.earth',
        'General enquiries — info@karmaverse.earth · 070931 98828 / 099071 91928',
        'In-app — "Need help?" → Privacy',
        'Postal address — 3R ZeroWaste Private Limited, Plot 62, Sector 8, IMT Manesar, Gurugram, Haryana 122051 (registered office: 1/12 Pal Road, Shipra Suncity, Indirapuram, Ghaziabad, Uttar Pradesh 201010)',
        'Regulator — the Data Protection Board of India, if you are not satisfied with our response.',
        'This Policy is governed by the laws of India, principally the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000. Disputes are subject to the courts at Gurugram, Haryana, without prejudice to your right to approach the Data Protection Board or a consumer forum where you reside or work.',
      ],
    },
  ],
  closing: 'By using KarmaVer$e, you acknowledge that you have read and understood this Privacy Policy.\n© 2026 KarmaVer$e by 3R ZeroWaste Private Limited. All rights reserved.',
};

export const TERMS_OF_USE: LegalDoc = {
  title: 'Terms of use',
  updated: '2 September 2026',
  intro:
    `These Terms of Use govern your access to and use of the KarmaVer$e app and website (the "Platform"), operated by 3R ZeroWaste Private Limited (CIN U37200UP2020PTC131568). They cover what you are allowed to do on the Platform — the licence to use it, acceptable use, content you post, intellectual property, availability, and our role as an intermediary. By accessing or using the Platform — whether or not you register — you accept these Terms of Use. If you register or book a Pickup, our Terms & Conditions also apply. If you do not accept these Terms of Use, you must not use the Platform.`,
  sections: [
    {
      heading: 'How our documents fit together',
      bullets: [
        'Terms of Use (this document) — what am I allowed to do on the platform? Licence, acceptable use, content, intellectual property, availability, and our role as an intermediary.',
        'Terms & Conditions — what is the deal between us? Pickups and service areas, KarmaCoins XP, Streaks, redemption and payouts, and Agents.',
        'Privacy Policy — what happens to my data? What we collect, why, who we share it with, how long we keep it, and your rights.',
        'Order of precedence where they conflict: Privacy Policy on personal-data questions, then Terms & Conditions on the service, coins, pickups, or payouts, then Terms of Use on access and conduct.',
      ],
    },
    {
      heading: 'Acceptance and who may use the Platform',
      bullets: [
        'By accessing or using the Platform you accept these Terms of Use, which are an electronic record under the Information Technology Act, 2000 and need no signature.',
        'Browsing our public website is open to anyone.',
        'Creating an account and using account features requires you to meet the eligibility criteria in the Terms & Conditions — in summary, you must be 18 or older.',
        'You must not use the Platform if we have previously terminated your access.',
      ],
    },
    {
      heading: 'Licence to use the Platform',
      bullets: [
        'We grant you a limited, personal, non-exclusive, non-transferable, non-sublicensable, revocable licence to access and use the Platform for your own personal, non-commercial purposes.',
        'No ownership of any part of the Platform passes to you; all rights not expressly granted are reserved.',
        'The licence covers use through official channels — our website and the app from recognised app stores. It does not extend to modified builds, unofficial distributions, or emulated or automated clients.',
        'The licence lasts while you comply with these Terms of Use and ends automatically if you breach them or your access is withdrawn.',
      ],
    },
    {
      heading: 'Account access and security',
      bullets: [
        'You are responsible for all activity under your account and for keeping your credentials, device, and registered mobile number secure.',
        'Do not share your credentials or allow another person to use your account.',
        'Notify us promptly through in-app support if you believe your account was accessed without authorisation. Until you do, activity under your account is treated as yours.',
        'We may require re-authentication or additional verification before granting access to sensitive features, and may log access and security events as described in the Privacy Policy.',
      ],
    },
    {
      heading: 'Acceptable use',
      bullets: [
        'Do not use bots, scrapers, crawlers, or automated means to access, monitor, or copy the Platform or its content.',
        'Do not reverse-engineer, decompile, disassemble, or derive the source code, except where the law does not permit that restriction.',
        'Do not modify, repackage, or redistribute the app, or run it on a modified or emulated client.',
        'Do not interfere with, disrupt, overload, or place undue load on the Platform, including by denial-of-service or excessive automated requests.',
        'Do not probe, scan, or test the vulnerability of any system without prior written permission, or attempt unauthorised access, or bypass any authentication, rate limit, or access control.',
        'Do not circumvent technical restrictions, including the serviceability check, by spoofing device location or modifying, replaying, or forging requests to our APIs.',
        'Do not introduce malware, or remove or alter any proprietary notice.',
        'Do not provide false or impersonated information, create multiple accounts, manipulate the KarmaCoins XP, Streak, quiz, or referral systems, advertise without permission, or harvest information about other users or Agents.',
        'Do not abuse, threaten, harass, stalk, defame, or discriminate against any user, Agent, or Company personnel, and do not use the Platform for any unlawful purpose.',
      ],
    },
    {
      heading: 'Content you submit',
      bullets: [
        'User Content means anything you submit — ratings, reviews, photographs, support messages, dispute descriptions, quiz responses, and profile information.',
        'You are solely responsible for your User Content and for having the right to submit it. Do not include other people’s personal information without their knowledge, or submit content in the prohibited categories listed below.',
        'You keep ownership of your User Content and grant us a worldwide, royalty-free, non-exclusive licence to host, store, reproduce, adapt for formatting, and display it to operate, support, secure, improve, and promote the Platform. This licence ends when you delete the content or your account, except for copies retained as described in the Privacy Policy or required by law, or already shared during a Pickup.',
        'We do not pre-screen content but may review, refuse, restrict, or remove content that breaches these Terms or the law; we tell you the reason unless doing so would breach a legal obligation or prejudice an investigation. You can contest a removal through the grievance route.',
        'Suggestions or feature requests you voluntarily submit may be used by us without obligation to compensate or credit you.',
      ],
    },
    {
      heading: 'Intellectual property',
      bullets: [
        'All content, trademarks, logos, app design, quiz material, databases, and software forming part of the Platform are owned by or licensed to the Company and protected under the Copyright Act, 1957, the Trade Marks Act, 1999, and other law.',
        'The "KarmaVer$e" name and logo and "KarmaCoins XP" branding are trademarks of the Company. No licence to use them is granted except as strictly necessary to use the Platform as intended.',
        'You may not copy, modify, distribute, sell, lease, publicly display, frame, mirror, or create derivative works from any part of the Platform, except as expressly permitted or allowed by law.',
        'You may not use the Platform or its content to build, train, or evaluate any machine-learning model or dataset without our prior written consent.',
        'If you believe content on the Platform infringes your intellectual property, contact our Grievance Officer with the details of the work, its location, your contact details, and a good-faith statement.',
      ],
    },
    {
      heading: 'Availability, third parties & permissions',
      bullets: [
        'We aim to keep the Platform available but do not guarantee uninterrupted or error-free access. Access may be suspended for maintenance, upgrades, security, or reasons beyond our control.',
        'We may add, modify, or remove features, and may require you to update to a supported version; older versions may stop functioning. Beta or preview features may change or be withdrawn without notice.',
        'The Platform depends on third-party services — sign-in (Google, Facebook, Apple), mapping and geocoding, cloud hosting, messaging, and our Payment Partner — whose availability is outside our control. Links to third-party sites are not endorsements and are governed by those parties’ own terms. Open-source components are licensed under their own licences.',
        'Some features need device permissions — principally location, and optionally camera and notifications. We request them at the point of need with an explanation, do not use background location, and let you decline or revoke them in device settings. How location data is handled is set out in the Privacy Policy.',
        'The Platform is intended for use in India.',
      ],
    },
    {
      heading: 'Security research and disclosure',
      bullets: [
        'We welcome good-faith security research. Report a suspected vulnerability to security@karmaverse.earth before disclosing it publicly or to any third party.',
        'We will acknowledge your report, keep you informed, and will not pursue action against researchers who act in good faith.',
        'Good-faith research means you test only against your own account and data, do not access or exfiltrate anyone else’s data, do not degrade or deny service, do not use social engineering or physical intrusion, give us reasonable time to remediate before public disclosure, and comply with the law throughout.',
      ],
    },
    {
      heading: 'Our role as an intermediary',
      bullets: [
        'To the extent we host or transmit content provided by users, we act as an intermediary under the Information Technology Act, 2000, and observe the due-diligence obligations under the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.',
        'We publish these Terms of Use, our Privacy Policy, and our Terms & Conditions, and inform users at least once a year of the consequences of non-compliance.',
        'We do not initiate, select the receiver of, or modify user transmissions, other than as necessary to operate the Platform.',
        'We have appointed a Grievance Officer, whose details are published within the app. On a valid court order or government notification, we remove or disable access to unlawful content within the period prescribed by law.',
        'Nothing here makes us generally responsible for monitoring the Platform, or affects the protections available to intermediaries under Section 79 of the IT Act, 2000.',
      ],
    },
    {
      heading: 'Reporting content & grievance redressal',
      bullets: [
        'Report content in-app via "Need help?" or the report control beside the content, or write to grievance@karmaverse.earth with a description, where it appears, and why it breaches these Terms or the law.',
        'We acknowledge any grievance within 24 hours and resolve it within 15 days.',
        'Content showing an individual in the nude, in a sexual act, or in impersonation — including artificially generated material — is acted on within 24 hours of a valid complaint.',
        'Removal following a court order or government notification, and information or assistance for a lawfully authorised agency, is provided within the period prescribed by law.',
        'Nothing here limits your right to approach a court, a consumer forum, the Data Protection Board of India, or another competent authority.',
      ],
    },
    {
      heading: 'Suspension, disclaimers & liability',
      bullets: [
        'We may suspend, restrict, or withdraw your access for breach of these Terms, suspected fraud, abuse, or security risk, or where required by law — with notice and reason where practicable. You can contest it through the grievance route, and we restore access if the concern is not substantiated.',
        'The Platform is provided on an "as is" and "as available" basis. We disclaim implied warranties to the extent permitted by law and do not warrant it will be uninterrupted, secure, or error-free. Mapping and address data may contain inaccuracies — confirm your address before booking. Quiz content is general information, not professional advice.',
        'Our liability is limited as set out in the Terms & Conditions, which applies here as though repeated. Nothing limits our liability for death or personal injury caused by our negligence, fraud, any liability that cannot lawfully be excluded (including your consumer rights), or our obligations as a Data Fiduciary under the DPDP Act, 2023.',
        'You agree to indemnify the Company and its officers, employees, and Agents against reasonable losses arising from your breach of these Terms, your User Content, your infringement of third-party rights, or your violation of law — except to the extent caused by our own negligence.',
      ],
    },
    {
      heading: 'Changes, general terms & contact',
      bullets: [
        'We may update these Terms of Use for changes to the Platform, our practices, or legal requirements. Material changes are notified at least 30 days before they take effect; non-material changes take effect on publication. Continued use after a change constitutes acceptance.',
        'These Terms of Use, with the Terms & Conditions and Privacy Policy, form the entire agreement about the Platform. If any provision is invalid it is severed; our failure to enforce a right is not a waiver. You may not assign your rights; we may, provided your rights are not reduced.',
        'These Terms of Use are made in English (the English version prevails) and are governed by the laws of India. Subject to your consumer rights, the courts at Gurugram, Haryana have exclusive jurisdiction. We attempt informal resolution for at least 30 days before legal proceedings, without preventing urgent interim relief.',
        'Contact — general support in-app "Need help?"; Grievance Officer (content reports, platform complaints, IP notices) grievance@karmaverse.earth; security reports security@karmaverse.earth; privacy requests privacy@karmaverse.earth; general enquiries info@karmaverse.earth · 070931 98828 / 099071 91928; registered office 3R ZeroWaste Private Limited, 1/12 Pal Road, Shipra Suncity, Indirapuram, Ghaziabad, Uttar Pradesh 201010; operating office Plot 62, Sector 8, IMT Manesar, Gurugram, Haryana 122051.',
      ],
    },
    {
      heading: 'Prohibited content',
      body: ['You must not host, upload, publish, transmit, store, or share any content that:'],
      bullets: [
        'belongs to another person to which you have no right;',
        'is obscene, pornographic, paedophilic, or invasive of another’s privacy including bodily privacy;',
        'is defamatory, libellous, or racially or ethnically objectionable;',
        'is harmful to a child, or relates to or encourages money laundering or gambling;',
        'is insulting or harassing on the basis of gender;',
        'encourages or incites violence, or is otherwise contrary to the laws in force;',
        'infringes any patent, trademark, copyright, or other proprietary right;',
        'deceives or misleads about the origin of the message, or is patently false or misleading;',
        'impersonates another person, or threatens the unity, integrity, defence, security, or sovereignty of India, or public order;',
        'contains a virus or code designed to interrupt, destroy, or limit any computer resource; or',
        'is artificially generated or manipulated in a manner that could be mistaken for authentic where it depicts an identifiable person.',
        'This reflects Rule 3(1)(b) of the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.',
      ],
    },
  ],
  closing: 'By accessing or using KarmaVer$e, you acknowledge that you have read, understood, and agreed to these Terms of Use.\n© 2026 KarmaVer$e by 3R ZeroWaste Private Limited. All rights reserved.',
};

export const DATA_DELETION: LegalDoc = {
  title: 'Data deletion',
  updated: 'July 2026',
  intro:
    'You can request deletion of your KarmaVer$e account and all associated personal data, including data received through any third-party login (Google, Facebook, or Apple), at any time.',
  sections: [
    {
      heading: 'How to request deletion',
      body: [
        'Email us from the address associated with your account:',
      ],
      bullets: [
        'Email: info@0waste.co.in',
        'Subject line: "Delete my account"',
        'Include the mobile number or email address you registered with, so we can locate your account',
      ],
    },
    {
      heading: 'What we delete',
      bullets: [
        'Your account and profile details (name, email, mobile number, and any optional profile fields)',
        'Pickup history, addresses, and location data associated with your account',
        'Your KarmaCoins XP balance and transaction history',
        'Any data received from third-party sign-in providers (your Google, Facebook, or Apple profile information)',
      ],
    },
    {
      heading: 'Timeline',
      bullets: [
        'We acknowledge deletion requests within 24 hours',
        'Your data is permanently erased within 30 days of a verified request, except where we are legally required to retain certain records (such as transaction or fraud-dispute logs) for a limited period, after which they are deleted',
      ],
    },
    {
      heading: 'Contact us',
      body: ['For questions about this process:'],
      bullets: [
        'Email: info@0waste.co.in',
        'Address: 3R ZeroWaste Private Limited, Plot 62, Sector 8, IMT Manesar, Gurugram, Haryana 122051',
      ],
    },
  ],
  closing: '© 2026 KarmaVer$e by 3R ZeroWaste Private Limited. All rights reserved.',
};
