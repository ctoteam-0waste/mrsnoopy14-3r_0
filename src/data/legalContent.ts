// Legal content for KarmaVer$e. Edit the copy here — the LegalScreen renders it.
// Source of truth: 3R Zero Waste legal documentation.

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
  updated: 'June 2026',
  intro:
    'Welcome to KarmaVer$e, operated by 3R Zero Waste. By downloading, installing, or using the KarmaVer$e app or website, you agree to be bound by these terms. If you do not agree, please do not use the service.',
  sections: [
    {
      heading: 'Definitions',
      bullets: [
        'KarmaCoins XP: virtual reward points earned through recycling. They are non-transferable, non-refundable, and hold no monetary value outside the platform.',
        'Pickup: the scheduled collection of recyclable waste from your address by a verified Agent.',
        'Agent: an independent pickup partner verified by the company to collect recyclable waste.',
        'Wallet: the in-app wallet showing your KarmaCoins XP balance and transaction history.',
      ],
    },
    {
      heading: 'Eligibility',
      bullets: [
        'You must be at least 13 years of age to use this service.',
        'If you are under 18, you must have parental or guardian consent.',
        'You must provide accurate, complete, and current registration information.',
        'You are responsible for maintaining the confidentiality of your account credentials.',
      ],
    },
    {
      heading: 'Account registration',
      bullets: [
        'Register using a valid email address and phone number.',
        'One account per person. Duplicate or fraudulent accounts may be terminated without notice.',
        'You are solely responsible for all activity under your account.',
        'We may suspend or terminate accounts that violate these terms.',
      ],
    },
    {
      heading: 'Services provided',
      body: ['KarmaVer$e provides the following services:'],
      bullets: [
        'Waste pickup scheduling: free doorstep pickups for plastic, paper, metal, glass, e-waste, textile, organic, and hazardous materials.',
        'KarmaCoins XP rewards: earn coins based on the type and verified weight of waste collected.',
        'Daily eco-quiz: play daily quizzes to earn additional KarmaCoins XP.',
        'Referral program: invite others and earn bonus coins on their first successful pickup.',
        'Redemption: redeem coins for rewards, eco-friendly products, or donations as available.',
      ],
    },
    {
      heading: 'Pickup terms',
      bullets: [
        'Pickups are subject to availability in your area and time slot.',
        'We may cancel, reschedule, or decline a pickup due to operational, weather, or safety reasons.',
        'Ensure waste is properly segregated and accessible at the scheduled time.',
        'Hazardous waste must be declared at booking. Failure to do so may cause cancellation and suspension.',
        'The Agent verifies and weighs the waste at pickup. Final coins are based on the Agent’s verification, not your estimate.',
        'Do not include prohibited items such as medical/biomedical waste, explosives, radioactive materials, or anything banned under law.',
      ],
    },
    {
      heading: 'KarmaCoins XP policy',
      bullets: [
        'Coins are earned based on the type and verified weight of recyclable materials collected.',
        'Coin values are set by the company and may change without prior notice.',
        'Coins have no cash value and cannot be exchanged for cash, cryptocurrency, or legal tender.',
        'Coins are non-transferable between accounts.',
        'We may adjust, revoke, or expire coins in cases of fraud, abuse, system errors, or policy violations.',
        'Coins may have an expiry period as determined from time to time.',
        'Bonus coins from referrals, quizzes, or promotions are subject to their specific terms.',
      ],
    },
    {
      heading: 'Referral program',
      bullets: [
        'Each user gets a unique referral code to share.',
        'Bonus coins are credited to both the referrer and referee on the referee’s first successful pickup.',
        'Self-referrals, fake accounts, or fraud will result in termination and forfeiture of all coins.',
        'We may modify or discontinue the referral program at any time.',
      ],
    },
    {
      heading: 'User conduct',
      body: ['By using the service, you agree not to:'],
      bullets: [
        'Provide false or misleading information during registration or pickups.',
        'Create multiple accounts or use another person’s account.',
        'Abuse, harass, or behave inappropriately towards Agents or company representatives.',
        'Manipulate or exploit the coins, quiz, or referral systems.',
        'Use automated tools, bots, or scripts to interact with the platform.',
        'Reverse-engineer, decompile, or extract the source code of the app.',
        'Use the platform for any illegal or unauthorized purpose.',
      ],
    },
    {
      heading: 'Agent interaction',
      bullets: [
        'Agents are independent contractors, not company employees.',
        'We verify Agents but do not guarantee their conduct.',
        'You can rate Agents after each pickup. Consistent low ratings may lead to removal.',
        'Report any dispute with an Agent through in-app support.',
        'Do not make direct payment arrangements with Agents outside the platform.',
      ],
    },
    {
      heading: 'Limitation of liability',
      bullets: [
        'The service is provided “as is” and “as available” without warranties of any kind.',
        'We are not liable for indirect, incidental, special, consequential, or punitive damages.',
        'We are not responsible for delays or failures beyond our control, including natural disasters, network outages, or government regulations.',
        'Our maximum liability shall not exceed the value of KarmaCoins XP in your account at the time of dispute.',
      ],
    },
    {
      heading: 'Termination',
      bullets: [
        'You may delete your account any time through settings or by contacting support.',
        'On deletion, all KarmaCoins XP and associated data are permanently erased.',
        'We may suspend or terminate your account immediately for any violation of these terms.',
        'Termination does not relieve you of obligations incurred before it.',
      ],
    },
    {
      heading: 'Governing law',
      bullets: [
        'These terms are governed by the laws of India.',
        'Disputes are subject to the exclusive jurisdiction of the courts in Gurugram, Haryana.',
        'Both parties agree to attempt informal resolution for at least 30 days before any legal claim.',
      ],
    },
    {
      heading: 'Contact us',
      body: ['For any questions or complaints about these terms or the service:'],
      bullets: [
        'Email: cto.team@0waste.co.in',
        'Phone: 070931 98828',
        'Address: 3R Zero Waste, Plot 62, Sector 8 Rd, IMT Manesar, Gurugram, Haryana 122503',
        'In-app: use the “Need help?” option',
      ],
    },
  ],
  closing:
    'By using KarmaVer$e, you acknowledge that you have read, understood, and agreed to these terms and conditions. © 2026 KarmaVer$e by 3R Zero Waste. All rights reserved.',
};

