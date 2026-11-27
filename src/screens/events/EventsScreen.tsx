import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Trophy, ArrowRight, X } from 'lucide-react-native';
import { useTheme, makeStyles } from '../../theme';
import { setPageMeta } from '../../utils/pageMeta';
import { WebFooter } from '../../components/shared/WebFooter';
import { eventHub, EventCard, EventStatus, fmtRange } from '../../services/eventhub';
import {
  EventHubHeader, EventCardView, Grid, StateView, StatusPill, Banner, PrimaryButton, SectionTitle, Contours, Countdown,
  LiveDot, useColumns, MAX_WIDTH, ctaLabel, nextMoment, categoryTheme, FadeIn, CountUp, Float,
} from '../../components/events/EventUI';

type When = 'any' | 'week' | 'month' | 'later';
const WHEN_LABEL: Record<When, string> = { any: 'Any date', week: 'Next 7 days', month: 'Next 30 days', later: 'Later' };

function inWindow(e: EventCard, when: When, now = Date.now()) {
  if (when === 'any') return true;
  const start = new Date(e.startAt).getTime();
  const end = new Date(e.endAt).getTime();
  if (when === 'later') return start > now + 30 * 86400000;
  const horizon = now + (when === 'week' ? 7 : 30) * 86400000;
  return end >= now && start <= horizon; // running now or starting within the window
}

const STEPS = [
  { t: 'Register free', d: 'One tap with your KarmaVerse account.' },
  { t: 'Do the daily task', d: 'A photo, a link or a few lines of proof.' },
  { t: 'Get verified points', d: 'Our team reviews every submission.' },
  { t: 'Earn your certificate', d: 'With a QR code anyone can check.' },
];

