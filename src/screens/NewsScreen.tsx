import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Newspaper } from 'lucide-react-native';
import { NEWS } from '../data/news';
import { NewsCard } from '../components/shared/NewsCard';
import { NEWSLETTERS } from '../data/newsletters';
import { NewsletterCard } from '../components/shared/NewsletterCard';
import { WebFooter } from '../components/shared/WebFooter';
import { getToken } from '../utils/tokenStore';

const MAX = 1100;

export function NewsScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const columns = width >= 1000 ? 3 : width >= 640 ? 2 : 1;
  const pad = width < 640 ? 16 : 32;
  const gap = 20;
  const inner = Math.min(width, MAX) - pad * 2;
  const cardWidth = Math.floor((inner - gap * (columns - 1)) / columns);

  // A shared /news link has no history; send guests to the landing page and
  // logged-in users to the app home instead of a dead back button.
  const goBack = async () => {
    if (navigation.canGoBack()) { navigation.goBack(); return; }
    const token = await getToken().catch(() => null);
    navigation.navigate(token ? 'App' : 'Splash');
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#052e16', '#064e3b', '#0f766e']} style={s.header}>
          <SafeAreaView edges={['top']}>
            <View style={[s.headerInner, { paddingHorizontal: pad }]}>
              <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.7} accessibilityLabel="Back">
                <ChevronLeft size={22} color="white" />
              </TouchableOpacity>
              <View style={s.badge}>
                <Newspaper size={14} color="#4ade80" />
                <Text style={s.badgeText}>NEWSROOM</Text>
              </View>
              <Text style={[s.title, width < 640 && { fontSize: 32, lineHeight: 38 }]}>News and updates</Text>
              <Text style={s.sub}>Our monthly newsletter, press coverage and updates from the KarmaVer$e team.</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={[s.container, { paddingHorizontal: pad }]}>
          {NEWSLETTERS.length > 0 && (
            <View style={{ marginBottom: 48 }}>
              <Text style={s.sectionTitle}>Monthly newsletter</Text>
              <NewsletterCard item={NEWSLETTERS[0]} />
            </View>
          )}
          <Text style={s.sectionTitle}>In the news</Text>
          {NEWS.length === 0 ? (
            <Text style={s.empty}>No news yet. Check back soon.</Text>
          ) : (
            <View style={[s.grid, { gap }]}>
              {NEWS.map((item) => (
                <NewsCard key={item.id} item={item} style={{ width: cardWidth }} />
              ))}
            </View>
          )}
        </View>

        {Platform.OS === 'web' && <WebFooter />}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingBottom: 48 },
  headerInner: { maxWidth: MAX, width: '100%', alignSelf: 'center', paddingTop: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16 },
  badgeText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  title: { color: 'white', fontSize: 42, fontWeight: '900', letterSpacing: -1, lineHeight: 50, marginBottom: 10 },
  sub: { color: 'rgba(255,255,255,0.72)', fontSize: 16, fontWeight: '500', lineHeight: 24, maxWidth: 560 },
  container: { maxWidth: MAX, width: '100%', alignSelf: 'center', paddingTop: 40, paddingBottom: 60 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  sectionTitle: { color: '#0f172a', fontSize: 22, fontWeight: '900', letterSpacing: -0.3, marginBottom: 18 },
  empty: { textAlign: 'center', color: '#64748b', fontSize: 15, fontWeight: '600', paddingVertical: 40 },
});