export const PRIVACY: LegalDoc = {
  title: 'Privacy policy',
  updated: 'June 2026',
  intro:
    'This policy explains what information KarmaVer$e (by 3R Zero Waste) collects, how we use it, and the choices you have. We are committed to protecting your privacy and handling your data responsibly.',
  sections: [
    {
      heading: 'Information we collect',
      body: ['To provide and improve our services, we collect:'],
      bullets: [
        'Account details: your name, email address, and phone number.',
        'Pickup details: your address and the waste categories you schedule.',
        'Location data: your device location to assign the nearest available Agent.',
        'Usage data: app activity such as quizzes played, coins earned, and bookings made.',
        'Device data: device type and push notification token (via Firebase Cloud Messaging).',
      ],
    },
    {
      heading: 'How we use your information',
      bullets: [
        'To schedule pickups and assign the nearest verified Agent.',
        'To calculate and credit KarmaCoins XP for verified waste.',
        'To operate the quiz, referral, and rewards programs.',
        'To send booking updates, quiz reminders, and offers via push notifications.',
        'To improve the app, prevent fraud, and provide customer support.',
      ],
    },
    {
      heading: 'Location data',
      bullets: [
        'Location is used solely to match you with the nearest available Agent and to show pickup tracking.',
        'It is not shared with third parties for advertising.',
        'You can disable location access in your device settings, though this may limit pickup features.',
      ],
    },
    {
      heading: 'Data sharing',
      bullets: [
        'We do not sell your personal data to third parties.',
        'We share only what is needed with assigned Agents (such as your address) to complete a pickup.',
        'We may share data with service providers who help operate the platform, under confidentiality obligations.',
        'We may disclose information if required by law or to protect our rights and users.',
      ],
    },
    {
      heading: 'KarmaCoins XP — virtual currency',
      bullets: [
        'KarmaCoins XP are virtual points with no monetary value outside the platform.',
        'Your coin balance and transaction history are stored to operate your wallet.',
        'We may adjust coins in cases of fraud, abuse, or system errors as described in our terms.',
      ],
    },
    {
      heading: 'Data storage & security',
      bullets: [
        'We use reasonable technical and organizational measures to protect your data.',
        'Data is stored on secured servers with restricted access.',
        'No method of transmission or storage is 100% secure; we cannot guarantee absolute security.',
      ],
    },
    {
      heading: 'Your rights',
      bullets: [
        'You can access and update your profile information in the app.',
        'You can delete your account at any time; associated data is then permanently erased.',
        'You can disable push notifications and location access from your device settings.',
        'For any data request, contact us using the details below.',
      ],
    },
    {
      heading: 'Children’s privacy',
      bullets: [
        'The service is not intended for children under 13.',
        'Users under 18 must have parental or guardian consent.',
        'We do not knowingly collect data from children under 13. If we learn we have, we will delete it.',
      ],
    },
    {
      heading: 'Third-party services',
      bullets: [
        'We use Firebase Cloud Messaging for push notifications.',
        'We use Mappls (MapmyIndia) for maps, address search, and location services.',
        'These providers process limited data under their own privacy policies.',
      ],
    },
    {
      heading: 'Changes to this policy',
      bullets: [
        'We may update this policy from time to time.',
        'Material changes will be notified in the app or via email.',
        'Continued use after changes constitutes acceptance of the updated policy.',
      ],
    },
    {
      heading: 'Contact us',
      body: ['For any privacy questions or requests:'],
      bullets: [
        'Email: cto.team@0waste.co.in',
        'Address: 3R Zero Waste, Plot 62, Sector 8 Rd, IMT Manesar, Gurugram, Haryana 122503',
      ],
    },
  ],
  closing: '© 2026 KarmaVer$e by 3R Zero Waste. All rights reserved.',
};
