import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme, makeStyles } from '../../theme';
import { setPageMeta } from '../../utils/pageMeta';
import { WebFooter } from '../../components/shared/WebFooter';
import { eventHub, LeaderboardPage, fmtDate } from '../../services/eventhub';
import { EventHubHeader, StateView, useColumns } from '../../components/events/EventUI';

type Scope = 'event' | 'day' | 'overall';

// Gold, silver and bronze, toned to sit with the earthy palette.
const MEDALS = [
  { bg: '#fde68a', ring: '#f59e0b', ink: '#713f12' },
  { bg: '#e2e8f0', ring: '#94a3b8', ink: '#334155' },
  { bg: '#fed7aa', ring: '#c2410c', ink: '#7c2d12' },
];

// karmaverse.earth/events/:slug/leaderboard (slug "overall" shows every event combined).
export function EventLeaderboardScreen({ navigation, route }: any) {
  const slug = String(route?.params?.slug || 'overall');
  const isOverall = slug === 'overall';
  const styles = useStyles();
  const { colors } = useTheme();
  const { isPhone } = useColumns();
  const [scope, setScope] = useState<Scope>(isOverall ? 'overall' : 'event');
  const [day, setDay] = useState(1);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LeaderboardPage | null>(null);
  const [days, setDays] = useState<number[]>([]);
  const [title, setTitle] = useState(isOverall ? 'Overall leaderboard' : 'Leaderboard');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setData(null);
    try {
      const d = await eventHub.leaderboard(slug, scope, scope === 'day' ? day : undefined, page);
      setData(d);
      if (d.event) { setDays(Array.from(new Set(d.event.days)).sort((a, b) => a - b)); setTitle(d.event.title); }
    } catch (e: any) {
      setError(e?.message || "Couldn't load the leaderboard.");
    }
  }, [slug, scope, day, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => setPageMeta({
    title: `${title}: leaderboard | KarmaVerse EventHub`,
    description: 'Ranked by verified points. Ties go to whoever reached the score first.',
  }), [title]);

  const tab = (label: string, s: Scope) => (
    <TouchableOpacity key={s} onPress={() => { setScope(s); setPage(1); }} style={[styles.tab, scope === s && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: scope === s }}>
      <Text style={[styles.tabText, scope === s && styles.tabTextOn]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <EventHubHeader navigation={navigation} title={title} subtitle="Ranked by verified points. Ties go to whoever got there first." active="events" />
        <View style={styles.page}>
          <View style={styles.tabs} accessibilityRole="tablist">
            {!isOverall && tab('This event', 'event')}
            {!isOverall && days.length > 1 && tab('Daily', 'day')}
            {tab('Overall', 'overall')}
          </View>
          {scope === 'day' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
              {days.map((d) => (
                <TouchableOpacity key={d} onPress={() => { setDay(d); setPage(1); }} style={[styles.dayChip, day === d && styles.dayChipOn]}>
                  <Text style={[styles.dayChipText, day === d && styles.dayChipTextOn]}>Day {d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <StateView loading={!data && !error} error={error} onRetry={load} empty={!!data && data.rows.length === 0} emptyText="No verified points yet. Rankings appear once the first submissions are approved.">
            {data && (
              <>
                {data.page === 1 && data.rows.length >= 3 && (
                  <View style={styles.podium}>
                    {[1, 0, 2].map((i) => {
                      const r = data.rows[i];
                      const medal = MEDALS[i];
                      return (
                        <View key={r.rank} style={[styles.podiumCol, i === 0 && { marginTop: 0 }]}>
                          <View style={[styles.medal, { backgroundColor: medal.bg, borderColor: medal.ring }]}>
                            <Text style={[styles.medalText, { color: medal.ink }]}>{r.rank}</Text>
                          </View>
                          <Text style={styles.podiumName} numberOfLines={1}>{r.name}</Text>
                          <Text style={styles.podiumSub} numberOfLines={1}>{r.college}</Text>
                          <View style={[styles.podiumBlock, { height: [96, 72, 56][i], backgroundColor: medal.bg }]}>
                            <Text style={[styles.podiumPts, { color: medal.ink }]}>{r.points}</Text>
                            <Text style={[styles.podiumUnit, { color: medal.ink }]}>pts</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
                <View style={styles.table} accessibilityRole="list">
                  <View style={[styles.tr, styles.th]}>
                    <Text style={[styles.cRank, styles.thText]}>#</Text>
                    <Text style={[styles.cName, styles.thText]}>Participant</Text>
                    {!isPhone && <Text style={[styles.cCollege, styles.thText]}>College</Text>}
                    {!isPhone && <Text style={[styles.cCity, styles.thText]}>City</Text>}
                    <Text style={[styles.cPts, styles.thText]}>Points</Text>
                  </View>
                  {data.rows.map((r) => (
                    <View key={r.rank} style={[styles.tr, r.rank <= 3 && styles.top3]}>
                      <Text style={[styles.cRank, styles.rank, r.rank <= 3 && { color: colors.primary }]}>{r.rank}</Text>
                      <View style={styles.cName}>
                        <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
                        {isPhone && <Text style={styles.sub} numberOfLines={1}>{[r.college, r.city].filter(Boolean).join(' · ')}</Text>}
                      </View>
                      {!isPhone && <Text style={[styles.cCollege, styles.cell]} numberOfLines={1}>{r.college}</Text>}
                      {!isPhone && <Text style={[styles.cCity, styles.cell]} numberOfLines={1}>{r.city}</Text>}
                      <Text style={[styles.cPts, styles.pts]}>{r.points}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.pager}>
                  <TouchableOpacity disabled={page <= 1} onPress={() => setPage(page - 1)} style={[styles.pageBtn, page <= 1 && { opacity: 0.4 }]} accessibilityLabel="Previous page">
                    <ChevronLeft size={18} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.sub}>Page {data.page} of {data.pages} · {data.total.toLocaleString('en-IN')} ranked</Text>
                  <TouchableOpacity disabled={page >= data.pages} onPress={() => setPage(page + 1)} style={[styles.pageBtn, page >= data.pages && { opacity: 0.4 }]} accessibilityLabel="Next page">
                    <ChevronRight size={18} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.sub}>Updated {fmtDate(data.updatedAt, true)}. Only first names and initials are shown.</Text>
              </>
            )}
          </StateView>
        </View>
        {Platform.OS === 'web' && <WebFooter />}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  page: { paddingHorizontal: 20, paddingBottom: 56, maxWidth: 900, width: '100%', alignSelf: 'center', flexGrow: 1, gap: 14 },
  tabs: { flexDirection: 'row', gap: 6, backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 4, alignSelf: 'flex-start', marginTop: 12 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9 },
  tabOn: { backgroundColor: c.surface },
  tabText: { fontSize: 14, fontWeight: '700', color: c.textMuted },
  tabTextOn: { color: c.text },
  days: { gap: 8 },
  dayChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  dayChipOn: { backgroundColor: c.primary, borderColor: c.primary },
  dayChipText: { fontSize: 13, fontWeight: '700', color: c.textMuted },
  dayChipTextOn: { color: c.onPrimary },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingTop: 8 },
  podiumCol: { flex: 1, alignItems: 'center', gap: 4, marginTop: 24, minWidth: 0 },
  medal: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  medalText: { fontSize: 18, fontWeight: '900' },
  podiumName: { fontSize: 14, fontWeight: '900', color: c.text, maxWidth: '100%' },
  podiumSub: { fontSize: 11, color: c.textMuted, maxWidth: '100%' },
  podiumBlock: { width: '100%', borderTopLeftRadius: 14, borderTopRightRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  podiumPts: { fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  podiumUnit: { fontSize: 11, fontWeight: '800' },
  table: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border, gap: 10 },
  th: { borderTopWidth: 0, backgroundColor: c.surfaceAlt, paddingVertical: 10 },
  thText: { fontSize: 11, fontWeight: '800', color: c.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' },
  top3: { backgroundColor: c.primarySoft },
  cRank: { width: 36 },
  cName: { flex: 2, minWidth: 0 },
  cCollege: { flex: 2 },
  cCity: { flex: 1 },
  cPts: { width: 60, textAlign: 'right' },
  rank: { fontSize: 15, fontWeight: '900', color: c.textMuted, fontVariant: ['tabular-nums'] },
  name: { fontSize: 15, fontWeight: '700', color: c.text },
  cell: { fontSize: 13, color: c.textMuted },
  pts: { fontSize: 16, fontWeight: '900', color: c.text, fontVariant: ['tabular-nums'] },
  sub: { fontSize: 12, color: c.textMuted },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  pageBtn: { padding: 8, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
}));
