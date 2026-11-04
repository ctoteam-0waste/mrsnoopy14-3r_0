import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform, Linking, useWindowDimensions } from 'react-native';
import { BookOpen, Download, ArrowRight } from 'lucide-react-native';
import { Newsletter } from '../../data/newsletters';

const SITE = 'https://karmaverse.earth';

// The PDF lives on the website. The app opens the public copy.
const pdfUrl = (path: string) => (Platform.OS === 'web' ? path : SITE + path);

const openPdf = (path: string) => {
  if (Platform.OS === 'web') window.open(pdfUrl(path), '_blank', 'noopener');
  else Linking.openURL(pdfUrl(path)).catch(() => {});
};

const downloadPdf = (item: Newsletter) => {
  if (Platform.OS !== 'web') { openPdf(item.pdf); return; }
  const a = document.createElement('a');
  a.href = pdfUrl(item.pdf);
  a.download = `KarmaVerse-newsletter-${item.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

export function NewsletterCard({ item }: { item: Newsletter }) {
  const { width } = useWindowDimensions();
  const wide = width >= 760;

  return (
    <View style={[s.card, wide && s.cardWide]}>
      <TouchableOpacity onPress={() => openPdf(item.pdf)} activeOpacity={0.9} style={[s.coverWrap, wide ? s.coverWide : s.coverNarrow]} accessibilityRole="link" accessibilityLabel={`Open the ${item.month} newsletter`}>
        <Image source={item.cover} style={s.cover} resizeMode="cover" />
      </TouchableOpacity>

      <View style={[s.body, wide && { paddingLeft: 32 }]}>
        <View style={s.badge}>
          <Text style={s.badgeText}>MONTHLY NEWSLETTER</Text>
        </View>
        <Text style={s.meta}>{item.issue} · {item.month}</Text>
        <Text style={[s.title, !wide && { fontSize: 24 }]}>{item.title}</Text>
        <Text style={s.summary}>{item.summary}</Text>

        <View style={s.stats}>
          {item.highlights.map((h) => (
            <View key={h.label} style={s.stat}>
              <Text style={s.statValue}>{h.value}</Text>
              <Text style={s.statLabel}>{h.label}</Text>
            </View>
          ))}
        </View>

        <View style={[s.actions, !wide && { flexDirection: 'column', alignItems: 'stretch', flexWrap: 'nowrap' }]}>
          <TouchableOpacity style={s.primaryBtn} onPress={() => openPdf(item.pdf)} activeOpacity={0.85}>
            <BookOpen size={17} color="white" />
            <Text style={s.primaryText}>Read newsletter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={() => downloadPdf(item)} activeOpacity={0.85}>
            <Download size={17} color="#16a34a" />
            <Text style={s.secondaryText}>Download PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// "Waste collected" reads as "waste collected" inside a sentence; acronyms such
// as "CO₂e avoided" keep their capitals.
const midSentence = (label: string) =>
  /^[A-Z][a-z]/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label;

// One-line pointer to the latest issue, for the home page news section.
export function NewsletterStrip({ item }: { item: Newsletter }) {
  const { width } = useWindowDimensions();
  const narrow = width < 640;
  return (
    <TouchableOpacity style={s.strip} onPress={() => openPdf(item.pdf)} activeOpacity={0.9} accessibilityRole="link">
      <Image source={item.cover} style={s.stripCover} resizeMode="cover" />
      <View style={{ flex: 1 }}>
        <Text style={s.stripLabel}>NEW · {item.month.toUpperCase()} NEWSLETTER</Text>
        <Text style={s.stripTitle} numberOfLines={2}>
          {item.title}: {item.highlights.slice(0, 2).map((h) => `${h.value} ${midSentence(h.label)}`).join(', ')} and more
        </Text>
      </View>
      {!narrow && (
        <View style={s.stripCta}>
          <Text style={s.stripCtaText}>Read newsletter</Text>
          <ArrowRight size={16} color="#16a34a" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'white', borderRadius: 22, borderWidth: 1, borderColor: '#e2e8f0', padding: 20,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 3,
  },
  cardWide: { flexDirection: 'row', alignItems: 'center', padding: 28 },
  coverWrap: {
    borderRadius: 12, overflow: 'hidden', backgroundColor: '#f1f5f9',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 6,
  },
  // A4 portrait (1 : 1.414)
  coverWide: { width: 230, aspectRatio: 1 / 1.414 },
  coverNarrow: { width: '62%', maxWidth: 240, aspectRatio: 1 / 1.414, alignSelf: 'center', marginBottom: 22 },
  cover: { width: '100%', height: '100%' },
  body: { flex: 1 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12 },
  badgeText: { color: '#166534', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  meta: { color: '#64748b', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900', letterSpacing: -0.5, marginBottom: 10 },
  summary: { color: '#475569', fontSize: 15, fontWeight: '500', lineHeight: 23, marginBottom: 18 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  stat: { backgroundColor: '#f0fdf4', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, minWidth: 120, flexGrow: 1 },
  statValue: { color: '#15803d', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#475569', fontSize: 12, fontWeight: '600', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16a34a', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 13 },
  primaryText: { color: 'white', fontSize: 15, fontWeight: '800' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: '#bbf7d0', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  secondaryText: { color: '#16a34a', fontSize: 15, fontWeight: '800' },

  strip: {
    flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 24,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 18, padding: 14,
  },
  stripCover: { width: 52, height: 74, borderRadius: 6 },
  stripLabel: { color: '#15803d', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  stripTitle: { color: '#0f172a', fontSize: 15, fontWeight: '700', lineHeight: 21 },
  stripCta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  stripCtaText: { color: '#16a34a', fontSize: 14, fontWeight: '800' },
});
