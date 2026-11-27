import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Award } from 'lucide-react-native';
import { useTheme, makeStyles } from '../../theme';
import { setPageMeta } from '../../utils/pageMeta';
import { WebFooter } from '../../components/shared/WebFooter';
import { eventHub, Dashboard, DashboardItem, fmtDate, isLoginError, downloadBase64 } from '../../services/eventhub';
import { EventHubHeader, StateView, StatusPill, PrimaryButton, SectionTitle, Notice, Chip, goLogin, Grid, useColumns, MAX_WIDTH } from '../../components/events/EventUI';

// karmaverse.earth/my-events: the participant's dashboard across every event.
export function MyEventsScreen({ navigation }: any) {
  const styles = useStyles();
  const { cols } = useColumns(420);
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setData(null);
    setNeedsLogin(false);
    try {
      setData(await eventHub.dashboard());
    } catch (e: any) {
      if (isLoginError(e)) setNeedsLogin(true);
      setError(e?.message || "Couldn't load your events.");
    }
  }, []);

  useEffect(() => {
    load();
    return setPageMeta({ title: 'My events | KarmaVerse EventHub' });
  }, [load]);

  const t = data?.totals;
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <EventHubHeader navigation={navigation} title="My events" subtitle="Your challenges, points and certificates" active="mine" />
        <View style={styles.page}>
          <StateView loading={!data && !error} error={error} onRetry={load} onLogin={needsLogin ? () => goLogin(navigation, 'MyEvents') : undefined}>
            {data && t && (
              <>
                <View style={styles.totals}>
                  {[
                    ['Verified points', t.points],
                    ['Tasks approved', t.approvedTasks],
                    ['Waiting for review', t.pendingSubmissions],
                    ['Certificates', t.certificates],
                    ['Overall rank', t.overallRank ? `#${t.overallRank}` : '–'],
                  ].map(([label, value]) => (
                    <View key={String(label)} style={styles.total}>
                      <Text style={styles.totalValue}>{value}</Text>
                      <Text style={styles.totalLabel}>{label}</Text>
                    </View>
                  ))}
                </View>

                {t.events === 0 && (
                  <View style={{ alignItems: 'center' }}>
                    <StateView empty emptyText="You haven't joined any events yet. Pick a challenge to get started." />
                    <PrimaryButton label="Explore events" onPress={() => navigation.navigate('Events')} />
                  </View>
                )}

                {data.active.length > 0 && <SectionTitle>Active</SectionTitle>}
                <Grid cols={cols}>{data.active.map((i) => <EventItem key={i.event.id} item={i} navigation={navigation} />)}</Grid>

                {data.history.length > 0 && <SectionTitle>History</SectionTitle>}
                <Grid cols={cols}>{data.history.map((i) => <EventItem key={i.event.id} item={i} navigation={navigation} />)}</Grid>
              </>
            )}
          </StateView>
        </View>
        {Platform.OS === 'web' && <WebFooter />}
      </ScrollView>
    </SafeAreaView>
  );
}

function EventItem({ item, navigation }: { item: DashboardItem; navigation: any }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const slug = item.event.slug;
  const [cert, setCert] = useState<{ busy: boolean; msg: string; bad?: boolean }>({ busy: false, msg: '' });

  const download = async () => {
    setCert({ busy: true, msg: '' });
    try {
      const r = await eventHub.certificate(slug);
      const ok = downloadBase64(r.fileName, 'application/pdf', r.pdfBase64);
      setCert({ busy: false, msg: ok ? `Downloaded. ID ${r.certificateId}` : `Certificate ID ${r.certificateId}. Download it from karmaverse.earth on a computer.` });
    } catch (e: any) {
      setCert({ busy: false, msg: e?.message || 'Could not get the certificate.', bad: true });
    }
  };

  return (
    <View style={styles.item}>
      <View style={styles.row}>
        <StatusPill status={item.event.status} />
        <Text style={styles.muted}>Joined {fmtDate(item.registration.registeredAt)}</Text>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('EventDetail', { slug })}>
        <Text style={styles.itemTitle}>{item.event.title}</Text>
      </TouchableOpacity>
      <Text style={styles.muted}>{item.points} of {item.maxScore} points · {item.approvedTasks}/{item.totalTasks} tasks approved{item.rank ? ` · rank #${item.rank}` : ''}</Text>
      <View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.min(100, (item.points / Math.max(1, item.maxScore)) * 100)}%` as any }]} /></View>

      {item.openTasks.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Open tasks</Text>
          {item.openTasks.map((o) => <Text key={o.id} style={styles.line}>Day {o.day}: {o.title} · closes {fmtDate(o.closesAt, true)}</Text>)}
        </View>
      )}
      {item.pendingSubmissions.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Waiting for review</Text>
          {item.pendingSubmissions.map((p) => <Text key={p.day} style={styles.line}>Day {p.day}: {p.title} · sent {fmtDate(p.submittedAt)}</Text>)}
        </View>
      )}
      {item.rejectedSubmissions.length > 0 && (
        <View style={styles.block}>
          <Text style={[styles.blockTitle, { color: colors.danger }]}>Needs changes</Text>
          {item.rejectedSubmissions.map((r) => <Text key={r.day} style={styles.line}>Day {r.day}: {r.reason}{r.canResubmit ? ' (you can submit again)' : ''}</Text>)}
        </View>
      )}

      <View style={styles.row}>
        {item.event.status !== 'completed' && <PrimaryButton label="Participate" onPress={() => navigation.navigate('EventParticipate', { slug })} />}
        <PrimaryButton quiet label="Leaderboard" onPress={() => navigation.navigate('EventLeaderboard', { slug })} />
        {item.certificate.enabled && (item.certificate.eligible || item.certificate.issued) && (
          <PrimaryButton quiet busy={cert.busy} label="Certificate" icon={<Award size={16} color={colors.primaryDeep} />} onPress={download} />
        )}
      </View>
      {item.certificate.issued && <Chip tone="good" label={`Certificate ${item.certificate.certificateId}`} />}
      {!!cert.msg && <Notice tone={cert.bad ? 'bad' : 'good'}>{cert.msg}</Notice>}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  page: { paddingHorizontal: 20, paddingBottom: 56, maxWidth: MAX_WIDTH, width: '100%', alignSelf: 'center', flexGrow: 1 },
  totals: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  total: { flexGrow: 1, minWidth: 140, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 14 },
  totalValue: { fontSize: 26, fontWeight: '900', color: c.text, fontVariant: ['tabular-nums'] },
  totalLabel: { fontSize: 12, fontWeight: '700', color: c.textMuted },
  item: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  itemTitle: { fontSize: 18, fontWeight: '900', color: c.text },
  muted: { fontSize: 13, color: c.textMuted },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: c.primary },
  block: { gap: 3 },
  blockTitle: { fontSize: 12, fontWeight: '800', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  line: { fontSize: 13, color: c.text, lineHeight: 19 },
}));
