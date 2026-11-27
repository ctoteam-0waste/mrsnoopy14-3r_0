import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, Share, Modal, Switch, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Clock, Users, Share2, Trophy, Award, CheckCircle2, ChevronDown, ChevronUp, X, Lock, Camera, Link2, PenLine, Truck, Sparkles } from 'lucide-react-native';
import { useTheme, makeStyles } from '../../theme';
import { setPageMeta } from '../../utils/pageMeta';
import { trackEvent } from '../../utils/analytics';
import { WebFooter } from '../../components/shared/WebFooter';
import { eventHub, EventDetail, MyEvent, fmtDate, fmtRange, hasLogin, isLoginError } from '../../services/eventhub';
import {
  EventHubHeader, StateView, StatusPill, Banner, PrimaryButton, SectionTitle, Field, Notice, Countdown, TimeBar,
  goLogin, useColumns, nextMoment, categoryTheme, MAX_WIDTH, FadeIn, GrowBar, PulseRing, CountUp,
} from '../../components/events/EventUI';
import { LaunchConfetti } from '../../components/shared/LaunchConfetti';

const ACCEPT_ICON: Record<string, any> = { text: PenLine, image: Camera, link: Link2 };
const ACCEPT_LABEL: Record<string, string> = { text: 'Text', image: 'Photo', link: 'Link' };

