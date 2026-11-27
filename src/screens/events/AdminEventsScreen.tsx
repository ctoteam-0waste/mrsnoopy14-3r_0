import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, Image, Linking, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, X, ExternalLink, Download, Plus, RefreshCw, ImagePlus } from 'lucide-react-native';
import { useTheme, makeStyles } from '../../theme';
import { setPageMeta } from '../../utils/pageMeta';
import {
  eventHubAdmin, AdminEvent, AdminTask, QueueItem, Participant, Analytics, EventCard, Accepts,
  fmtDate, isLoginError, downloadText, pickImageFile, compressImage,
} from '../../services/eventhub';
import { EventHubHeader, StateView, PrimaryButton, SectionTitle, Field, Notice, Chip, StatusPill, goLogin } from '../../components/events/EventUI';

type Tab = 'review' | 'participants' | 'analytics' | 'event' | 'tasks' | 'certificates' | 'audit';
type Role = 'reviewer' | 'admin' | 'owner';

// Dates are typed and shown in India time: "2026-12-07 09:00".
function toIstInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 330 * 60000);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 16).replace('T', ' ');
}
function fromIstInput(s: string): string | '' | null {
  const t = s.trim();
  if (!t) return '';
  const m = t.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/);
  if (!m) return null;
  const d = new Date(`${m[1]}T${(m[2] || '00').padStart(2, '0')}:${m[3] || '00'}:00+05:30`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
function faqToText(f: { q: string; a: string }[]) {
  return f.map((x) => `Q: ${x.q}\nA: ${x.a}`).join('\n\n');
}
function textToFaq(t: string) {
  const out: { q: string; a: string }[] = [];
  let cur: { q: string; a: string } | null = null;
  t.split(/\r?\n/).forEach((line) => {
    const s = line.trim();
    if (!s) return;
    const q = s.match(/^Q[:.)-]\s*(.*)$/i);
    const a = s.match(/^A[:.)-]\s*(.*)$/i);
    if (q) { cur = { q: q[1], a: '' }; out.push(cur); }
    else if (cur) cur.a = `${cur.a ? cur.a + ' ' : ''}${a ? a[1] : s}`;
  });
  return out.filter((x) => x.q && x.a);
}

