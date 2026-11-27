import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, CheckCircle2, Clock, XCircle, ImagePlus, Trash2, Truck, Award, Trophy, Check, PartyPopper } from 'lucide-react-native';
import { useTheme, makeStyles } from '../../theme';
import { setPageMeta } from '../../utils/pageMeta';
import { trackEvent } from '../../utils/analytics';
import { WebFooter } from '../../components/shared/WebFooter';
import { eventHub, MyEvent, MyTask, fmtDate, isLoginError, pickImageFile, compressImage, downloadBase64 } from '../../services/eventhub';
import { EventHubHeader, StateView, PrimaryButton, SectionTitle, Field, Notice, Chip, StatusPill, goLogin, ProgressRing, Contours, FadeIn, CountUp, PulseRing, Pop } from '../../components/events/EventUI';
import { LaunchConfetti } from '../../components/shared/LaunchConfetti';

type Registered = Extract<MyEvent, { event: any }>;

// karmaverse.earth/events/:slug/participate: the participant's daily tasks and progress.
export function ParticipateScreen({ navigation, route }: any) {
  const slug = String(route?.params?.slug || '');
  const styles = useStyles();
  const { colors } = useTheme();
  const [data, setData] = useState<Registered | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [notRegistered, setNotRegistered] = useState(false);
  const [pickup, setPickup] = useState<{ busy: boolean; msg: string; tone: 'info' | 'good' | 'bad' }>({ busy: false, msg: '', tone: 'info' });
  const [cert, setCert] = useState<{ busy: boolean; msg: string; tone: 'info' | 'good' | 'bad' }>({ busy: false, msg: '', tone: 'info' });
  const [party, setParty] = useState(0); // bumps on each successful submission to replay the confetti

  const load = useCallback(async (quiet = false) => {
    if (!quiet) { setError(null); setData(null); }
    setNeedsLogin(false);
    try {
      const r = await eventHub.me(slug);
      if (!('event' in r)) { setNotRegistered(true); return; }
      setData(r);
    } catch (e: any) {
      if (isLoginError(e)) { setNeedsLogin(true); setError(e.message); return; }
      setError(e?.message || "Couldn't load your challenge.");
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!data) return;
    return setPageMeta({ title: `${data.event.title}: my tasks | KarmaVerse EventHub` });
  }, [data]);

  const checkPickup = async () => {
    setPickup({ busy: true, msg: '', tone: 'info' });
    try {
      const r = await eventHub.verifyPickup(slug);
      setPickup({ busy: false, msg: r.verified ? `Pickup verified. ${r.points} bonus points added.` : (r.message || 'No completed pickup found yet.'), tone: r.verified ? 'good' : 'info' });
      if (r.verified) load(true);
    } catch (e: any) {
      setPickup({ busy: false, msg: e?.message || 'Could not check right now.', tone: 'bad' });
    }
  };

  const getCertificate = async () => {
    setCert({ busy: true, msg: '', tone: 'info' });
    try {
      const r = await eventHub.certificate(slug);
      const saved = downloadBase64(r.fileName, 'application/pdf', r.pdfBase64);
      trackEvent('certificate_download', { item_id: slug });
      setCert({ busy: false, msg: saved ? `Downloaded. Certificate ID ${r.certificateId}. Anyone can check it at ${r.verifyUrl}` : `Your certificate ID is ${r.certificateId}. Open karmaverse.earth on a computer to download the PDF.`, tone: 'good' });
      load(true);
    } catch (e: any) {
      setCert({ busy: false, msg: e?.message || 'Could not create the certificate.', tone: 'bad' });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <EventHubHeader navigation={navigation} title={data?.event.title || 'My challenge'} subtitle="Your daily tasks and progress" active="mine" />
        <View style={styles.page}>
          {notRegistered ? (
            <StateView empty emptyText="You are not registered for this event yet.">{null}</StateView>
          ) : (
            <StateView
              loading={!data && !error}
              error={error}
              onRetry={() => load()}
              onLogin={needsLogin ? () => goLogin(navigation, 'EventParticipate', { slug }) : undefined}
            >
              {data && (
                <>
                  {/* Progress */}
                  <LinearGradient colors={['#022c16', '#065f46', '#15803d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
                    <Contours color="#bbf7d0" opacity={0.25} />
                    <ProgressRing value={data.points.total} max={data.maxScore} size={128} stroke={11}>
                      <CountUp value={data.points.total} style={styles.ringNum} />
                      <Text style={styles.ringSub}>of {data.maxScore} pts</Text>
                    </ProgressRing>
                    <View style={{ flex: 1, minWidth: 180, gap: 10 }}>
                      <View style={styles.row}>
                        <StatusPill status={data.event.status} onImage />
                        <Text style={styles.heroMuted}>Ends {fmtDate(data.event.endAt, true)}</Text>
                      </View>
                      <FadeIn delay={300}><Text style={styles.heroTitle}>{heroLine(data)}</Text></FadeIn>
                      <View style={styles.heroStats}>
                        <View style={styles.heroStat}><CountUp value={data.approvedTasks} suffix={`/${data.totalTasks}`} style={styles.heroStatNum} /><Text style={styles.heroStatLabel}>approved</Text></View>
                        <View style={styles.heroStat}><CountUp value={data.pendingTasks} style={styles.heroStatNum} /><Text style={styles.heroStatLabel}>in review</Text></View>
                        <TouchableOpacity style={styles.heroStat} onPress={() => navigation.navigate('EventLeaderboard', { slug })} accessibilityRole="link">
                          <Text style={styles.heroStatNum}>{data.rank ? `#${data.rank}` : '–'}</Text>
                          <View style={styles.row}><Trophy size={11} color="#bbf7d0" /><Text style={styles.heroStatLabel}>rank</Text></View>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </LinearGradient>
                  <View style={[styles.row, { marginTop: 10 }]}>
                    <TouchableOpacity onPress={() => navigation.navigate('EventDetail', { slug })} style={styles.inlineLink}><Text style={styles.linkText}>Rules and FAQ</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('EventLeaderboard', { slug })} style={styles.inlineLink}><Trophy size={14} color={colors.primary} /><Text style={styles.linkText}>Leaderboard</Text></TouchableOpacity>
                  </View>

                  {data.event.status === 'upcoming' && <View style={{ marginTop: 16 }}><Notice>The challenge starts on {fmtDate(data.event.startAt, true)}. Day 1 opens then.</Notice></View>}

                  <SectionTitle eyebrow="Your journey">Daily tasks</SectionTitle>
                  <View>
                    {data.tasks.map((t, i) => (
                      <FadeIn key={t.id} delay={150 + i * 90} style={styles.tl}>
                        <View style={styles.tlRail}>
                          <JourneyNode task={t} />
                          {i < data.tasks.length - 1 && <View style={[styles.tlLine, t.submission?.status === 'approved' && styles.tlLineDone]} />}
                        </View>
                        <View style={{ flex: 1, minWidth: 0, paddingBottom: 14 }}>
                          <TaskCard slug={slug} task={t} onChanged={() => load(true)} onCelebrate={() => setParty((n) => n + 1)} onLogin={() => goLogin(navigation, 'EventParticipate', { slug })} />
                        </View>
                      </FadeIn>
                    ))}
                  </View>

                  {data.pickupBonus.available && (
                    <View style={styles.side}>
                      <View style={styles.row}><Truck size={18} color={colors.primary} /><Text style={styles.sideTitle}>KarmaVerse pickup bonus: +{data.pickupBonus.points}</Text></View>
                      {data.pickupBonus.verified ? (
                        <Chip tone="good" label="Verified. Bonus added." />
                      ) : (
                        <>
                          <Text style={styles.muted}>Complete a KarmaVerse pickup during the challenge. We check your real pickups, so the bonus is added only after the pickup is completed.</Text>
                          <View style={styles.row}>
                            <PrimaryButton quiet label="Check my pickups" busy={pickup.busy} onPress={checkPickup} />
                            <PrimaryButton quiet label="Book a pickup" onPress={() => navigation.navigate('SchedulePickup')} />
                          </View>
                        </>
                      )}
                      {!!pickup.msg && <Notice tone={pickup.tone}>{pickup.msg}</Notice>}
                    </View>
                  )}

                  <View style={styles.side}>
                    <View style={styles.row}><Award size={18} color={colors.primary} /><Text style={styles.sideTitle}>Certificate</Text></View>
                    {data.certificate.issued ? (
                      <Text style={styles.muted}>Certificate {data.certificate.certificateId}. Verify at {data.certificate.verifyUrl}</Text>
                    ) : (
                      <Text style={styles.muted}>{data.certificate.requirement}.{data.certificate.enabled ? '' : ' Certificates become available after the event, once reviews are done.'}</Text>
                    )}
                    {data.certificate.enabled && (data.certificate.eligible || data.certificate.issued) && (
                      <PrimaryButton label={data.certificate.issued ? 'Download again' : 'Get my certificate'} busy={cert.busy} onPress={getCertificate} />
                    )}
                    {!!cert.msg && <Notice tone={cert.tone}>{cert.msg}</Notice>}
                  </View>
                </>
              )}
            </StateView>
          )}
          {notRegistered && <View style={{ alignItems: 'center' }}><PrimaryButton label="See the event and register" onPress={() => navigation.navigate('EventDetail', { slug })} /></View>}
        </View>
        {Platform.OS === 'web' && <WebFooter />}
      </ScrollView>
      {party > 0 && <LaunchConfetti key={party} />}
    </SafeAreaView>
  );
}

function heroLine(d: Registered) {
  if (d.event.status === 'upcoming') return 'Get ready. Day 1 opens soon.';
  if (d.approvedTasks >= d.totalTasks && d.totalTasks) return 'Every task done. Brilliant work!';
  const open = d.tasks.filter((t) => t.canSubmit).length;
  if (open) return `${open} task${open === 1 ? ' is' : 's are'} waiting for you.`;
  if (d.pendingTasks) return 'Nice! Your work is being reviewed.';
  return 'You are all caught up. See you tomorrow.';
}

function JourneyNode({ task }: { task: MyTask }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const st = task.submission?.status;
  if (st === 'approved') return <Pop style={{ marginTop: 14 }}><View style={[styles.node, styles.nodeDone, { marginTop: 0 }]}><Check size={16} color="#ffffff" strokeWidth={3} /></View></Pop>;
  if (st === 'pending') return <View style={[styles.node, styles.nodePending]}><Clock size={15} color="#b45309" /></View>;
  if (st === 'rejected') return <View style={[styles.node, styles.nodeBad]}><XCircle size={15} color={colors.danger} /></View>;
  if (task.state === 'locked') return <View style={styles.node}><Lock size={14} color={colors.textFaint} /></View>;
  if (task.state === 'open') {
    return (
      <View style={{ marginTop: 14 }}>
        <PulseRing size={34} color={colors.primary}><View style={[styles.node, styles.nodeOpen, { marginTop: 0 }]}><Text style={styles.nodeTextOpen}>{task.day}</Text></View></PulseRing>
      </View>
    );
  }
  return <View style={styles.node}><Text style={styles.nodeText}>{task.day}</Text></View>;
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

function TaskCard({ slug, task, onChanged, onLogin, onCelebrate }: { slug: string; task: MyTask; onChanged: () => void; onLogin: () => void; onCelebrate?: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const s = task.submission;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [image, setImage] = useState<{ base64: string; previewUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'good' | 'bad' | 'info'; text: string } | null>(null);
  const takesImage = task.accepts.includes('image');
  const takesLink = task.accepts.includes('link');
  const textOnly = !takesImage && !takesLink;

  const pick = async () => {
    setMsg(null);
    try {
      const f = await pickImageFile();
      if (!f) return;
      setImage(await compressImage(f));
    } catch (e: any) {
      setMsg({ tone: 'bad', text: e?.message || 'That photo could not be used.' });
    }
  };

  const send = async () => {
    setMsg(null);
    if (textOnly && text.trim().length < 30) { setMsg({ tone: 'bad', text: 'Please write at least 30 characters.' }); return; }
    if (!textOnly && !image && !link.trim()) { setMsg({ tone: 'bad', text: takesImage && takesLink ? 'Add a photo or a link as proof.' : takesImage ? 'Add a photo as proof.' : 'Add a link as proof.' }); return; }
    setBusy(true);
    try {
      const r = await eventHub.submit(slug, task.id, { text: text.trim() || undefined, link: link.trim() || undefined, imageBase64: image?.base64 });
      trackEvent('eventhub_submit', { item_id: slug, day: task.day });
      setMsg({ tone: 'good', text: r.submission.status === 'approved' ? 'Submitted and approved.' : 'Submitted. We will review it soon; points are added once it is approved.' });
      setText(''); setLink(''); setImage(null); setOpen(false);
      onCelebrate?.();
      onChanged();
    } catch (e: any) {
      if (isLoginError(e)) { onLogin(); return; }
      setMsg({ tone: 'bad', text: e?.message || 'Submission failed. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  const statusChip = () => {
    if (s?.status === 'approved') return <Chip tone="good" label={`Approved · ${s.points} pts`} />;
    if (s?.status === 'pending') return <Chip tone="warn" label="Waiting for review" />;
    if (s?.status === 'rejected') return <Chip tone="bad" label="Needs changes" />;
    if (task.state === 'locked') return <Chip label={`Opens ${fmtDate(task.opensAt)}`} />;
    if (task.state === 'closed') return <Chip label="Closed" />;
    return <Chip tone="good" label="Open now" />;
  };
  const icon = s?.status === 'approved' ? <CheckCircle2 size={22} color={colors.success} />
    : s?.status === 'pending' ? <Clock size={22} color={colors.warning} />
    : s?.status === 'rejected' ? <XCircle size={22} color={colors.danger} />
    : task.state === 'locked' ? <Lock size={20} color={colors.textFaint} /> : null;

  return (
    <View style={[styles.taskCard, task.canSubmit && styles.taskCardOpen, task.state === 'locked' && !s && { opacity: 0.7 }]}>
      <View style={styles.taskHead}>
        <View style={styles.day}><Text style={styles.dayText}>Day {task.day}</Text></View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <View style={styles.row}>{statusChip()}<Text style={styles.muted}>{task.points} pts{task.qualityMax ? ` + up to ${task.qualityMax} quality` : ''}</Text></View>
        </View>
        {icon}
      </View>
      {task.state !== 'locked' && <Text style={styles.taskText}>{task.instructions}</Text>}
      {s?.status === 'rejected' && !!s.reason && <Notice tone="bad">{`Reason: ${s.reason}`}</Notice>}
      {s && s.status !== 'rejected' && <Text style={styles.muted}>Submitted {fmtDate(s.submittedAt, true)}{s.attempt > 1 ? ` (attempt ${s.attempt})` : ''}</Text>}

      {task.canSubmit && !open && (
        <PrimaryButton label={s?.status === 'rejected' ? 'Submit again' : 'Participate'} onPress={() => setOpen(true)} />
      )}
      {task.canSubmit && open && (
        <View style={styles.form}>
          <Field
            id={`t-${task.id}-text`}
            label={textOnly ? 'Your answer *' : 'Describe what you did (optional)'}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={textOnly ? 3000 : 500}
            hint={textOnly ? `${text.trim().length}/30 characters minimum` : undefined}
          />
          {takesImage && (
            Platform.OS === 'web' ? (
              image ? (
                <View style={styles.preview}>
                  <Image source={{ uri: image.previewUrl }} style={styles.previewImg} resizeMode="cover" accessibilityLabel="Selected photo" />
                  <PrimaryButton quiet label="Remove photo" icon={<Trash2 size={16} color={colors.primaryDeep} />} onPress={() => setImage(null)} />
                </View>
              ) : (
                <PrimaryButton quiet label="Add a photo" icon={<ImagePlus size={16} color={colors.primaryDeep} />} onPress={pick} />
              )
            ) : (
              <TouchableOpacity onPress={() => Linking.openURL(`https://karmaverse.earth/events/${slug}/participate`)}>
                <Text style={styles.linkText}>To add a photo, open this task on karmaverse.earth</Text>
              </TouchableOpacity>
            )
          )}
          {takesLink && (
            <Field id={`t-${task.id}-link`} label="Link to your video or post" value={link} onChangeText={setLink} autoCapitalize="none" keyboardType="url" placeholder="https://www.instagram.com/reel/..." maxLength={500} hint="Public Instagram, YouTube, LinkedIn or X link" />
          )}
          <Text style={styles.muted}>Submit your own original work. JPG, PNG or WEBP photos; large photos are shrunk automatically.</Text>
          <View style={styles.row}>
            <PrimaryButton label="Submit" busy={busy} onPress={send} />
            <PrimaryButton quiet label="Cancel" onPress={() => { setOpen(false); setMsg(null); }} />
          </View>
        </View>
      )}
      {!!msg && (msg.tone === 'good' ? (
        <Pop><View style={styles.celebrate} accessibilityLiveRegion="polite"><PartyPopper size={20} color={colors.success} /><Text style={styles.celebrateText}>{msg.text}</Text></View></Pop>
      ) : <Notice tone={msg.tone}>{msg.text}</Notice>)}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  page: { paddingHorizontal: 20, paddingBottom: 56, maxWidth: 860, width: '100%', alignSelf: 'center', flexGrow: 1 },
  hero: { borderRadius: 26, padding: 22, marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 20, overflow: 'hidden' },
  ringNum: { color: '#ffffff', fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'] },
  ringSub: { color: '#bbf7d0', fontSize: 11, fontWeight: '700' },
  heroMuted: { color: '#bbf7d0', fontSize: 12, fontWeight: '600' },
  heroTitle: { color: '#ffffff', fontSize: 21, fontWeight: '900', letterSpacing: -0.3, lineHeight: 26 },
  heroStats: { flexDirection: 'row', gap: 8 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 10 },
  heroStatNum: { color: '#ffffff', fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'] },
  heroStatLabel: { color: '#bbf7d0', fontSize: 11, fontWeight: '700' },
  tl: { flexDirection: 'row', gap: 12 },
  tlRail: { width: 34, alignItems: 'center' },
  tlLine: { flex: 1, width: 2, backgroundColor: c.border, marginVertical: 4 },
  tlLineDone: { backgroundColor: c.primary },
  node: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.surface, borderWidth: 2, borderColor: c.border, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  nodeDone: { backgroundColor: c.primary, borderColor: c.primary },
  nodePending: { backgroundColor: '#fef3c7', borderColor: '#f59e0b' },
  nodeBad: { backgroundColor: c.dangerSoft, borderColor: c.danger },
  nodeOpen: { backgroundColor: c.primary, borderColor: c.primary, ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 0 6px rgba(22,163,74,0.18)' } as any) : {}) },
  nodeText: { fontSize: 13, fontWeight: '900', color: c.textMuted },
  nodeTextOpen: { fontSize: 13, fontWeight: '900', color: '#ffffff' },
  celebrate: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.successSoft, borderRadius: 14, padding: 12 },
  celebrateText: { flex: 1, color: c.success, fontWeight: '700', fontSize: 14, lineHeight: 20 },
  progress: { flexDirection: 'row', gap: 10, marginTop: 12 },
  stat: { flex: 1, minWidth: 0, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 12 },
  statLabel: { fontSize: 11, fontWeight: '800', color: c.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  statValue: { fontSize: 26, fontWeight: '900', color: c.text, marginTop: 4, fontVariant: ['tabular-nums'] },
  statSub: { fontSize: 12, color: c.textFaint },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: c.surfaceAlt, marginTop: 14, marginBottom: 12, overflow: 'hidden' },
  barFill: { height: 10, backgroundColor: c.primary, borderRadius: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  muted: { fontSize: 13, color: c.textMuted, lineHeight: 19 },
  inlineLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { color: c.primary, fontWeight: '800', fontSize: 13 },
  taskCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 16, gap: 12 },
  taskCardOpen: { borderColor: c.primary, borderWidth: 1.5 },
  taskHead: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  day: { width: 54, height: 54, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontWeight: '900', color: c.primaryDeep, fontSize: 13 },
  taskTitle: { fontSize: 17, fontWeight: '800', color: c.text },
  taskText: { fontSize: 14, lineHeight: 21, color: c.text },
  form: { gap: 12, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12 },
  preview: { gap: 10 },
  previewImg: { width: '100%', maxWidth: 360, height: 220, borderRadius: 12, backgroundColor: c.surfaceAlt },
  side: { marginTop: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, gap: 10 },
  sideTitle: { fontSize: 16, fontWeight: '800', color: c.text },
}));
