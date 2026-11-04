import { ImageSourcePropType } from 'react-native';

export interface Newsletter {
  id: string;
  issue: string;
  month: string;
  title: string;
  summary: string;
  highlights: { value: string; label: string }[];
  cover: ImageSourcePropType;
  pdf: string; // path under public/, served from the website root
}

// Monthly newsletter PDFs. Newest first; the first one is featured. Add the PDF
// to public/newsletters/ and a cover (first page, ~440px wide) to assets/newsletters/.
export const NEWSLETTERS: Newsletter[] = [
  {
    id: '2026-09',
    issue: 'Issue 09',
    month: 'September 2026',
    title: 'Our Impact',
    summary: 'A month of action, awareness and impact: waste recovery, Swachhata Hi Seva drives, safety kits for waste workers, students learning the 3Rs, KarmaVer$e at the September event and our hackathons.',
    highlights: [
      { value: '74,992 kg', label: 'Waste collected' },
      { value: '135,693 kg', label: 'CO₂e avoided' },
      { value: '500+', label: 'Citizens engaged' },
    ],
    cover: require('../../assets/newsletters/2026-09-cover.jpg'),
    pdf: '/newsletters/2026-09.pdf',
  },
];