// karmaverse.earth/admin/events: role-based EventHub administration.
export function AdminEventsScreen({ navigation }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [events, setEvents] = useState<(EventCard & { published: boolean })[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [eventId, setEventId] = useState<string>('');
  const [tab, setTab] = useState<Tab>('review');
  const [creating, setCreating] = useState(false);

  const loadEvents = useCallback(async () => {
    const r = await eventHubAdmin.events();
    setEvents(r.events);
    setCategories(r.categories);
    setEventId((cur) => cur || r.events[0]?.id || '');
  }, []);

  const init = useCallback(async () => {
    setError(null);
    setNeedsLogin(false);
    try {
      const me = await eventHubAdmin.me();
      setRole(me.role);
      await loadEvents();
    } catch (e: any) {
      if (isLoginError(e)) setNeedsLogin(true);
      setError(e?.status === 403 ? 'This page is for the KarmaVerse EventHub team. Ask an admin to add your KarmaVerse email to the Admins tab.' : e?.message || "Couldn't open the admin dashboard.");
    }
  }, [loadEvents]);

  useEffect(() => {
    init();
    return setPageMeta({ title: 'EventHub admin | KarmaVerse' });
  }, [init]);

  const isAdmin = role === 'admin' || role === 'owner';
  const tabs: { key: Tab; label: string; admin?: boolean }[] = [
    { key: 'review', label: 'Review' },
    { key: 'participants', label: 'Participants', admin: true },
    { key: 'analytics', label: 'Analytics', admin: true },
    { key: 'event', label: 'Event settings', admin: true },
    { key: 'tasks', label: 'Tasks & scoring', admin: true },
    { key: 'certificates', label: 'Certificates', admin: true },
    { key: 'audit', label: 'Audit log', admin: true },
  ];
  const current = events.find((e) => e.id === eventId);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <EventHubHeader navigation={navigation} title="EventHub admin" subtitle={role ? `Signed in as ${role}` : undefined} active="admin" />
        <View style={styles.page}>
          <StateView loading={!role && !error} error={error} onRetry={init} onLogin={needsLogin ? () => goLogin(navigation, 'AdminEvents') : undefined}>
            {role && (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventPicker}>
                  {events.map((e) => (
                    <TouchableOpacity key={e.id} onPress={() => { setEventId(e.id); setCreating(false); }} style={[styles.evChip, eventId === e.id && !creating && styles.evChipOn]}>
                      <Text style={[styles.evChipText, eventId === e.id && !creating && styles.evChipTextOn]} numberOfLines={1}>{e.title}</Text>
                      <Text style={[styles.evChipSub, eventId === e.id && !creating && styles.evChipTextOn]}>{e.published ? e.status : 'draft'} · {e.participants}</Text>
                    </TouchableOpacity>
                  ))}
                  {isAdmin && (
                    <TouchableOpacity onPress={() => { setCreating(true); setTab('event'); }} style={[styles.evChip, creating && styles.evChipOn]}>
                      <Plus size={16} color={creating ? colors.onPrimary : colors.primary} />
                      <Text style={[styles.evChipText, creating && styles.evChipTextOn]}>New event</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                {current && !creating && (
                  <View style={styles.row}>
                    {current.published ? <StatusPill status={current.status} /> : <Chip tone="warn" label="Draft (not public)" />}
                    <Text style={styles.muted}>/events/{current.slug}</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('EventDetail', { slug: current.slug })}><Text style={styles.link}>Open page</Text></TouchableOpacity>
                  </View>
                )}

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
                  {tabs.filter((t) => !t.admin || isAdmin).map((t) => (
                    <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === t.key }}>
                      <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {creating && tab === 'event' ? (
                  <EventEditor key="new" categories={categories} onSaved={async (id) => { setCreating(false); await loadEvents(); setEventId(id); setTab('tasks'); }} />
                ) : !eventId ? (
                  <StateView empty emptyText="No events yet. Create the first one with New event." />
                ) : (
                  <>
                    {tab === 'review' && <ReviewTab key={eventId} eventId={eventId} />}
                    {tab === 'participants' && isAdmin && <ParticipantsTab key={eventId} eventId={eventId} />}
                    {tab === 'analytics' && isAdmin && <AnalyticsTab key={eventId} eventId={eventId} />}
                    {tab === 'event' && isAdmin && <EventEditor key={eventId} eventId={eventId} categories={categories} onSaved={() => loadEvents()} onCategories={setCategories} />}
                    {tab === 'tasks' && isAdmin && <TasksTab key={eventId} eventId={eventId} />}
                    {tab === 'certificates' && isAdmin && <CertificatesTab key={eventId} eventId={eventId} />}
                    {tab === 'audit' && isAdmin && <AuditTab />}
                  </>
                )}
              </>
            )}
          </StateView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Review ───────────────────────────────────────────────────────────────────

function ReviewTab({ eventId }: { eventId: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [day, setDay] = useState(0);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; pages: number; rows: QueueItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [days, setDays] = useState<number[]>([]);
  useEffect(() => {
    eventHubAdmin.event(eventId).then((r) => setDays(Array.from(new Set(r.tasks.map((t) => t.day))).sort((a, b) => a - b))).catch(() => {});
  }, [eventId]);

  const load = useCallback(async () => {
    setError(null);
    setData(null);
    setSelected([]);
    try { setData(await eventHubAdmin.queue(eventId, status, day, page)); }
    catch (e: any) { setError(e?.message || "Couldn't load submissions."); }
  }, [eventId, status, day, page]);
  useEffect(() => { load(); }, [load]);

  const bulk = async () => {
    try {
      const r = await eventHubAdmin.bulkApprove(selected);
      setMsg(`Approved ${r.approved}.${r.failed.length ? ` ${r.failed.length} could not be approved: ${r.failed[0].message}` : ''}`);
      load();
    } catch (e: any) { setMsg(e?.message || 'Bulk approve failed.'); }
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.row}>
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <TouchableOpacity key={s} onPress={() => { setStatus(s); setPage(1); }} style={[styles.chip, status === s && styles.chipOn]}>
            <Text style={[styles.chipText, status === s && styles.chipTextOn]}>{s[0].toUpperCase() + s.slice(1)}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.sep} />
        {[0, ...days].map((d) => (
          <TouchableOpacity key={d} onPress={() => { setDay(d); setPage(1); }} style={[styles.chip, day === d && styles.chipOn]}>
            <Text style={[styles.chipText, day === d && styles.chipTextOn]}>{d ? `Day ${d}` : 'All days'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {status === 'pending' && !!data?.rows.length && (
        <View style={styles.row}>
          <PrimaryButton quiet label={selected.length === data.rows.length ? 'Clear selection' : 'Select page'} onPress={() => setSelected(selected.length === data.rows.length ? [] : data.rows.map((r) => r.id))} />
          <PrimaryButton label={`Approve selected (${selected.length})`} disabled={!selected.length} onPress={bulk} />
          <Text style={styles.muted}>Bulk approval gives no quality points.</Text>
        </View>
      )}
      {!!msg && <Notice>{msg}</Notice>}
      <StateView loading={!data && !error} error={error} onRetry={load} empty={!!data && !data.rows.length} emptyText={status === 'pending' ? 'Nothing waiting for review.' : 'No submissions here.'}>
        {data && (
          <>
            <Text style={styles.muted}>{data.total} {status}{status === 'pending' ? ', oldest first' : ''}</Text>
            {data.rows.map((r) => (
              <ReviewCard key={r.id} item={r} selected={selected.includes(r.id)} onToggle={() => setSelected((s) => s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id])} onDone={load} />
            ))}
            <Pager page={page} pages={data.pages} onPage={setPage} />
          </>
        )}
      </StateView>
      <Text style={styles.muted}>Tip: you can also review in the spreadsheet. Set Status and Quality on the Submissions tab; points update the same way.</Text>
    </View>
  );
}

function ReviewCard({ item, selected, onToggle, onDone }: { item: QueueItem; selected: boolean; onToggle: () => void; onDone: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [quality, setQuality] = useState<number>(item.quality ?? 0);
  const [reason, setReason] = useState(item.reason || '');
  const [busy, setBusy] = useState<'' | 'approved' | 'rejected' | 'pending'>('');
  const [err, setErr] = useState('');
  const act = async (decision: 'approved' | 'rejected' | 'pending') => {
    setErr('');
    if (decision === 'rejected' && !reason.trim()) { setErr('Write a reason. The participant will see it.'); return; }
    setBusy(decision);
    try { await eventHubAdmin.review(item.id, decision, quality, reason.trim()); onDone(); }
    catch (e: any) { setErr(e?.message || 'Could not save.'); }
    finally { setBusy(''); }
  };
  return (
    <View style={[styles.card, selected && { borderColor: colors.primary }]}>
      <View style={styles.row}>
        {item.status === 'pending' && <Switch value={selected} onValueChange={onToggle} accessibilityLabel="Select for bulk approval" trackColor={{ true: colors.primary, false: colors.borderStrong }} />}
        <Text style={styles.cardTitle}>Day {item.day}: {item.taskTitle}</Text>
        <Text style={styles.muted}>{item.name} · {item.college} · {fmtDate(item.submittedAt, true)}{item.attempt > 1 ? ` · attempt ${item.attempt}` : ''}</Text>
      </View>
      <View style={styles.reviewBody}>
        {!!item.thumbnail && (
          <TouchableOpacity onPress={() => item.fileUrl && Linking.openURL(item.fileUrl)} accessibilityLabel="Open full photo in Drive">
            <Image source={{ uri: item.thumbnail }} style={styles.thumb} resizeMode="cover" />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1, minWidth: 220, gap: 6 }}>
          {!!item.text && <Text style={styles.body}>{item.text}</Text>}
          {!!item.link && (
            <TouchableOpacity onPress={() => Linking.openURL(item.link)} style={styles.row}>
              <ExternalLink size={14} color={colors.primary} /><Text style={styles.link} numberOfLines={1}>{item.linkType}: {item.link}</Text>
            </TouchableOpacity>
          )}
          {!!item.fileUrl && <TouchableOpacity onPress={() => Linking.openURL(item.fileUrl)}><Text style={styles.link}>Open full photo</Text></TouchableOpacity>}
        </View>
      </View>
      {item.qualityMax > 0 && (
        <View style={styles.row}>
          <Text style={styles.muted}>Quality bonus</Text>
          {Array.from({ length: item.qualityMax + 1 }, (_, q) => (
            <TouchableOpacity key={q} onPress={() => setQuality(q)} style={[styles.qBtn, quality === q && styles.chipOn]} accessibilityLabel={`Quality ${q}`}>
              <Text style={[styles.chipText, quality === q && styles.chipTextOn]}>{q}</Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.muted}>= {item.points + quality} pts if approved</Text>
        </View>
      )}
      <Field id={`reason-${item.id}`} label="Reason (needed to reject; shown to the participant)" value={reason} onChangeText={setReason} maxLength={300} placeholder="e.g. The photo doesn't show sorted waste" />
      <View style={styles.row}>
        <PrimaryButton label="Approve" busy={busy === 'approved'} icon={<Check size={16} color={colors.onPrimary} />} onPress={() => act('approved')} />
        <PrimaryButton danger label="Reject" busy={busy === 'rejected'} icon={<X size={16} color={colors.onPrimary} />} onPress={() => act('rejected')} />
        {item.status !== 'pending' && <PrimaryButton quiet label="Move back to pending" busy={busy === 'pending'} onPress={() => act('pending')} />}
      </View>
      {!!err && <Notice tone="bad">{err}</Notice>}
    </View>
  );
}

// ── Participants ─────────────────────────────────────────────────────────────

function ParticipantsTab({ eventId }: { eventId: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; pages: number; rows: Participant[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try { setData(await eventHubAdmin.participants(eventId, q, page)); }
    catch (e: any) { setError(e?.message || "Couldn't load participants."); }
  }, [eventId, q, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const exportCsv = async (kind: 'registrations' | 'submissions') => {
    try {
      const r = await eventHubAdmin.exportCsv(eventId, kind);
      setMsg(downloadText(r.fileName, 'text/csv;charset=utf-8', '﻿' + r.csv) ? `Exported ${r.rows} rows.` : 'CSV export works in a web browser.');
    } catch (e: any) { setMsg(e?.message || 'Export failed.'); }
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.row}>
        <View style={{ flex: 1, minWidth: 220 }}><Field id="p-search" label="Search" value={q} onChangeText={(v) => { setQ(v); setPage(1); }} placeholder="Name, email, phone, college or city" /></View>
        <PrimaryButton quiet label="Registrations CSV" icon={<Download size={16} color={colors.primaryDeep} />} onPress={() => exportCsv('registrations')} />
        <PrimaryButton quiet label="Submissions CSV" icon={<Download size={16} color={colors.primaryDeep} />} onPress={() => exportCsv('submissions')} />
      </View>
      {!!msg && <Notice>{msg}</Notice>}
      <StateView loading={!data && !error} error={error} onRetry={load} empty={!!data && !data.rows.length} emptyText="No participants match.">
        {data && (
          <>
            <Text style={styles.muted}>{data.total} participants</Text>
            {data.rows.map((p) => (
              <View key={p.userId} style={styles.card}>
                <TouchableOpacity onPress={() => setOpenId(openId === p.userId ? '' : p.userId)} style={styles.row}>
                  <Text style={styles.cardTitle}>{p.name}</Text>
                  <Text style={styles.muted}>{p.college} · {p.city}</Text>
                  <Chip tone={p.status === 'registered' ? 'good' : 'bad'} label={p.status} />
                  <Text style={styles.points}>{p.points} pts</Text>
                </TouchableOpacity>
                {openId === p.userId && <ParticipantDetail eventId={eventId} p={p} onChanged={load} />}
              </View>
            ))}
            <Pager page={page} pages={data.pages} onPage={setPage} />
          </>
        )}
      </StateView>
    </View>
  );
}

function ParticipantDetail({ eventId, p, onChanged }: { eventId: string; p: Participant; onChanged: () => void }) {
  const styles = useStyles();
  const [pts, setPts] = useState('');
  const [reason, setReason] = useState('');
  const [ledger, setLedger] = useState<Awaited<ReturnType<typeof eventHubAdmin.ledger>> | null>(null);
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);
  useEffect(() => { eventHubAdmin.ledger(eventId, p.userId).then(setLedger).catch(() => {}); }, [eventId, p.userId]);

  const update = async (changes: { status?: string; certificateOverride?: string }) => {
    try { await eventHubAdmin.updateParticipant(eventId, p.userId, changes); setMsg({ t: 'Saved.' }); onChanged(); }
    catch (e: any) { setMsg({ t: e?.message || 'Could not save.', bad: true }); }
  };
  const adjust = async () => {
    const n = Math.round(Number(pts));
    if (!n) { setMsg({ t: 'Enter a whole number of points, e.g. 5 or -5.', bad: true }); return; }
    try {
      const r = await eventHubAdmin.adjust(eventId, p.userId, n, reason);
      setMsg({ t: `Done. New total ${r.total} points.` });
      setPts(''); setReason('');
      eventHubAdmin.ledger(eventId, p.userId).then(setLedger).catch(() => {});
      onChanged();
    } catch (e: any) { setMsg({ t: e?.message || 'Could not adjust.', bad: true }); }
  };

  return (
    <View style={{ gap: 10, marginTop: 6 }}>
      <Text style={styles.muted}>{p.email} · {p.phone} · registered {fmtDate(p.registeredAt, true)}{p.referredByCode ? ` · referred by ${p.referredByCode}` : ''}</Text>
      <View style={styles.row}>
        <Text style={styles.muted}>Status</Text>
        {['registered', 'withdrawn', 'disqualified'].map((s) => (
          <TouchableOpacity key={s} onPress={() => update({ status: s })} style={[styles.chip, p.status === s && styles.chipOn]}><Text style={[styles.chipText, p.status === s && styles.chipTextOn]}>{s}</Text></TouchableOpacity>
        ))}
      </View>
      <View style={styles.row}>
        <Text style={styles.muted}>Certificate</Text>
        {[['', 'By the rule'], ['eligible', 'Always eligible'], ['blocked', 'Blocked']].map(([v, l]) => (
          <TouchableOpacity key={v} onPress={() => update({ certificateOverride: v })} style={[styles.chip, p.certificateOverride === v && styles.chipOn]}><Text style={[styles.chipText, p.certificateOverride === v && styles.chipTextOn]}>{l}</Text></TouchableOpacity>
        ))}
      </View>
      <View style={styles.row}>
        <View style={{ width: 120 }}><Field id={`adj-${p.userId}`} label="Points (+/-)" value={pts} onChangeText={setPts} keyboardType="numbers-and-punctuation" maxLength={5} /></View>
        <View style={{ flex: 1, minWidth: 200 }}><Field id={`adjr-${p.userId}`} label="Reason (kept in the audit log)" value={reason} onChangeText={setReason} maxLength={300} /></View>
        <PrimaryButton label="Adjust points" onPress={adjust} />
      </View>
      {!!msg && <Notice tone={msg.bad ? 'bad' : 'good'}>{msg.t}</Notice>}
      {ledger && (
        <View style={styles.table}>
          {ledger.rows.map((r, i) => (
            <View key={i} style={styles.tr}>
              <Text style={[styles.cell, { width: 140 }]}>{fmtDate(r.at, true)}</Text>
              <Text style={[styles.cell, { width: 70 }]}>{r.source}</Text>
              <Text style={[styles.cell, { width: 50, textAlign: 'right' }]}>{r.points > 0 ? `+${r.points}` : r.points}</Text>
              <Text style={[styles.cell, { flex: 1 }]} numberOfLines={1}>{r.reason} · {r.by}</Text>
            </View>
          ))}
          {!ledger.rows.length && <Text style={[styles.muted, { padding: 10 }]}>No points yet.</Text>}
        </View>
      )}
    </View>
  );
}

// ── Analytics ────────────────────────────────────────────────────────────────

function AnalyticsTab({ eventId }: { eventId: string }) {
  const styles = useStyles();
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    setData(null);
    try { setData(await eventHubAdmin.analytics(eventId)); }
    catch (e: any) { setError(e?.message || "Couldn't load analytics."); }
  }, [eventId]);
  useEffect(() => { load(); }, [load]);
  const t = data?.totals;
  const pct = (v: number | null) => (v === null ? '–' : `${v}%`);
  return (
    <StateView loading={!data && !error} error={error} onRetry={load}>
      {data && t && (
        <View style={{ gap: 6 }}>
          <View style={styles.tiles}>
            {[
              ['Registrations', t.registrations.toLocaleString('en-IN'), `${t.referredRegistrations} via referral`],
              ['Active participants', t.activeParticipants.toLocaleString('en-IN'), 'submitted at least once'],
              ['Approval rate', pct(t.approvalRate), `${t.approved} approved · ${t.rejected} rejected`],
              ['Completion rate', pct(t.completionRate), `${t.metCertificateRule} met the certificate rule`],
              ['Waiting for review', t.pending.toLocaleString('en-IN'), `${t.submissions} submissions in all`],
              ['Finished every task', t.completedAllTasks.toLocaleString('en-IN'), 'all tasks approved'],
            ].map(([l, v, s]) => (
              <View key={l} style={styles.tile}><Text style={styles.tileLabel}>{l}</Text><Text style={styles.tileValue}>{v}</Text><Text style={styles.muted}>{s}</Text></View>
            ))}
          </View>
          <SectionTitle>Daily registrations</SectionTitle>
          <MeterList rows={data.dailyRegistrations.map((d) => ({ label: fmtDate(`${d.date}T12:00:00+05:30`), value: d.count }))} empty="No registrations yet." />
          <SectionTitle>Task completion by day</SectionTitle>
          <MeterList rows={data.taskCompletion.map((d) => ({ label: `Day ${d.day}: ${d.title}`, value: d.approved, note: `${d.submitted} submitted · ${d.pending} pending · ${d.rejected} rejected` }))} empty="No tasks." unit="approved" />
          <SectionTitle>Colleges</SectionTitle>
          <MeterList rows={data.colleges.map((c) => ({ label: c.college, value: c.registrations, note: `${c.active} active` }))} empty="No registrations yet." unit="registered" />
          <SectionTitle>Referrals</SectionTitle>
          <MeterList rows={data.referrals.map((r) => ({ label: `${r.referrer} (${r.code})`, value: r.registrations, note: `${r.active} active` }))} empty="No referred registrations yet." unit="referred" />
        </View>
      )}
    </StateView>
  );
}

/** Labelled rows with a single-colour meter; every value is printed, so nothing relies on colour alone. */
function MeterList({ rows, empty, unit }: { rows: { label: string; value: number; note?: string }[]; empty: string; unit?: string }) {
  const styles = useStyles();
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <Text style={styles.muted}>{empty}</Text>;
  return (
    <View style={styles.table}>
      {rows.map((r, i) => (
        <View key={i} style={styles.meterRow}>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <View style={styles.row}>
              <Text style={styles.cellStrong} numberOfLines={1}>{r.label}</Text>
              {!!r.note && <Text style={styles.muted}>{r.note}</Text>}
            </View>
            <View style={styles.meterTrack}><View style={[styles.meterFill, { width: `${(r.value / max) * 100}%` as any }]} /></View>
          </View>
          <Text style={styles.meterValue}>{r.value.toLocaleString('en-IN')}{unit ? <Text style={styles.muted}> {unit}</Text> : null}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Event settings ───────────────────────────────────────────────────────────

const BLANK: Partial<AdminEvent> = {
  title: '', slug: '', category: '', summary: '', overview: '', bannerUrl: '', objectives: [], eligibility: [], rules: [], rewards: [], faq: [],
  audience: '', fee: 'Free', startAt: '', endAt: '', regOpensAt: '', regClosesAt: '', maxParticipants: 0, lateSubmissions: true,
  pickupBonus: 0, certificatesEnabled: false, certificateRule: 'minApprovedTasks=1', featured: false,
};

function EventEditor({ eventId, categories, onSaved, onCategories }: { eventId?: string; categories: string[]; onSaved: (id: string) => void; onCategories?: (c: string[]) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [ev, setEv] = useState<Partial<AdminEvent> | null>(eventId ? null : { ...BLANK, category: categories[0] || '' });
  const [text, setText] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [cats, setCats] = useState(categories.join('\n'));

  const hydrate = (e: Partial<AdminEvent>) => {
    setEv(e);
    setText({
      objectives: (e.objectives || []).join('\n'), eligibility: (e.eligibility || []).join('\n'), rules: (e.rules || []).join('\n'),
      rewards: (e.rewards || []).join('\n'), faq: faqToText(e.faq || []),
      startAt: toIstInput(e.startAt), endAt: toIstInput(e.endAt), regOpensAt: toIstInput(e.regOpensAt), regClosesAt: toIstInput(e.regClosesAt),
      maxParticipants: String(e.maxParticipants || 0), pickupBonus: String(e.pickupBonus || 0),
    });
  };
  useEffect(() => {
    if (!eventId) { hydrate({ ...BLANK, category: categories[0] || '' }); return; }
    eventHubAdmin.event(eventId).then((r) => hydrate(r.event)).catch((e) => setError(e?.message || "Couldn't load the event."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const set = (k: keyof AdminEvent) => (v: any) => setEv((e) => ({ ...(e || {}), [k]: v }));
  const setT = (k: string) => (v: string) => setText((t) => ({ ...t, [k]: v }));

  const save = async () => {
    if (!ev) return;
    setMsg(null);
    const dates: Record<string, string> = {};
    for (const k of ['startAt', 'endAt', 'regOpensAt', 'regClosesAt']) {
      const v = fromIstInput(text[k] || '');
      if (v === null) { setMsg({ t: `Write dates as YYYY-MM-DD HH:MM (India time), e.g. 2026-12-07 09:00.`, bad: true }); return; }
      dates[k] = v;
    }
    setBusy(true);
    try {
      const lines = (s: string) => (s || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
      const r = await eventHubAdmin.saveEvent({
        ...ev, ...dates,
        objectives: lines(text.objectives), eligibility: lines(text.eligibility), rules: lines(text.rules), rewards: lines(text.rewards),
        faq: textToFaq(text.faq || ''), maxParticipants: Number(text.maxParticipants) || 0, pickupBonus: Number(text.pickupBonus) || 0,
      });
      hydrate(r.event);
      setMsg({ t: eventId ? 'Saved. The public page updates within a minute.' : 'Event created as a draft. Add its tasks next.' });
      onSaved(r.event.id);
    } catch (e: any) { setMsg({ t: e?.message || 'Could not save.', bad: true }); }
    finally { setBusy(false); }
  };

  const publish = async (on: boolean) => {
    if (!ev?.id) return;
    try { await eventHubAdmin.publish(ev.id, on); setEv({ ...ev, published: on }); setMsg({ t: on ? 'Published. It is now visible on /events.' : 'Unpublished. It is hidden from the public.' }); onSaved(ev.id); }
    catch (e: any) { setMsg({ t: e?.message || 'Could not change.', bad: true }); }
  };

  const banner = async () => {
    try {
      const f = await pickImageFile();
      if (!f) return;
      const img = await compressImage(f, 1800);
      const r = await eventHubAdmin.uploadBanner(img.base64);
      set('bannerUrl')(r.url);
      setMsg({ t: 'Banner uploaded. Save to keep it.' });
    } catch (e: any) { setMsg({ t: e?.message || 'Upload failed.', bad: true }); }
  };

  const saveCats = async () => {
    try {
      const r = await eventHubAdmin.saveCategories(cats.split(/\r?\n/).map((c) => c.trim()).filter(Boolean));
      onCategories?.(r.categories);
      setMsg({ t: 'Categories saved.' });
    } catch (e: any) { setMsg({ t: e?.message || 'Could not save categories.', bad: true }); }
  };

  if (error) return <Notice tone="bad">{error}</Notice>;
  if (!ev) return <StateView loading />;
  const toggle = (label: string, k: keyof AdminEvent) => (
    <View style={styles.row}>
      <Switch value={!!ev[k]} onValueChange={set(k)} trackColor={{ true: colors.primary, false: colors.borderStrong }} accessibilityLabel={label} />
      <Text style={styles.body}>{label}</Text>
    </View>
  );
  return (
    <View style={{ gap: 14 }}>
      {ev.id && (
        <View style={styles.row}>
          {ev.published ? <Chip tone="good" label="Published" /> : <Chip tone="warn" label="Draft" />}
          <PrimaryButton quiet={!!ev.published} label={ev.published ? 'Unpublish' : 'Publish'} onPress={() => publish(!ev.published)} />
        </View>
      )}
      <Cols>
        <Field id="e-title" label="Title *" value={ev.title} onChangeText={set('title')} maxLength={120} />
        <Field id="e-slug" label="Web address *" value={ev.slug} onChangeText={(v) => set('slug')(v.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} hint={`karmaverse.earth/events/${ev.slug || 'your-event'}`} maxLength={60} />
      </Cols>
      <Text style={styles.label}>Category *</Text>
      <View style={styles.row}>
        {categories.map((c) => (
          <TouchableOpacity key={c} onPress={() => set('category')(c)} style={[styles.chip, ev.category === c && styles.chipOn]}><Text style={[styles.chipText, ev.category === c && styles.chipTextOn]}>{c}</Text></TouchableOpacity>
        ))}
      </View>
      <Field id="e-summary" label="Short description * (on cards)" value={ev.summary} onChangeText={set('summary')} maxLength={300} multiline />
      <View style={styles.row}>
        <View style={{ flex: 1, minWidth: 240 }}><Field id="e-banner" label="Banner image URL" value={ev.bannerUrl} onChangeText={set('bannerUrl')} autoCapitalize="none" placeholder="https://..." /></View>
        {Platform.OS === 'web' && <PrimaryButton quiet label="Upload banner" icon={<ImagePlus size={16} color={colors.primaryDeep} />} onPress={banner} />}
      </View>
      {!!ev.bannerUrl && <Image source={{ uri: ev.bannerUrl }} style={styles.bannerPreview} resizeMode="cover" />}
      <Cols>
        <Field id="e-start" label="Starts (India time) *" value={text.startAt} onChangeText={setT('startAt')} placeholder="2026-12-07 00:00" />
        <Field id="e-end" label="Ends (India time) *" value={text.endAt} onChangeText={setT('endAt')} placeholder="2026-12-13 23:59" />
        <Field id="e-ropen" label="Registration opens" value={text.regOpensAt} onChangeText={setT('regOpensAt')} placeholder="Blank = now" />
        <Field id="e-rclose" label="Registration closes" value={text.regClosesAt} onChangeText={setT('regClosesAt')} placeholder="Blank = when the event ends" />
        <Field id="e-max" label="Max participants (0 = no limit)" value={text.maxParticipants} onChangeText={setT('maxParticipants')} keyboardType="number-pad" />
        <Field id="e-fee" label="Registration fee" value={ev.fee} onChangeText={set('fee')} maxLength={60} />
        <Field id="e-aud" label="Audience" value={ev.audience} onChangeText={set('audience')} maxLength={200} />
        <Field id="e-bonus" label="Pickup bonus points (0 = off)" value={text.pickupBonus} onChangeText={setT('pickupBonus')} keyboardType="number-pad" />
      </Cols>
      {toggle('Featured on /events', 'featured')}
      {toggle('Allow late submissions (missed days stay open until the end)', 'lateSubmissions')}
      <Field id="e-over" label="Overview" value={ev.overview} onChangeText={set('overview')} multiline maxLength={5000} />
      <Cols>
        <Field id="e-obj" label="Objectives (one per line)" value={text.objectives} onChangeText={setT('objectives')} multiline />
        <Field id="e-elig" label="Eligibility (one per line)" value={text.eligibility} onChangeText={setT('eligibility')} multiline />
        <Field id="e-rules" label="Rules and guidelines (one per line)" value={text.rules} onChangeText={setT('rules')} multiline />
        <Field id="e-rew" label="Rewards and certificates (one per line)" value={text.rewards} onChangeText={setT('rewards')} multiline />
      </Cols>
      <Field id="e-faq" label="FAQ" value={text.faq} onChangeText={setT('faq')} multiline hint={'Write each question as "Q: ..." and its answer on the next line as "A: ..."'} />
      <SectionTitle>Certificates</SectionTitle>
      {toggle('Certificates enabled (participants can download)', 'certificatesEnabled')}
      <Field id="e-rule" label="Who qualifies" value={ev.certificateRule} onChangeText={set('certificateRule')} hint='e.g. minApprovedTasks=5, or minApprovedTasks=5; minPoints=60, or allTasks' autoCapitalize="none" />
      {!!msg && <Notice tone={msg.bad ? 'bad' : 'good'}>{msg.t}</Notice>}
      <PrimaryButton label={eventId ? 'Save changes' : 'Create event'} busy={busy} onPress={save} />

      {eventId && (
        <>
          <SectionTitle>Event categories (all events)</SectionTitle>
          <Field id="e-cats" label="One per line, in display order" value={cats} onChangeText={setCats} multiline />
          <PrimaryButton quiet label="Save categories" onPress={saveCats} />
        </>
      )}
    </View>
  );
}

// ── Tasks & scoring ──────────────────────────────────────────────────────────

function TasksTab({ eventId }: { eventId: string }) {
  const styles = useStyles();
  const [tasks, setTasks] = useState<AdminTask[] | null>(null);
  const [maxScore, setMaxScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { const r = await eventHubAdmin.event(eventId); setTasks(r.tasks); setMaxScore(r.maxScore); }
    catch (e: any) { setError(e?.message || "Couldn't load tasks."); }
  }, [eventId]);
  useEffect(() => { load(); }, [load]);
  const nextDay = useMemo(() => (tasks && tasks.length ? Math.max(...tasks.map((t) => t.day)) + 1 : 1), [tasks]);
  return (
    <StateView loading={!tasks && !error} error={error} onRetry={load}>
      {tasks && (
        <View style={{ gap: 12 }}>
          <Notice>{`Maximum score for this event: ${maxScore} points (task points + quality bonus + pickup bonus). Points are awarded only when a submission is approved.`}</Notice>
          {tasks.map((t) => <TaskEditor key={t.id} task={t} onSaved={(r) => { setTasks(r.tasks); setMaxScore(r.maxScore); }} />)}
          <SectionTitle>Add a task</SectionTitle>
          <TaskEditor key={`new-${nextDay}`} task={{ eventId, day: nextDay, title: '', instructions: '', accepts: ['image', 'text'], points: 10, qualityMax: 5, autoApprove: false, allowResubmit: true, opensAt: null, closesAt: null, bonusRule: '', active: true }} onSaved={(r) => { setTasks(r.tasks); setMaxScore(r.maxScore); }} />
          <Text style={styles.muted}>Tasks open on their day (start date + day − 1) unless you set dates.</Text>
        </View>
      )}
    </StateView>
  );
}

function TaskEditor({ task, onSaved }: { task: AdminTask; onSaved: (r: { tasks: AdminTask[]; maxScore: number }) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [t, setT] = useState<AdminTask>(task);
  const [opens, setOpens] = useState(toIstInput(task.opensAt));
  const [closes, setCloses] = useState(toIstInput(task.closesAt));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);
  const set = (k: keyof AdminTask) => (v: any) => setT((x) => ({ ...x, [k]: v }));
  const toggleAccept = (a: Accepts) => set('accepts')(t.accepts.includes(a) ? t.accepts.filter((x) => x !== a) : [...t.accepts, a]);
  const save = async () => {
    const o = fromIstInput(opens);
    const c = fromIstInput(closes);
    if (o === null || c === null) { setMsg({ t: 'Write dates as YYYY-MM-DD HH:MM, or leave them blank.', bad: true }); return; }
    setBusy(true);
    setMsg(null);
    try {
      const r = await eventHubAdmin.saveTask({ ...t, opensAt: o || null, closesAt: c || null, points: Number(t.points), qualityMax: Number(t.qualityMax), day: Number(t.day) });
      setMsg({ t: 'Saved.' });
      onSaved(r);
    } catch (e: any) { setMsg({ t: e?.message || 'Could not save.', bad: true }); }
    finally { setBusy(false); }
  };
  const sw = (label: string, k: 'autoApprove' | 'allowResubmit' | 'active') => (
    <View style={styles.row}><Switch value={!!t[k]} onValueChange={set(k)} trackColor={{ true: colors.primary, false: colors.borderStrong }} accessibilityLabel={label} /><Text style={styles.body}>{label}</Text></View>
  );
  return (
    <View style={[styles.card, !t.active && { opacity: 0.65 }]}>
      <Cols min={140}>
        <Field id={`td-${t.id || 'new'}`} label="Day" value={String(t.day)} onChangeText={set('day')} keyboardType="number-pad" />
        <Field id={`tp-${t.id || 'new'}`} label="Points" value={String(t.points)} onChangeText={set('points')} keyboardType="number-pad" />
        <Field id={`tq-${t.id || 'new'}`} label="Quality bonus max" value={String(t.qualityMax)} onChangeText={set('qualityMax')} keyboardType="number-pad" />
      </Cols>
      <Field id={`tt-${t.id || 'new'}`} label="Title" value={t.title} onChangeText={set('title')} maxLength={120} />
      <Field id={`ti-${t.id || 'new'}`} label="Instructions" value={t.instructions} onChangeText={set('instructions')} multiline maxLength={3000} />
      <View style={styles.row}>
        <Text style={styles.muted}>Proof accepted</Text>
        {(['text', 'image', 'link'] as Accepts[]).map((a) => (
          <TouchableOpacity key={a} onPress={() => toggleAccept(a)} style={[styles.chip, t.accepts.includes(a) && styles.chipOn]}>
            <Text style={[styles.chipText, t.accepts.includes(a) && styles.chipTextOn]}>{a === 'image' ? 'Photo' : a === 'link' ? 'Link' : 'Text'}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => set('bonusRule')(t.bonusRule ? '' : 'karmaverse_pickup')} style={[styles.chip, !!t.bonusRule && styles.chipOn]}>
          <Text style={[styles.chipText, !!t.bonusRule && styles.chipTextOn]}>Pickup bonus check</Text>
        </TouchableOpacity>
      </View>
      <Cols>
        <Field id={`to-${t.id || 'new'}`} label="Opens (optional)" value={opens} onChangeText={setOpens} placeholder="Blank = on its day" />
        <Field id={`tc-${t.id || 'new'}`} label="Closes (optional)" value={closes} onChangeText={setCloses} placeholder="Blank = event rule" />
      </Cols>
      <View style={styles.row}>
        {sw('Approve automatically (no review)', 'autoApprove')}
        {sw('Allow resubmission after rejection', 'allowResubmit')}
        {sw('Active', 'active')}
      </View>
      {!!msg && <Notice tone={msg.bad ? 'bad' : 'good'}>{msg.t}</Notice>}
      <PrimaryButton label={t.id ? 'Save task' : 'Add task'} busy={busy} onPress={save} />
    </View>
  );
}

// ── Certificates, leaderboard, audit ─────────────────────────────────────────

function CertificatesTab({ eventId }: { eventId: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);
  const [certId, setCertId] = useState('');
  const [reason, setReason] = useState('');
  const issue = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await eventHubAdmin.issueCertificates(eventId);
      setMsg({ t: `Issued ${r.issued}. ${r.notEligible} not eligible. ${r.alreadyIssued} already had one.${r.remaining ? ` ${r.remaining} left: run it again.` : ''}` });
    } catch (e: any) { setMsg({ t: e?.message || 'Could not issue.', bad: true }); }
    finally { setBusy(false); }
  };
  const revoke = async () => {
    try { await eventHubAdmin.revokeCertificate(certId.trim().toUpperCase(), reason); setMsg({ t: `Revoked ${certId}. Its verification page now says so.` }); setCertId(''); setReason(''); }
    catch (e: any) { setMsg({ t: e?.message || 'Could not revoke.', bad: true }); }
  };
  const rebuild = async () => {
    try { const r = await eventHubAdmin.rebuildLeaderboard(); setMsg({ t: `Leaderboards refreshed (${r.scopes} rankings).` }); }
    catch (e: any) { setMsg({ t: e?.message || 'Could not refresh.', bad: true }); }
  };
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.body}>Participants can download their own certificate once "Certificates enabled" is on in Event settings and they meet the rule. Use this to create them for everyone at once, for example before emailing a link.</Text>
      <PrimaryButton label="Issue certificates to everyone eligible" busy={busy} onPress={issue} />
      <SectionTitle>Revoke a certificate</SectionTitle>
      <Cols>
        <Field id="rv-id" label="Certificate ID" value={certId} onChangeText={setCertId} autoCapitalize="characters" placeholder="KV-ABCDE23456" />
        <Field id="rv-reason" label="Reason (audit log)" value={reason} onChangeText={setReason} maxLength={300} />
      </Cols>
      <PrimaryButton danger label="Revoke" onPress={revoke} />
      <SectionTitle>Leaderboard</SectionTitle>
      <Text style={styles.muted}>Leaderboards refresh every 5 minutes on their own.</Text>
      <PrimaryButton quiet label="Refresh now" icon={<RefreshCw size={16} color={colors.primaryDeep} />} onPress={rebuild} />
      {!!msg && <Notice tone={msg.bad ? 'bad' : 'good'}>{msg.t}</Notice>}
    </View>
  );
}

function AuditTab() {
  const styles = useStyles();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof eventHubAdmin.audit>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try { setRows(await eventHubAdmin.audit()); } catch (e: any) { setError(e?.message || "Couldn't load the audit log."); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <StateView loading={!rows && !error} error={error} onRetry={load} empty={!!rows && !rows.length} emptyText="No changes recorded yet.">
      {rows && (
        <View style={styles.table}>
          {rows.map((r, i) => (
            <View key={i} style={styles.tr}>
              <Text style={[styles.cell, { width: 150 }]}>{fmtDate(r.at, true)}</Text>
              <Text style={[styles.cellStrong, { width: 180 }]} numberOfLines={1}>{r.action}</Text>
              <Text style={[styles.cell, { flex: 1 }]} numberOfLines={1}>{r.by} · {r.entity} {r.entityId}{r.note ? ` · ${r.note}` : ''}</Text>
            </View>
          ))}
        </View>
      )}
    </StateView>
  );
}

/** Side-by-side form fields that wrap to one column on narrow screens. */
function Cols({ children, min = 240 }: { children: React.ReactNode; min?: number }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {React.Children.toArray(children).map((child, i) => (
        <View key={i} style={{ flexGrow: 1, flexBasis: min, minWidth: 0 }}>{child}</View>
      ))}
    </View>
  );
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  const styles = useStyles();
  if (pages <= 1) return null;
  return (
    <View style={[styles.row, { justifyContent: 'center' }]}>
      <PrimaryButton quiet label="Previous" disabled={page <= 1} onPress={() => onPage(page - 1)} />
      <Text style={styles.muted}>Page {page} of {pages}</Text>
      <PrimaryButton quiet label="Next" disabled={page >= pages} onPress={() => onPage(page + 1)} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  page: { paddingHorizontal: 20, paddingBottom: 56, maxWidth: 1180, width: '100%', alignSelf: 'center', flexGrow: 1, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  muted: { fontSize: 13, color: c.textMuted, lineHeight: 19 },
  body: { fontSize: 14, color: c.text, lineHeight: 21 },
  label: { fontSize: 13, fontWeight: '700', color: c.text },
  link: { color: c.primary, fontWeight: '700', fontSize: 13 },
  eventPicker: { gap: 8, paddingTop: 8, alignItems: 'center' },
  evChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, maxWidth: 280 },
  evChipOn: { backgroundColor: c.primaryDeep, borderColor: c.primaryDeep },
  evChipText: { fontSize: 14, fontWeight: '800', color: c.text, flexShrink: 1 },
  evChipSub: { fontSize: 11, color: c.textMuted },
  evChipTextOn: { color: c.bg },
  tabs: { gap: 6, backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 4, alignItems: 'center' },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9 },
  tabOn: { backgroundColor: c.surface },
  tabText: { fontSize: 14, fontWeight: '700', color: c.textMuted },
  tabTextOn: { color: c.text },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  chipOn: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: c.textMuted },
  chipTextOn: { color: c.onPrimary },
  qBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  sep: { width: 1, height: 22, backgroundColor: c.border },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 14, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: c.text },
  points: { fontSize: 14, fontWeight: '900', color: c.text, marginLeft: 'auto' as any, fontVariant: ['tabular-nums'] },
  reviewBody: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  thumb: { width: 160, height: 160, borderRadius: 10, backgroundColor: c.surfaceAlt },
  table: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, overflow: 'hidden' },
  tr: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: c.border, alignItems: 'center' },
  cell: { fontSize: 13, color: c.textMuted, fontVariant: ['tabular-nums'] },
  cellStrong: { fontSize: 13, color: c.text, fontWeight: '700', flexShrink: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexGrow: 1, minWidth: 170, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 14, gap: 2 },
  tileLabel: { fontSize: 12, fontWeight: '800', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  tileValue: { fontSize: 28, fontWeight: '900', color: c.text, fontVariant: ['tabular-nums'] },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.border },
  meterTrack: { height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
  meterFill: { height: 6, borderRadius: 3, backgroundColor: c.primary },
  meterValue: { fontSize: 15, fontWeight: '900', color: c.text, minWidth: 90, textAlign: 'right', fontVariant: ['tabular-nums'] },
  bannerPreview: { width: '100%', maxWidth: 520, height: 180, borderRadius: 12, backgroundColor: c.surfaceAlt },
}));
