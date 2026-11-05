import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Clock, RefreshCw, TrendingUp } from 'lucide-react-native';
import { BlogPost, categoryColor, fetchBlogPosts, fetchMostRead, formatBlogDate } from '../services/blog';
import { setPageMeta } from '../utils/pageMeta';
import { getToken } from '../utils/tokenStore';
import { WebFooter } from '../components/shared/WebFooter';
import { NewsletterBox } from '../components/blog/NewsletterBox';
import { useTheme, makeStyles } from '../theme';

// karmaverse.earth/blog — the same posts as 0waste.co.in/blog, read live from its feed.
export function BlogScreen({ navigation }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const cols = width >= 980 ? 3 : width >= 640 ? 2 : 1;

  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState('All');
  const [mostRead, setMostRead] = useState<string[]>([]);

  useEffect(() => {
    fetchMostRead()
      .then(({ mostRead: top, views }) => {
        const total = Object.values(views).reduce((a, b) => a + b, 0);
        if (top.length >= 3 && total >= 15) setMostRead(top.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async (force = false) => {
    setError(false);
    try {
      setPosts(await fetchBlogPosts(force));
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
    return setPageMeta({
      title: 'Blog — KarmaVerse',
      description: 'Practical guides on recycling, zero waste, EPR, ESG and climate action in India from the KarmaVerse and 3R ZeroWaste team.',
      canonical: 'https://karmaverse.earth/blog',
    });
  }, [load]);

  const goHome = async () => {
    if (navigation.canGoBack()) return navigation.goBack();
    navigation.navigate((await getToken().catch(() => null)) ? 'App' : 'Splash');
  };

  const categories = useMemo(() => ['All', ...Array.from(new Set((posts ?? []).map((p) => p.category)))], [posts]);
  const shown = (posts ?? []).filter((p) => category === 'All' || p.category === category);
  const featured = category === 'All' ? shown.find((p) => p.featured) ?? shown[0] : undefined;
  const rest = shown.filter((p) => p !== featured);
  const open = (p: BlogPost) => navigation.navigate('BlogPost', { slug: p.slug });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={goHome} accessibilityLabel="Back">
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} accessibilityRole="header">Blog</Text>
            <Text style={styles.headerSub}>Guides and stories on recycling, zero waste and climate action</Text>
          </View>
        </View>

        <View style={styles.body}>
          {posts === null && !error && <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />}

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>Couldn't load the blog. Check your connection and try again.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => load(true)}>
                <RefreshCw size={16} color={colors.onPrimary} />
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}

          {posts && posts.length === 0 && <Text style={styles.empty}>No posts yet — check back soon.</Text>}

          {posts && posts.length > 0 && (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {categories.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipOn]}>
                    <Text style={[styles.chipText, category === c && styles.chipTextOn]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {featured && (
                <TouchableOpacity style={styles.featuredCard} activeOpacity={0.9} onPress={() => open(featured)}>
                  {featured.image ? (
                    <Image source={{ uri: featured.image }} style={[styles.featuredImg, { height: width >= 640 ? 360 : 240 }]} resizeMode="cover" />
                  ) : (
                    <View style={[styles.featuredImg, { height: 240, backgroundColor: colors.primaryDeep }]} />
                  )}
                  <LinearGradient colors={['transparent', 'rgba(2,6,23,0.6)', 'rgba(2,6,23,0.94)']} style={styles.featuredOverlay} />
                  <View style={styles.featuredContent}>
                    <View style={[styles.categoryChip, { backgroundColor: categoryColor(featured.category) }]}>
                      <Text style={styles.categoryChipText}>{featured.category.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.featuredTitle}>{featured.title}</Text>
                    {width >= 640 && <Text style={styles.featuredSummary} numberOfLines={2}>{featured.summary}</Text>}
                    <View style={styles.metaRow}>
                      <Clock size={12} color="rgba(255,255,255,0.75)" />
                      <Text style={styles.featuredMeta}>{featured.readTime} read • {formatBlogDate(featured.date)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              <View style={styles.grid}>
                {rest.map((p) => (
                  <TouchableOpacity
                    key={p.slug}
                    style={[styles.card, { width: cols === 1 ? '100%' : `${100 / cols - 2}%` as any }]}
                    activeOpacity={0.88}
                    onPress={() => open(p)}
                  >
                    {p.image ? (
                      <Image source={{ uri: p.image }} style={styles.cardImg} resizeMode="cover" />
                    ) : (
                      <View style={[styles.cardImg, { backgroundColor: colors.primarySoft }]} />
                    )}
                    <View style={styles.cardBody}>
                      <Text style={[styles.categoryLabel, { color: categoryColor(p.category) }]}>{p.category.toUpperCase()}</Text>
                      <Text style={styles.cardTitle} numberOfLines={3}>{p.title}</Text>
                      <Text style={styles.cardSummary} numberOfLines={3}>{p.summary}</Text>
                      <View style={[styles.metaRow, { marginTop: 'auto' as any }]}>
                        <Clock size={11} color={colors.textFaint} />
                        <Text style={styles.cardMeta}>{p.readTime} read • {formatBlogDate(p.date)}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {category === 'All' && mostRead.length >= 3 && (
                <View style={styles.mostRead}>
                  <View style={styles.mostReadHead}>
                    <TrendingUp size={20} color={colors.primary} />
                    <Text style={styles.mostReadTitle}>Most read</Text>
                  </View>
                  {mostRead
                    .map((slug) => posts.find((p) => p.slug === slug))
                    .filter((p): p is BlogPost => Boolean(p))
                    .map((p, i) => (
                      <TouchableOpacity key={p.slug} style={styles.mostReadRow} onPress={() => open(p)} activeOpacity={0.85}>
                        <Text style={styles.mostReadNum}>{i + 1}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.categoryLabel, { color: categoryColor(p.category) }]}>{p.category.toUpperCase()}</Text>
                          <Text style={styles.mostReadItem} numberOfLines={2}>{p.title}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                </View>
              )}

              <NewsletterBox />
            </>
          )}
        </View>

        {Platform.OS === 'web' && <WebFooter />}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 40, paddingBottom: 18, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  backBtn: { padding: 8, backgroundColor: c.surface, borderRadius: 12, elevation: 1 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: c.text },
  headerSub: { fontSize: 14, color: c.textMuted, fontWeight: '500', marginTop: 2 },
  body: { paddingHorizontal: 20, paddingBottom: 48, maxWidth: 1200, width: '100%', alignSelf: 'center', flexGrow: 1 },

  chips: { gap: 8, paddingBottom: 18 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  chipOn: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: c.textMuted },
  chipTextOn: { color: c.onPrimary },

  featuredCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 24, backgroundColor: '#0f172a' },
  featuredImg: { width: '100%' },
  featuredOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '75%' },
  featuredContent: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, maxWidth: 760 },
  categoryChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, marginBottom: 10 },
  categoryChipText: { color: 'white', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  featuredTitle: { fontSize: 24, fontWeight: '800', color: 'white', lineHeight: 31, marginBottom: 8 },
  featuredSummary: { fontSize: 15, color: 'rgba(255,255,255,0.82)', lineHeight: 22, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  featuredMeta: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 20 },
  card: { backgroundColor: c.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
  cardImg: { width: '100%', aspectRatio: 16 / 9 },
  cardBody: { padding: 16, gap: 8, flexGrow: 1 },
  categoryLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: c.text, lineHeight: 23 },
  cardSummary: { fontSize: 14, color: c.textMuted, lineHeight: 21 },
  cardMeta: { fontSize: 11.5, color: c.textFaint, fontWeight: '500' },

  mostRead: { marginTop: 32, gap: 10 },
  mostReadHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  mostReadTitle: { fontSize: 22, fontWeight: '900', color: c.text },
  mostReadRow: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: c.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: c.border },
  mostReadNum: { fontSize: 30, fontWeight: '900', color: c.primary, opacity: 0.7, width: 26, textAlign: 'center' },
  mostReadItem: { fontSize: 16, fontWeight: '800', color: c.text, lineHeight: 22, marginTop: 3 },
  errorBox: { alignItems: 'center', gap: 14, marginTop: 50 },
  errorText: { fontSize: 15, color: c.textMuted, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100 },
  retryText: { color: c.onPrimary, fontWeight: '700' },
  empty: { fontSize: 15, color: c.textMuted, textAlign: 'center', marginTop: 50 },
}));