// karmaverse.earth/events: every published event and challenge.
export function EventsScreen({ navigation }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { cols, isWide, isPhone } = useColumns(330);
  const scrollRef = useRef<ScrollView>(null);
  const [listY, setListY] = useState(0);

  const [events, setEvents] = useState<EventCard[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<EventStatus | ''>('');
  const [when, setWhen] = useState<When>('any');

  const load = useCallback(async () => {
    setError(null);
    setEvents(null);
    try {
      const data = await eventHub.list();
      setEvents(data.events);
      setCategories(data.categories);
    } catch (e: any) {
      setError(e?.message || "Couldn't load events.");
    }
  }, []);

  useEffect(() => {
    load();
    return setPageMeta({
      title: 'EventHub: sustainability events and challenges | KarmaVerse',
      description: 'Join free sustainability challenges, campus events and competitions on KarmaVerse. Register, complete daily tasks, earn verified points and get a certificate.',
      canonical: 'https://karmaverse.earth/events',
    });
  }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (events || []).filter((e) =>
      (!category || e.category === category) &&
      (!status || e.status === status) &&
      inWindow(e, when) &&
      (!term || `${e.title} ${e.summary} ${e.category}`.toLowerCase().includes(term)));
  }, [events, q, category, status, when]);

  const featured = useMemo(() => {
    const open = (events || []).filter((e) => e.status !== 'completed');
    return open.find((e) => e.featured) || open[0] || null;
  }, [events]);

  const stats = useMemo(() => {
    const list = events || [];
    return {
      live: list.filter((e) => e.status === 'live').length,
      upcoming: list.filter((e) => e.status === 'upcoming').length,
      people: list.reduce((s, e) => s + e.participants, 0),
    };
  }, [events]);

  const filtering = !!(q.trim() || category || status || when !== 'any');
  const clearFilters = () => { setQ(''); setCategory(''); setStatus(''); setWhen('any'); };
  const groups: { key: EventStatus; title: string; eyebrow: string }[] = [
    { key: 'live', title: 'Happening now', eyebrow: 'Live' },
    { key: 'upcoming', title: 'Coming up', eyebrow: 'Upcoming' },
    { key: 'completed', title: 'Past events', eyebrow: 'Completed' },
  ];
  const open = (e: EventCard) => navigation.navigate('EventDetail', { slug: e.slug });
  const explore = () => scrollRef.current?.scrollTo({ y: Math.max(0, listY - 12), animated: true });
  const moment = featured ? nextMoment(featured) : null;
  const ft = categoryTheme(featured?.category);

  const chip = (label: string, on: boolean, onPress: () => void, key: string, Icon?: any) => (
    <TouchableOpacity key={key} onPress={onPress} style={[styles.chip, on && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
      {Icon && <Icon size={14} color={on ? colors.onPrimary : colors.primary} />}
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <EventHubHeader navigation={navigation} title="EventHub" active="events" />

        <View style={styles.page}>
          {/* Hero */}
          <LinearGradient colors={['#022c16', '#065f46', '#15803d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, isWide && styles.heroWide]}>
            <Contours color="#bbf7d0" opacity={0.28} />
            <View style={{ flex: 1, minWidth: 0, gap: 16 }}>
              <View style={styles.heroBadge}>
                <LiveDot color="#4ade80" size={7} />
                <Text style={styles.heroBadgeText}>{stats.live ? `${stats.live} live now` : 'KarmaVerse EventHub'}</Text>
              </View>
              <View>
                {['Participate.', 'Take action.', 'Create impact.', 'Earn recognition.'].map((line, i) => (
                  <FadeIn key={line} delay={120 + i * 140} distance={24}>
                    <Text style={[styles.heroTitle, isWide && styles.heroTitleWide, i === 2 && styles.heroAccent]}>{line}</Text>
                  </FadeIn>
                ))}
              </View>
              <FadeIn delay={720}><Text style={styles.heroText}>Free challenges for students and the KarmaVerse community. Do real green actions, get them verified, climb the leaderboard and earn certificates.</Text></FadeIn>
              <FadeIn delay={860} style={styles.row}>
                <PrimaryButton light label="Explore events" icon={<ArrowRight size={16} color={colors.primaryDeep} />} onPress={explore} />
                <PrimaryButton label="My events" onPress={() => navigation.navigate('MyEvents')} style={styles.ghostBtn} />
              </FadeIn>
            </View>
            <View style={[styles.statsCol, !isWide && styles.statsRow]}>
              {([
                [stats.live, 'live events'],
                [stats.upcoming, 'coming up'],
                [stats.people, 'people taking part'],
              ] as [number, string][]).map(([v, l], i) => (
                <FadeIn key={l} delay={300 + i * 150} style={!isWide ? { flex: 1 } : undefined}>
                  <Float distance={4} duration={2400 + i * 500}>
                    <View style={styles.stat}>
                      {events ? <CountUp value={v} style={[styles.statNum, isPhone && { fontSize: 26 }]} /> : <Text style={[styles.statNum, isPhone && { fontSize: 26 }]}>–</Text>}
                      <Text style={styles.statLabel}>{l}</Text>
                    </View>
                  </Float>
                </FadeIn>
              ))}
            </View>
          </LinearGradient>

          {/* How it works: a real sequence, so the steps are numbered. */}
          <View style={[styles.steps, isWide && { flexDirection: 'row' }]}>
            {STEPS.map((s, i) => (
              <FadeIn key={s.t} delay={500 + i * 110} style={[styles.step, isWide && { flex: 1 }]}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>{s.t}</Text>
                  <Text style={styles.stepText}>{s.d}</Text>
                </View>
              </FadeIn>
            ))}
          </View>

          <StateView loading={events === null && !error} error={error} onRetry={load}>
            {/* Featured */}
            {featured && !filtering && (
              <>
                <SectionTitle eyebrow="Featured">Don't miss this one</SectionTitle>
                <FadeIn delay={150} distance={30}>
                <Pressable
                  onPress={() => open(featured)}
                  accessibilityRole="link"
                  style={({ hovered }: any) => [styles.featured, isWide && styles.featuredWide, hovered && styles.featuredHover]}
                >
                  <View style={isWide ? { width: '50%' } : undefined}>
                    <Banner uri={featured.bannerUrl} height={isWide ? 360 : 210} title={featured.title} category={featured.category} />
                    <View style={styles.featuredPill}><StatusPill status={featured.status} onImage /></View>
                  </View>
                  <LinearGradient colors={[ft.from, ft.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.featuredBody}>
                    <Text style={styles.featuredCat}>{featured.category.toUpperCase()}</Text>
                    <Text style={styles.featuredTitle}>{featured.title}</Text>
                    <Text style={styles.featuredText}>{featured.summary}</Text>
                    <Text style={styles.featuredMeta}>{fmtRange(featured.startAt, featured.endAt)} · {featured.durationDays} days · {featured.fee} · {featured.participants.toLocaleString('en-IN')} joined</Text>
                    {moment && <Countdown at={moment.at} label={moment.label} onDark />}
                    <View style={styles.featuredCta}>
                      <Text style={styles.featuredCtaText}>{ctaLabel(featured)}</Text>
                      <ArrowRight size={16} color="#052e16" />
                    </View>
                  </LinearGradient>
                </Pressable>
                </FadeIn>
              </>
            )}

            {/* Search and filters */}
            <View onLayout={(e) => setListY(e.nativeEvent.layout.y)}>
              <SectionTitle eyebrow="Browse">Find your next challenge</SectionTitle>
              <View style={styles.searchBox}>
                <Search size={18} color={colors.textMuted} />
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Search by name, topic or category"
                  placeholderTextColor={colors.textFaint}
                  style={styles.searchInput}
                  accessibilityLabel="Search events"
                  nativeID="events-search"
                />
                {!!q && <TouchableOpacity onPress={() => setQ('')} accessibilityLabel="Clear search"><X size={18} color={colors.textMuted} /></TouchableOpacity>}
              </View>
              <View style={styles.filters}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {chip('All', !category, () => setCategory(''), 'c-all')}
                  {categories.map((c) => chip(c, category === c, () => setCategory(category === c ? '' : c), `c-${c}`, categoryTheme(c).Icon))}
                </ScrollView>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {chip('Any status', !status, () => setStatus(''), 's-all')}
                  {groups.map((g) => chip(g.eyebrow, status === g.key, () => setStatus(status === g.key ? '' : g.key), `s-${g.key}`))}
                  <View style={styles.chipDivider} />
                  {(Object.keys(WHEN_LABEL) as When[]).map((w) => chip(WHEN_LABEL[w], when === w, () => setWhen(w), `w-${w}`))}
                </ScrollView>
              </View>
            </View>

            {/* Lists */}
            {events && events.length === 0 && <StateView empty emptyText="No events are open yet. New challenges are announced here first, so check back soon." />}
            {events && events.length > 0 && filtering && (
              filtered.length === 0 ? (
                <View style={{ alignItems: 'center' }}>
                  <StateView empty emptyText="No events match these filters." />
                  <PrimaryButton quiet label="Clear filters" onPress={clearFilters} />
                </View>
              ) : (
                <>
                  <Text style={styles.resultCount}>{filtered.length} event{filtered.length === 1 ? '' : 's'}</Text>
                  <Grid cols={cols}>{filtered.map((e) => <EventCardView key={e.id} event={e} onPress={() => open(e)} />)}</Grid>
                </>
              )
            )}
            {events && events.length > 0 && !filtering && groups.map((g) => {
              const list = events.filter((e) => e.status === g.key);
              if (!list.length) return null;
              return (
                <View key={g.key}>
                  <SectionTitle eyebrow={g.eyebrow}>{g.title}</SectionTitle>
                  <Grid cols={cols}>{list.map((e) => <EventCardView key={e.id} event={e} onPress={() => open(e)} />)}</Grid>
                </View>
              );
            })}

            {events && events.length > 0 && (
              <Pressable onPress={() => navigation.navigate('EventLeaderboard', { slug: 'overall' })} style={({ hovered }: any) => [styles.lbBanner, hovered && { opacity: 0.94 }]} accessibilityRole="link">
                <View style={styles.lbIcon}><Trophy size={24} color="#a16207" /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.lbTitle}>Overall leaderboard</Text>
                  <Text style={styles.lbText}>Verified points from every EventHub event, in one ranking.</Text>
                </View>
                <ArrowRight size={20} color={colors.primaryDeep} />
              </Pressable>
            )}
          </StateView>
        </View>

        {Platform.OS === 'web' && <WebFooter />}
      </ScrollView>
    </SafeAreaView>
  );
}

const web = Platform.OS === 'web';
const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  page: { paddingHorizontal: 20, paddingBottom: 64, maxWidth: MAX_WIDTH, width: '100%', alignSelf: 'center', flexGrow: 1 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' },

  hero: { borderRadius: 28, padding: 24, gap: 24, marginTop: 14, overflow: 'hidden' },
  heroWide: { flexDirection: 'row', padding: 44, alignItems: 'center', gap: 40 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  heroBadgeText: { color: '#dcfce7', fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  heroTitle: { color: '#ffffff', fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -0.8 },
  heroTitleWide: { fontSize: 54, lineHeight: 56, letterSpacing: -1.6 },
  heroAccent: { color: '#86efac' },
  heroText: { color: '#d1fae5', fontSize: 16, lineHeight: 25, maxWidth: 560 },
  ghostBtn: { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  statsCol: { gap: 12, width: 250 },
  statsRow: { flexDirection: 'row', width: '100%', gap: 10 },
  stat: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 18, padding: 16 },
  statNum: { color: '#ffffff', fontSize: 34, fontWeight: '900', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  statLabel: { color: '#bbf7d0', fontSize: 12, fontWeight: '700' },

  steps: { gap: 10, marginTop: 14 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14 },
  stepNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: c.primaryDeep, fontWeight: '900', fontSize: 14 },
  stepTitle: { color: c.text, fontWeight: '800', fontSize: 14 },
  stepText: { color: c.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2 },

  featured: {
    borderRadius: 26, overflow: 'hidden', backgroundColor: c.surface,
    ...(web ? ({ boxShadow: '0 18px 40px rgba(5,46,22,0.18)', transitionDuration: '220ms', transitionProperty: 'transform' } as any) : { elevation: 3 }),
  },
  featuredWide: { flexDirection: 'row' },
  featuredHover: { transform: [{ translateY: -3 }] },
  featuredPill: { position: 'absolute', top: 16, left: 16 },
  featuredBody: { padding: 26, gap: 12, flex: 1, justifyContent: 'center' },
  featuredCat: { color: '#bbf7d0', fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  featuredTitle: { color: '#ffffff', fontSize: 28, fontWeight: '900', letterSpacing: -0.6, lineHeight: 32 },
  featuredText: { color: '#dcfce7', fontSize: 15, lineHeight: 22 },
  featuredMeta: { color: '#bbf7d0', fontSize: 13, fontWeight: '600' },
  featuredCta: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: '#ffffff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 100, marginTop: 6 },
  featuredCtaText: { color: '#052e16', fontWeight: '900', fontSize: 14 },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.border, borderRadius: 100, paddingHorizontal: 18 },
  searchInput: { flex: 1, paddingVertical: 13, fontSize: 15, color: c.text, ...(web ? ({ outlineStyle: 'none' } as any) : {}) },
  filters: { gap: 10, marginTop: 14, marginBottom: 20 },
  chips: { gap: 8, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  chipOn: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: c.textMuted },
  chipTextOn: { color: c.onPrimary },
  chipDivider: { width: 1, height: 22, backgroundColor: c.border, marginHorizontal: 4 },
  resultCount: { fontSize: 13, color: c.textMuted, fontWeight: '700', marginBottom: 12 },

  lbBanner: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 36, padding: 20, borderRadius: 20, backgroundColor: c.primarySoft },
  lbIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  lbTitle: { fontSize: 17, fontWeight: '900', color: c.primaryDeep },
  lbText: { fontSize: 13, color: c.primaryDeep, opacity: 0.8, marginTop: 2 },
}));
