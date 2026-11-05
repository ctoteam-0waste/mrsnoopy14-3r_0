export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  date: string; // YYYY-MM-DD
  url: string;
  image?: string; // remote image URL; the card shows a branded fallback without one
}

// Press coverage shared by the CEO. Keep newest first; the home page shows the
// first three. Images are the publishers' own preview images; the card falls
// back to the branded block when there is none or it fails to load.
export const NEWS: NewsItem[] = [
  {
    id: 'et-3r-zerowaste-scales-up',
    title: '3R ZeroWaste scales up as circular economy gains ground in India',
    summary: '3R ZeroWaste has grown 15 to 20 per cent every year since 2020 while expanding across waste recovery, ESG services and citizen engagement.',
    source: 'ET WasteManagement',
    date: '2026-10-21',
    url: 'https://wastemanagement.economictimes.indiatimes.com/news/business-investments/3r-zerowaste-scales-up-as-circular-economy-gains-ground-in-india/135095391',
    image: 'https://etimg.etb2bimg.com/thumb/msid-135095391,imgsize-313038,width-1200,height=627,overlay-etwastemanagement,resizemode-75/news/business-investments/3r-zerowaste-scales-up-as-circular-economy-gains-ground-in-india.jpg',
  },
  {
    id: 'theprint-3r-zerowaste-growth',
    title: '3R ZeroWaste reports consistent 15–20% annual growth, strengthening India’s circular economy movement',
    summary: 'Another year of strong performance for 3R ZeroWaste, which has kept up 15–20% annual growth since it started in 2020 and continues to speed up India’s move to a circular economy.',
    source: 'ThePrint',
    date: '2026-10-21',
    url: 'https://theprint.in/ani-press-releases/3r-zerowaste-reports-consistent-15-20-percent-annual-growth-strengthening-indias-circular-economy-movement/3077776/',
    // The article's own photo; its og:image is only ThePrint's default logo.
    image: 'https://staticprintenglish.theprint.in/wp-content/uploads/2026/10/ANI-20261021104251-696x522.jpg',
  },
  {
    id: 'apac-e-waste-urban-mining',
    title: 'India’s e-waste holds untapped potential for urban mining',
    summary: 'India’s fast-growing e-waste could become a major source of valuable metals and critical minerals, says 3R ZeroWaste co-founder Jaya Rao Challa.',
    source: 'APAC News Network',
    date: '2026-09-07',
    url: 'https://apacnewsnetwork.com/2026/09/india-e-waste-urban-mining-potential/',
    image: 'https://apacnewsnetwork.com/wp-content/uploads/2026/09/Image-31.webp?v=1788776107',
  },
  {
    id: 'alcircle-hidden-urban-mines',
    title: 'India’s hidden urban mines are going to landfills: why e-waste needs a second life',
    summary: 'Old phones, laptops and batteries are valuable “above-ground mines”. 3R ZeroWaste co-founder Jaya Rao Challa explains why they should reach authorised recyclers, not landfills.',
    source: 'AlCircle',
    date: '2026-09-07',
    url: 'https://www.alcircle.com/news/press-release/india-s-hidden-urban-mines-are-going-to-landfills-why-e-waste-needs-a-second-life-121073',
    image: 'https://assets.alcircle.com/dynamic/prod/news/20260907094923505_e5becc2f4_lg.webp',
  },
];

export function formatNewsDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
