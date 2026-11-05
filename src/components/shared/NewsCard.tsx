import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Newspaper, ArrowUpRight } from 'lucide-react-native';
import { NewsItem, formatNewsDate } from '../../data/news';

const openExternal = (url: string) => {
  if (Platform.OS === 'web') window.open(url, '_blank', 'noopener');
  else Linking.openURL(url).catch(() => {});
};

export function NewsCard({ item, style }: { item: NewsItem; style?: any }) {
  const [hovered, setHovered] = useState(false);
  // Publisher images are hotlinked; if one is removed or blocked, show the
  // branded block instead of an empty grey box.
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <TouchableOpacity
      style={[s.card, hovered && s.cardHover, style]}
      onPress={() => openExternal(item.url)}
      activeOpacity={0.9}
      // @ts-ignore — web-only pointer events
      onMouseEnter={() => setHovered(true)}
      // @ts-ignore
      onMouseLeave={() => setHovered(false)}
      accessibilityRole="link"
    >
      {item.image && !imageFailed ? (
        <Image source={{ uri: item.image }} resizeMode="cover" style={s.image} onError={() => setImageFailed(true)} />
      ) : (
        <LinearGradient colors={['#052e16', '#166534']} style={[s.image, s.fallback]}>
          <Newspaper size={34} color="rgba(255,255,255,0.85)" />
        </LinearGradient>
      )}
      <View style={s.body}>
        <View style={s.metaRow}>
          <View style={s.sourceChip}>
            <Text style={s.sourceText}>{item.source}</Text>
          </View>
          <Text style={s.date}>{formatNewsDate(item.date)}</Text>
        </View>
        <Text style={s.title} numberOfLines={3}>{item.title}</Text>
        <Text style={s.summary} numberOfLines={3}>{item.summary}</Text>
        <View style={s.readRow}>
          <Text style={s.readText}>Read more</Text>
          <ArrowUpRight size={15} color="#16a34a" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'white', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 3,
  },
  cardHover: { transform: [{ translateY: -3 }], shadowOpacity: 0.12 },
  image: { width: '100%', height: 170 },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sourceChip: { backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  sourceText: { color: '#166534', fontSize: 11, fontWeight: '800' },
  date: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a', lineHeight: 25, marginBottom: 8 },
  summary: { fontSize: 14, color: '#64748b', fontWeight: '500', lineHeight: 21, marginBottom: 14 },
  readRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 'auto' as any },
  readText: { color: '#16a34a', fontSize: 14, fontWeight: '800' },
});