// karmaverse.earth/events/:slug: everything about one event, plus registration.
export function EventDetailScreen({ navigation, route }: any) {
  const slug = String(route?.params?.slug || '');
  const styles = useStyles();
  const { colors } = useTheme();
  const { isWide, isPhone } = useColumns();

  const [ev, setEv] = useState<EventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<MyEvent | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showForm, setShowForm] = useState(false);
  const [shareMsg, setShareMsg] = useState('');

  const load = useCallback(async () => {
    setError(null);
    setEv(null);
    try {
      const d = await eventHub.get(slug);
      setEv(d);
      const li = await hasLogin();
      setLoggedIn(li);
      if (li) eventHub.me(slug).then(setMe).catch(() => setMe(null));
    } catch (e: any) {
      setError(e?.message || "Couldn't load this event.");
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!ev) return;
    return setPageMeta({ title: `${ev.title} | KarmaVerse EventHub`, description: ev.summary, canonical: `https://karmaverse.earth/events/${ev.slug}` });
  }, [ev]);

  const registered = !!me && 'event' in me && me.registered;

  const share = async () => {
    if (!ev) return;
    const text = `${ev.title}: ${ev.summary}`;
    trackEvent('share', { method: 'eventhub', content_type: 'event', item_id: ev.slug });
    if (Platform.OS === 'web') {
      const nav: any = typeof navigator !== 'undefined' ? navigator : null;
      try {
        if (nav?.share) { await nav.share({ title: ev.title, text, url: ev.url }); return; }
        await nav?.clipboard?.writeText(ev.url);
        setShareMsg('Link copied. Paste it anywhere to share.');
      } catch {
        setShareMsg(`Share this link: ${ev.url}`);
      }
      return;
    }
    Share.share({ message: `${text} ${ev.url}` }).catch(() => {});
  };

  const primary = (light?: boolean) => {
    if (!ev) return null;
    if (registered) return <PrimaryButton light={light} label="Participate" onPress={() => navigation.navigate('EventParticipate', { slug })} />;
    if (ev.status === 'completed') return <PrimaryButton light={light} label="See the leaderboard" onPress={() => navigation.navigate('EventLeaderboard', { slug })} />;
    if (ev.registration !== 'open') {
      return <PrimaryButton light={light} disabled label={ev.registration === 'not_yet' ? `Registration opens ${fmtDate(ev.regOpensAt)}` : ev.registration === 'full' ? 'Event full' : 'Registration closed'} onPress={() => {}} />;
    }
    if (!loggedIn) return <PrimaryButton light={light} label="Log in to register" onPress={() => goLogin(navigation, 'EventDetail', { slug })} />;
    return <PrimaryButton light={light} label="Register now, it's free" onPress={() => setShowForm(true)} />;
  };

  const t = categoryTheme(ev?.category);
  const moment = ev ? nextMoment(ev) : null;
  const taskPts = ev ? ev.tasks.reduce((s, x) => s + x.points, 0) : 0;
  const qualityPts = ev ? ev.tasks.reduce((s, x) => s + x.qualityMax, 0) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: isPhone && ev ? 84 : 0 }} showsVerticalScrollIndicator={false}>
        <EventHubHeader navigation={navigation} title="Event" active="events" />
        <View style={styles.page}>
          <StateView loading={!ev && !error} error={error} onRetry={load}>
            {ev && (
              <>
                {/* Hero: banner with the title on it */}
                <View style={styles.hero}>
                  <Banner uri={ev.bannerUrl} height={isWide ? 420 : 360} title={ev.title} category={ev.category} iconTop />
                  <LinearGradient colors={['rgba(2,20,10,0)', 'rgba(2,20,10,0.55)', 'rgba(2,20,10,0.92)']} style={styles.heroShade} />
                  <View style={[styles.heroBody, isWide && { padding: 36 }]}>
                    <FadeIn delay={100} style={styles.row}>
                      <StatusPill status={ev.status} onImage />
                      <View style={styles.heroCat}><t.Icon size={12} color="#052e16" /><Text style={styles.heroCatText}>{ev.category}</Text></View>
                      {registered && <View style={styles.heroCat}><CheckCircle2 size={12} color="#15803d" /><Text style={styles.heroCatText}>You're registered</Text></View>}
                    </FadeIn>
                    <FadeIn delay={220} distance={26}><Text style={[styles.title, isWide && { fontSize: 44, lineHeight: 48 }]} accessibilityRole="header">{ev.title}</Text></FadeIn>
                    <FadeIn delay={360}><Text style={styles.summary}>{ev.summary}</Text></FadeIn>
                    <FadeIn delay={480} style={[styles.row, { marginTop: 4 }]}>
                      {primary(true)}
                      <PrimaryButton label="Share" icon={<Share2 size={16} color="#ffffff" />} onPress={share} style={styles.ghostBtn} />
                      <PrimaryButton label="Leaderboard" icon={<Trophy size={16} color="#ffffff" />} onPress={() => navigation.navigate('EventLeaderboard', { slug })} style={styles.ghostBtn} />
                    </FadeIn>
                  </View>
                </View>
                {!!shareMsg && <View style={{ marginTop: 12 }}><Notice>{shareMsg}</Notice></View>}

                {/* Key facts + countdown */}
                <View style={[styles.factsRow, isWide && { flexDirection: 'row' }]}>
                  <View style={[styles.facts, isWide && { flex: 1.4 }]}>
                    {[
                      { icon: <Calendar size={18} color={colors.primary} />, k: 'Dates', v: fmtRange(ev.startAt, ev.endAt), s: `${ev.durationDays} days` },
                      { icon: <Clock size={18} color={colors.primary} />, k: 'Register by', v: fmtDate(ev.regClosesAt), s: fmtDate(ev.regClosesAt, true).split(', ').pop() || '' },
                      { icon: <Users size={18} color={colors.primary} />, k: 'Joined', v: ev.participants.toLocaleString('en-IN'), s: ev.maxParticipants ? `of ${ev.maxParticipants.toLocaleString('en-IN')} places` : 'no limit' },
                      { icon: <Award size={18} color={colors.primary} />, k: 'Up to', v: `${ev.maxScore} pts`, s: ev.fee },
                    ].map((f, i) => (
                      <FadeIn key={f.k} delay={200 + i * 90} style={styles.fact}>
                        <View style={styles.factIcon}>{f.icon}</View>
                        <Text style={styles.factKey}>{f.k}</Text>
                        <Text style={styles.factVal}>{f.v}</Text>
                        <Text style={styles.factSub}>{f.s}</Text>
                      </FadeIn>
                    ))}
                  </View>
                  {moment && (
                    <View style={[styles.countBox, isWide && { flex: 1 }]}>
                      <Countdown at={moment.at} label={moment.label} />
                      <TimeBar event={ev} />
                      {!!ev.audience && <Text style={styles.audience}>For {ev.audience.charAt(0).toLowerCase() + ev.audience.slice(1)}</Text>}
                    </View>
                  )}
                </View>

                <View style={[styles.columns, isWide && { flexDirection: 'row', alignItems: 'flex-start' }]}>
                  <View style={{ flex: 1.6, minWidth: 0 }}>
                    {!!ev.overview && (<><SectionTitle eyebrow="About">What it's about</SectionTitle><Text style={styles.body}>{ev.overview}</Text></>)}
                    <ListSection eyebrow="Goals" title="Objectives" items={ev.objectives} />

                    {ev.tasks.length > 0 && (
                      <>
                        <SectionTitle eyebrow={ev.tasks.length > 1 ? `${ev.tasks.length} days` : 'Task'}>{ev.tasks.length > 1 ? 'Your journey, day by day' : 'The task'}</SectionTitle>
                        <View>
                          {ev.tasks.map((task, i) => {
                            const open = task.state === 'open';
                            const last = i === ev.tasks.length - 1;
                            return (
                              <FadeIn key={task.id} delay={i * 80} style={styles.tl}>
                                <View style={styles.tlRail}>
                                  {open ? (
                                    <PulseRing size={36} color={colors.primary}>
                                      <View style={[styles.tlNode, styles.tlNodeOpen]}><Text style={[styles.tlNodeText, { color: '#ffffff' }]}>{task.day}</Text></View>
                                    </PulseRing>
                                  ) : (
                                    <View style={[styles.tlNode, task.state === 'closed' && styles.tlNodeDone]}>
                                      {task.state === 'locked' ? <Lock size={14} color={colors.textFaint} /> : <Text style={styles.tlNodeText}>{task.day}</Text>}
                                    </View>
                                  )}
                                  {!last && <View style={styles.tlLine} />}
                                </View>
                                <View style={[styles.tlCard, open && styles.tlCardOpen]}>
                                  <View style={styles.rowBetween}>
                                    <Text style={styles.tlDay}>DAY {task.day}{open ? ' · OPEN NOW' : task.state === 'locked' ? ` · OPENS ${fmtDate(task.opensAt).toUpperCase()}` : ''}</Text>
                                    <Text style={styles.tlPts}>+{task.points}{task.qualityMax ? `–${task.points + task.qualityMax}` : ''} pts</Text>
                                  </View>
                                  <Text style={styles.tlTitle}>{task.title}</Text>
                                  <Text style={styles.tlText}>{task.instructions}</Text>
                                  <View style={styles.row}>
                                    {task.accepts.map((a) => {
                                      const I = ACCEPT_ICON[a];
                                      return <View key={a} style={styles.proof}><I size={12} color={colors.textMuted} /><Text style={styles.proofText}>{ACCEPT_LABEL[a]}</Text></View>;
                                    })}
                                    {!!task.bonus && <View style={[styles.proof, styles.proofBonus]}><Truck size={12} color="#a16207" /><Text style={[styles.proofText, { color: '#a16207' }]}>+{task.bonus} pickup bonus</Text></View>}
                                  </View>
                                </View>
                              </FadeIn>
                            );
                          })}
                        </View>
                        <Text style={styles.note}>Points count only after the KarmaVerse team approves a submission.{ev.lateSubmissions ? ' Missed a day? You can still submit it until the event ends.' : ' Each task closes a day after it opens.'}</Text>
                      </>
                    )}

                    <ListSection eyebrow="Fair play" title="Rules and guidelines" items={ev.rules} />

                    {ev.faq.length > 0 && (
                      <>
                        <SectionTitle eyebrow="FAQ">Questions</SectionTitle>
                        <View style={styles.faq}>
                          {ev.faq.map((f, i) => (
                            <View key={i} style={[styles.faqItem, i > 0 && styles.faqBorder]}>
                              <TouchableOpacity style={styles.faqQ} onPress={() => setOpenFaq(openFaq === i ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: openFaq === i }}>
                                <Text style={styles.faqQText}>{f.q}</Text>
                                {openFaq === i ? <ChevronUp size={18} color={colors.primary} /> : <ChevronDown size={18} color={colors.textMuted} />}
                              </TouchableOpacity>
                              {openFaq === i && <Text style={styles.faqA}>{f.a}</Text>}
                            </View>
                          ))}
                        </View>
                      </>
                    )}
                  </View>

                  {/* Side: rewards, points, eligibility */}
                  <View style={[{ gap: 16 }, isWide && { width: 360, marginTop: 36 }]}>
                    <LinearGradient colors={['#422006', '#a16207']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rewards}>
                      <View style={styles.rewardsIcon}><Award size={26} color="#a16207" /></View>
                      <Text style={styles.rewardsTitle}>Rewards</Text>
                      {(ev.rewards.length ? ev.rewards : ['A place on the leaderboard']).map((r, i) => (
                        <View key={i} style={styles.rewardLine}><Sparkles size={14} color="#fde68a" style={{ marginTop: 3 }} /><Text style={styles.rewardText}>{r}</Text></View>
                      ))}
                    </LinearGradient>

                    {ev.tasks.length > 0 && (
                      <View style={styles.sideCard}>
                        <Text style={styles.sideTitle}>How the {ev.maxScore} points add up</Text>
                        {[
                          { l: 'Completing tasks', v: taskPts },
                          { l: 'Quality bonus (from reviewers)', v: qualityPts },
                          { l: 'Verified KarmaVerse pickup', v: ev.pickupBonus },
                        ].filter((x) => x.v > 0).map((x) => (
                          <View key={x.l} style={{ gap: 5 }}>
                            <View style={styles.rowBetween}><Text style={styles.ptsLabel}>{x.l}</Text><CountUp value={x.v} style={styles.ptsVal} /></View>
                            <GrowBar fraction={x.v / Math.max(1, ev.maxScore)} color={colors.primary} track={colors.surfaceAlt} delay={300} />
                          </View>
                        ))}
                        <Text style={styles.factSub}>Ties go to whoever reached the score first.</Text>
                      </View>
                    )}

                    {ev.eligibility.length > 0 && (
                      <View style={styles.sideCard}>
                        <Text style={styles.sideTitle}>Who can take part</Text>
                        {ev.eligibility.map((e, i) => (
                          <View key={i} style={styles.li}><CheckCircle2 size={16} color={colors.primary} style={{ marginTop: 2 }} /><Text style={styles.liText}>{e}</Text></View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                <LinearGradient colors={['#022c16', '#15803d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bottomCta}>
                  <View style={{ flex: 1, minWidth: 220, gap: 4 }}>
                    <Text style={styles.bottomTitle}>{registered ? 'Ready for today’s task?' : ev.status === 'completed' ? 'This event has ended.' : 'Your first green action is one tap away.'}</Text>
                    <Text style={styles.bottomText}>{ev.participants.toLocaleString('en-IN')} people have already joined.</Text>
                  </View>
                  {primary(true)}
                </LinearGradient>
              </>
            )}
          </StateView>
        </View>
        {Platform.OS === 'web' && <WebFooter />}
      </ScrollView>

      {/* Sticky action bar on phones */}
      {ev && isPhone && (
        <View style={styles.sticky}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.stickyTitle} numberOfLines={1}>{ev.title}</Text>
            <Text style={styles.stickySub} numberOfLines={1}>{ev.fee} · up to {ev.maxScore} pts</Text>
          </View>
          {primary()}
        </View>
      )}

      {ev && showForm && (
        <RegisterModal
          ev={ev}
          me={me}
          onClose={() => setShowForm(false)}
          onDone={() => { setShowForm(false); eventHub.me(slug).then(setMe).catch(() => {}); }}
          onLogin={() => { setShowForm(false); goLogin(navigation, 'EventDetail', { slug }); }}
          onParticipate={() => { setShowForm(false); navigation.navigate('EventParticipate', { slug }); }}
        />
      )}
    </SafeAreaView>
  );
}

function ListSection({ title, items, eyebrow }: { title: string; items: string[]; eyebrow?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  if (!items?.length) return null;
  return (
    <>
      <SectionTitle eyebrow={eyebrow}>{title}</SectionTitle>
      <View style={{ gap: 10 }}>
        {items.map((t, i) => (
          <View key={i} style={styles.li}>
            <CheckCircle2 size={18} color={colors.primary} style={{ marginTop: 2 }} />
            <Text style={styles.liText}>{t}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function RegisterModal({ ev, me, onClose, onDone, onLogin, onParticipate }: {
  ev: EventDetail; me: MyEvent | null; onClose: () => void; onDone: () => void; onLogin: () => void; onParticipate: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const profile = me && !('event' in me) ? me.profile : null;
  const [form, setForm] = useState({
    name: profile?.name || '', email: profile?.email || '', phone: (profile?.phone || '').replace(/^\+91/, ''),
    college: '', city: profile?.city || '', referralCode: '',
  });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<null | { already: boolean; emailed: boolean }>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    try {
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref) setForm((f) => ({ ...f, referralCode: ref.toUpperCase().slice(0, 20) }));
    } catch { /* no query */ }
  }, []);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const missing = !form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.college.trim() || !form.city.trim();

  const submit = async () => {
    setErr('');
    if (missing) { setErr('Fill in every field marked as required.'); return; }
    if (!consent) { setErr('Tick the box to agree to the event terms.'); return; }
    setBusy(true);
    try {
      let source = '';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try { source = new URLSearchParams(window.location.search).get('utm_source') || ''; } catch { /* ignore */ }
      }
      const r = await eventHub.register(ev.slug, { ...form, referralCode: form.referralCode.trim() || undefined, consent: true, source });
      trackEvent('sign_up', { method: 'eventhub', item_id: ev.slug });
      setDone({ already: r.alreadyRegistered, emailed: !!r.emailQueued });
      onDone();
    } catch (e: any) {
      if (isLoginError(e)) { onLogin(); return; }
      setErr(e?.message || 'Registration failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBack}>
        <View style={styles.modal} accessibilityViewIsModal>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle} accessibilityRole="header">{done ? 'You are registered' : `Register for ${ev.title}`}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close"><X size={22} color={colors.textMuted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 6 }} keyboardShouldPersistTaps="handled">
            {done ? (
              <>
                <FadeIn distance={10}><View style={{ alignItems: 'center', paddingVertical: 6 }}><PulseRing size={64} color={colors.primary}><View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={34} color="#ffffff" /></View></PulseRing></View></FadeIn>
                <Notice tone="good">{done.already ? 'You were already registered for this event.' : `Registration confirmed.${done.emailed ? ' A confirmation email is on its way.' : ''}`}</Notice>
                <Text style={styles.body}>Each task opens on its day. Submit your proof on the participation page, and the KarmaVerse team will review it.</Text>
                <PrimaryButton label="Go to my challenge" onPress={onParticipate} />
              </>
            ) : (
              <>
                <Text style={styles.note}>We use your KarmaVerse account. Your name, college and city may appear on the leaderboard as "First L., College, City". Your email and phone are never shown publicly.</Text>
                <Field id="reg-name" label="Full name (as on the certificate) *" value={form.name} onChangeText={set('name')} autoComplete="name" maxLength={80} />
                <Field id="reg-email" label="Email *" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" maxLength={120} />
                <Field id="reg-phone" label="Mobile number *" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" maxLength={16} hint="10-digit Indian mobile number" />
                <Field id="reg-college" label="College or university *" value={form.college} onChangeText={set('college')} maxLength={120} />
                <Field id="reg-city" label="City *" value={form.city} onChangeText={set('city')} maxLength={60} />
                <Field id="reg-ref" label="Referral code (optional)" value={form.referralCode} onChangeText={(v) => set('referralCode')(v.toUpperCase())} autoCapitalize="characters" maxLength={20} hint="The KarmaVerse referral code of a friend who is already registered" />
                <View style={styles.consent}>
                  <Switch value={consent} onValueChange={setConsent} trackColor={{ true: colors.primary, false: colors.borderStrong }} accessibilityLabel="Agree to the event terms" />
                  <Text style={styles.consentText}>I agree to the event rules, and to KarmaVerse contacting me about this event by email or phone.</Text>
                </View>
                {!!err && <Notice tone="bad">{err}</Notice>}
                <PrimaryButton label="Confirm registration" busy={busy} onPress={submit} />
              </>
            )}
          </ScrollView>
        </View>
        {done && !done.already && <LaunchConfetti />}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const web = Platform.OS === 'web';
const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  page: { paddingHorizontal: 20, paddingBottom: 64, maxWidth: MAX_WIDTH, width: '100%', alignSelf: 'center', flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },

  hero: { borderRadius: 28, overflow: 'hidden', marginTop: 14 },
  heroShade: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 },
  heroBody: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 22, gap: 10 },
  heroCat: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  heroCatText: { fontSize: 11, fontWeight: '800', color: '#052e16' },
  title: { fontSize: 30, fontWeight: '900', color: '#ffffff', lineHeight: 34, letterSpacing: -0.8, maxWidth: 820 },
  summary: { fontSize: 16, color: '#dcfce7', lineHeight: 23, maxWidth: 680 },
  ghostBtn: { backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },

  factsRow: { gap: 14, marginTop: 16 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fact: { flexGrow: 1, flexBasis: 140, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 2 },
  factIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  factKey: { fontSize: 11, fontWeight: '800', color: c.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
  factVal: { fontSize: 17, fontWeight: '900', color: c.text },
  factSub: { fontSize: 12, color: c.textFaint },
  countBox: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 18, gap: 14, justifyContent: 'center' },
  audience: { fontSize: 13, color: c.textMuted, fontWeight: '600' },

  columns: { gap: 28 },
  body: { fontSize: 16, lineHeight: 26, color: c.text, maxWidth: 760 },
  li: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  liText: { fontSize: 15, lineHeight: 23, color: c.text, flex: 1, maxWidth: 760 },

  tl: { flexDirection: 'row', gap: 14 },
  tlRail: { width: 36, alignItems: 'center' },
  tlNode: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, borderWidth: 2, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  tlNodeOpen: { backgroundColor: c.primary, borderColor: c.primary, ...(web ? ({ boxShadow: '0 0 0 6px rgba(22,163,74,0.18)' } as any) : {}) },
  tlNodeDone: { borderColor: c.primary },
  tlNodeText: { fontSize: 14, fontWeight: '900', color: c.primaryDeep },
  tlLine: { flex: 1, width: 2, backgroundColor: c.border, marginVertical: 4 },
  tlCard: { flex: 1, minWidth: 0, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 16, gap: 6, marginBottom: 14 },
  tlCardOpen: { borderColor: c.primary, borderWidth: 1.5 },
  tlDay: { fontSize: 11, fontWeight: '800', color: c.primary, letterSpacing: 1, flexShrink: 1 },
  tlPts: { fontSize: 12, fontWeight: '900', color: c.primaryDeep, backgroundColor: c.primarySoft, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100, overflow: 'hidden' },
  tlTitle: { fontSize: 17, fontWeight: '900', color: c.text },
  tlText: { fontSize: 14, lineHeight: 21, color: c.textMuted },
  proof: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.surfaceAlt, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  proofBonus: { backgroundColor: '#fef3c7' },
  proofText: { fontSize: 11, fontWeight: '700', color: c.textMuted },
  note: { fontSize: 13, color: c.textMuted, lineHeight: 20, marginTop: 4 },

  rewards: { borderRadius: 22, padding: 20, gap: 10 },
  rewardsIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  rewardsTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  rewardLine: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  rewardText: { fontSize: 14, color: '#fef9c3', lineHeight: 20, flex: 1 },
  sideCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 20, padding: 18, gap: 12 },
  sideTitle: { fontSize: 16, fontWeight: '900', color: c.text },
  ptsLabel: { fontSize: 13, color: c.textMuted, flexShrink: 1 },
  ptsVal: { fontSize: 14, fontWeight: '900', color: c.text, fontVariant: ['tabular-nums'] },
  ptsTrack: { height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
  ptsFill: { height: 6, borderRadius: 3, backgroundColor: c.primary },

  faq: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18 },
  faqItem: { paddingHorizontal: 18 },
  faqBorder: { borderTopWidth: 1, borderTopColor: c.border },
  faqQ: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 16 },
  faqQText: { fontSize: 15, fontWeight: '800', color: c.text, flex: 1 },
  faqA: { fontSize: 14, lineHeight: 22, color: c.textMuted, paddingBottom: 16 },

  bottomCta: { marginTop: 40, borderRadius: 24, padding: 24, gap: 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
  bottomTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  bottomText: { fontSize: 14, color: '#bbf7d0' },

  sticky: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border,
    ...(web ? ({ boxShadow: '0 -6px 20px rgba(5,46,22,0.08)' } as any) : { elevation: 8 }),
  },
  stickyTitle: { fontSize: 14, fontWeight: '900', color: c.text },
  stickySub: { fontSize: 12, color: c.textMuted },

  modalBack: { flex: 1, backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: c.surface, borderRadius: 24, padding: 22, width: '100%', maxWidth: 520, maxHeight: '92%' as any, gap: 12 },
  modalHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: c.text, flex: 1 },
  consent: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  consentText: { fontSize: 13, color: c.text, flex: 1, lineHeight: 19 },
}));
