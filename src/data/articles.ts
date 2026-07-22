// Knowledge hub articles. Written in-house — facts are widely reported figures
// (EPA, CPCB, Global E-waste Monitor); images are Wikimedia Commons thumbnails.

export interface ArticleSection {
  heading: string;
  paragraphs: string[];
  fact?: string;
}

export interface Article {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  source: string;
  readTime: string;
  date: string;
  image: string;
  intro: string;
  sections: ArticleSection[];
}

export const ARTICLES: Article[] = [
  {
    id: 'segregation-at-home',
    title: 'Why segregating waste at home matters more than you think',
    category: 'GUIDE',
    categoryColor: '#16a34a',
    source: 'KarmaVerse editorial',
    readTime: '4 min read',
    date: '18 Jul 2026',
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Photograph_of_public-waste_segregation_bins%2C_Amritsar%2C_Punjab%2C_India%2C_8_April_2023.jpg/960px-Photograph_of_public-waste_segregation_bins%2C_Amritsar%2C_Punjab%2C_India%2C_8_April_2023.jpg',
    intro:
      'One wet tea bag can ruin an entire bag of recyclable paper. Segregation is the single highest-impact habit in recycling — and it takes less than a minute a day.',
    sections: [
      {
        heading: 'Contamination is the real enemy',
        paragraphs: [
          'When food waste, liquids, or soiled items get mixed with recyclables, they contaminate everything they touch. Wet cardboard loses its fibre strength, oily plastic cannot be reprocessed, and broken glass shards make hand-sorting dangerous. Recyclers often have no choice but to send contaminated loads straight to landfill.',
          'India’s Solid Waste Management Rules, 2016 already require every household to separate waste into wet (biodegradable), dry (recyclable), and hazardous streams. Cities that enforce this — like Indore, ranked India’s cleanest city for years — divert most of their waste away from dumpsites.',
        ],
        fact: 'Segregated dry waste can fetch recyclers up to 5x more value than mixed waste, because every clean kilogram is actually usable.',
      },
      {
        heading: 'The two-bin habit',
        paragraphs: [
          'Keep one bin for wet waste — food scraps, peels, garden trimmings — and one for dry waste: paper, plastic, metal, glass. Rinse containers once and let them dry before binning. That single rinse is the difference between recyclable and rejected.',
          'Batteries, e-waste, and expired medicines belong in neither bin. Store them separately and hand them to a verified collector — KarmaVerse accepts batteries and every major e-waste category at your doorstep.',
        ],
      },
      {
        heading: 'Why it pays — literally',
        paragraphs: [
          'Clean, segregated waste is what earns you KarmaCoins XP. Our agents verify each category at pickup, and the cleaner and better-sorted your items are, the faster the pickup goes and the more accurately you are rewarded.',
        ],
      },
    ],
  },
  {
    id: 'india-ewaste',
    title: 'India’s e-waste mountain — and the opportunity inside it',
    category: 'TECHNOLOGY',
    categoryColor: '#7c3aed',
    source: 'KarmaVerse editorial',
    readTime: '5 min read',
    date: '15 Jul 2026',
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ewaste-pile.jpg/960px-Ewaste-pile.jpg',
    intro:
      'India is the world’s third-largest producer of electronic waste, behind only China and the United States — yet only about one-third of it is ever formally recycled.',
    sections: [
      {
        heading: 'A mountain that grows every year',
        paragraphs: [
          'India generates well over 3 million tonnes of e-waste every year, and the figure keeps climbing as phones, laptops, and appliances get replaced faster than ever. The rest is hoarded in drawers, sold into informal scrap chains, or simply thrown into mixed garbage.',
          'The informal sector recovers metals by open-air burning and acid leaching — processes that release lead, mercury, and dioxins into the air, soil, and groundwater, and directly harm the workers doing it, many of them children.',
        ],
        fact: 'A single laptop contains recoverable gold, silver, copper, and rare-earth elements. Recycling one million laptops saves the electricity equivalent of about 3,500 homes for a year.',
      },
      {
        heading: 'Formal recycling does it differently',
        paragraphs: [
          'Authorized recyclers dismantle devices in controlled facilities: batteries are isolated, hazardous parts are neutralised, and metals are recovered with proper safety and pollution controls. India’s E-Waste Management Rules require producers to channel devices into exactly these facilities.',
          'That is the chain your KarmaVerse pickup feeds into. Working devices that still have life are refurbished; dead ones are dismantled responsibly. Either way, nothing toxic ends up in a landfill or a backyard acid bath.',
        ],
      },
      {
        heading: 'What you can do today',
        paragraphs: [
          'Audit that one drawer every home has — old phones, tangled chargers, dead power banks. If it has a plug or a battery and you have not used it in a year, schedule a pickup. You earn KarmaCoins XP for every verified item, and the materials re-enter the economy instead of the ecosystem.',
        ],
      },
    ],
  },
  {
    id: 'cut-plastic-at-home',
    title: '5 easy ways to cut plastic waste at home',
    category: 'LIFESTYLE',
    categoryColor: '#0284c7',
    source: 'KarmaVerse editorial',
    readTime: '3 min read',
    date: '11 Jul 2026',
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Plastic_bottles_for_recycling.jpg/960px-Plastic_bottles_for_recycling.jpg',
    intro:
      'A plastic bottle can take up to 450 years to break down. The good news: most household plastic is avoidable, and what remains is highly recyclable — if it reaches the right place.',
    sections: [
      {
        heading: 'Five swaps that actually stick',
        paragraphs: [
          '1. Carry a cloth bag — India banned many single-use plastics in 2022, but the thin carry bag still sneaks back. Keep a foldable bag in every backpack and vehicle.',
          '2. Refill, don’t rebuy — one steel bottle replaces hundreds of packaged-water bottles a year.',
          '3. Buy bigger packs — a single 5-litre refill pouch uses far less plastic than ten small sachets of the same product.',
          '4. Say no to freebie cutlery — the spoons, straws, and sauce sachets you never asked for are among the least recyclable plastics of all.',
          '5. Give your PET a second life — soft-drink and water bottles are among the most valuable recyclables in your home. Rinse, crush, cap back on, and schedule a pickup.',
        ],
        fact: 'Recycled PET does not vanish — it becomes fibre for clothing, fill for jackets, and new food-grade bottles. India recycles a higher share of its PET than most developed countries.',
      },
      {
        heading: 'The plastic you cannot avoid',
        paragraphs: [
          'Hard plastics (buckets, toys, containers), LDPE films, and thermocol all have recycling channels — KarmaVerse accepts each of them as separate categories, because they are processed differently. Keeping them clean and sorted is all you need to do; our agents handle the rest.',
        ],
      },
    ],
  },
  {
    id: 'composting-101',
    title: 'Composting 101: turn kitchen scraps into black gold',
    category: 'GUIDE',
    categoryColor: '#16a34a',
    source: 'KarmaVerse editorial',
    readTime: '4 min read',
    date: '6 Jul 2026',
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Compost_holes_for_kitchen_waste_%283109542259%29.jpg/960px-Compost_holes_for_kitchen_waste_%283109542259%29.jpg',
    intro:
      'More than half of a typical Indian household’s waste is organic — peels, leftovers, garden litter. In a landfill it rots into methane. In a compost bin it becomes free fertiliser.',
    sections: [
      {
        heading: 'Why landfilling food waste is the worst option',
        paragraphs: [
          'Buried under layers of garbage without oxygen, food waste decomposes anaerobically and releases methane — a greenhouse gas over 25 times more potent than carbon dioxide. Landfill fires, like the ones Delhi’s dumpsites are infamous for, are fuelled by exactly this gas.',
          'Composting the same waste at home produces no methane, no smell when done right, and a steady supply of rich, dark compost your plants will love.',
        ],
      },
      {
        heading: 'The simplest way to start',
        paragraphs: [
          'Take any container with a lid — a bucket works. Layer kitchen scraps with dry material like leaves, shredded newspaper, or cocopeat. Keep it about as moist as a wrung-out sponge, and give it a stir every few days to let air in.',
          'Add: fruit and vegetable peels, tea leaves, eggshells, garden waste. Avoid: meat, dairy, and oily food in an open home bin — they attract pests. In six to eight weeks, the bottom of your bin turns into crumbly, earthy compost.',
        ],
        fact: 'Composting at home can cut the waste your household sends out by 50% or more — and Indian city compost programs have shown it works at massive scale.',
      },
      {
        heading: 'Close the loop',
        paragraphs: [
          'With wet waste composted at home and dry waste going into a KarmaVerse pickup, an average household can shrink its real garbage output to a small fraction of what it was. That is the zero-waste direction — one bin at a time.',
        ],
      },
    ],
  },
  {
    id: 'after-your-pickup',
    title: 'What happens to your waste after a KarmaVerse pickup',
    category: 'EDUCATION',
    categoryColor: '#d97706',
    source: 'KarmaVerse editorial',
    readTime: '4 min read',
    date: '1 Jul 2026',
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Sims_Sunset_Park_Material_Recovery_Facility_-4.jpg/960px-Sims_Sunset_Park_Material_Recovery_Facility_-4.jpg',
    intro:
      'The doorstep pickup is just the first step. Here is the journey your recyclables take after the agent rides away — and why exact categories and weights matter.',
    sections: [
      {
        heading: 'Step 1: verification at your door',
        paragraphs: [
          'Your agent checks each item against the categories you booked — a working laptop is worth more than a dead one, copper wire more than mixed metal — and records verified weights and conditions. That verification is what converts into KarmaCoins XP in your wallet, so what you earn always reflects what was actually collected.',
        ],
      },
      {
        heading: 'Step 2: sorting and aggregation',
        paragraphs: [
          'Collected material goes to a sorting facility where it is separated further: PET from hard plastic, cardboard from paper grades, aluminium from steel. Clean, well-segregated pickups move through this stage almost untouched — another reason home segregation matters.',
          'Sorted material is compacted into bales. Baling matters because recyclers buy by the tonne: a bale of clear PET bottles is a commodity with a market price, not garbage.',
        ],
      },
      {
        heading: 'Step 3: authorized recyclers',
        paragraphs: [
          'Each material stream goes to a recycler authorized for it — paper mills, plastic reprocessors, metal smelters, and government-authorized e-waste dismantlers. There, your old newspaper becomes new paperboard, your PET bottles become fibre, and the copper from your dead charger heads back into new wiring.',
        ],
        fact: 'This traceable chain is why KarmaVerse asks for exact categories at booking — every material has a different destination, and the right sorting starts at your doorstep.',
      },
    ],
  },
  {
    id: 'most-valuable-bin-items',
    title: 'Paper, metal, glass: the most valuable things in your bin',
    category: 'EDUCATION',
    categoryColor: '#d97706',
    source: 'KarmaVerse editorial',
    readTime: '3 min read',
    date: '24 Jun 2026',
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Bales_of_PET_bottles_closeup.jpg/960px-Bales_of_PET_bottles_closeup.jpg',
    intro:
      'Not all waste is equal. Some of what you throw away is effectively raw material with a market price — which is exactly why different categories earn different KarmaCoins XP rates.',
    sections: [
      {
        heading: 'Metal: the infinite recyclable',
        paragraphs: [
          'Aluminium and steel can be recycled endlessly without losing quality. Making a can from recycled aluminium uses about 95% less energy than making it from ore — which is why aluminium and copper command the highest per-kg rates in your bin.',
          'Copper wire is the star: stripped and re-melted, it goes straight back into new cables. That is why it earns several times the rate of mixed metal scrap.',
        ],
      },
      {
        heading: 'Paper: trees and water saved',
        paragraphs: [
          'Recycling one tonne of paper saves roughly 17 trees and tens of thousands of litres of water compared to virgin production. Newspaper and cardboard are the workhorses — keep them dry, because moisture is the main reason paper gets rejected.',
        ],
        fact: 'Cardboard can be recycled five to seven times before its fibres get too short — after that it can still become egg trays and moulded packaging.',
      },
      {
        heading: 'Glass: 100% recyclable, forever',
        paragraphs: [
          'Glass can be melted and reformed indefinitely with no loss of purity. Colour-sorted bottles are the most useful, which is why beer, wine, and soft-drink bottles are separate categories in your pickup. Every bottle recycled saves enough energy to run an LED bulb for hours.',
          'Check the rate card on the Schedule pickup screen — it reflects these real material values, converted into KarmaCoins XP for you.',
        ],
      },
    ],
  },
];

export const getArticleById = (id?: string): Article =>
  ARTICLES.find((a) => a.id === id) || ARTICLES[0];
