import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, Image, TextInput, Pressable, Animated, Easing, AccessibilityInfo,
  Platform, useWindowDimensions, TextInputProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  ChevronLeft, RefreshCw, Calendar, Users, Clock, AlertCircle, LogIn, Leaf, Lightbulb, Trophy, GraduationCap,
  Megaphone, Sparkles, ArrowRight,
} from 'lucide-react-native';
import { useTheme, makeStyles } from '../../theme';
import { EventCard, EventStatus, STATUS_LABEL, fmtDate, fmtRange } from '../../services/eventhub';
import { getToken } from '../../utils/tokenStore';
import { rememberReturnTo } from '../../utils/deepLink';

// Shared building blocks for the EventHub screens. Visual language: "living forest",
// layered greens with an earthy accent per category, contour-line art instead of
// stock photos, and time made visible (countdowns, progress through the event).

export const MAX_WIDTH = 1180;

// ── category identity ────────────────────────────────────────────────────────
// Each category keeps to the green/earth family so the hub still reads as one brand.
type CatTheme = { from: string; to: string; ink: string; Icon: any };
const CATEGORY_THEME: Record<string, CatTheme> = {
  'Sustainability': { from: '#052e16', to: '#15803d', ink: '#bbf7d0', Icon: Leaf },
  'Innovation': { from: '#083344', to: '#0f766e', ink: '#99f6e4', Icon: Lightbulb },
  'Competition': { from: '#422006', to: '#a16207', ink: '#fde68a', Icon: Trophy },
  'Campus Challenges': { from: '#064e3b', to: '#4d7c0f', ink: '#d9f99d', Icon: GraduationCap },
  'Awareness': { from: '#1c3a13', to: '#65a30d', ink: '#ecfccb', Icon: Megaphone },
};
const DEFAULT_THEME: CatTheme = { from: '#052e16', to: '#166534', ink: '#bbf7d0', Icon: Sparkles };
export const categoryTheme = (c?: string) => (c && CATEGORY_THEME[c]) || DEFAULT_THEME;

// ── hooks ────────────────────────────────────────────────────────────────────

export function useColumns(min = 320) {
  const { width } = useWindowDimensions();
  const inner = Math.min(width, MAX_WIDTH) - 40;
  return { cols: Math.max(1, Math.min(3, Math.floor(inner / min))), width, isWide: width >= 900, isPhone: width < 600 };
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduced).catch(() => {});
  }, []);
  return reduced;
}

/** Ticks once a second until the target passes. */
export function useCountdown(target?: string | null) {
  const [now, setNow] = useState(Date.now());
  const t = target ? new Date(target).getTime() : NaN;
  useEffect(() => {
    if (!isFinite(t) || t <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [t]);
  const ms = isFinite(t) ? Math.max(0, t - now) : 0;
  return {
    done: ms <= 0,
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
  };
}

/** The moment that matters next for an event, with a label for it. */
export function nextMoment(e: EventCard): { label: string; at: string } | null {
  const now = Date.now();
  if (e.status === 'upcoming') return { label: 'Starts in', at: e.startAt };
  if (e.status === 'live' && e.registration === 'open' && new Date(e.regClosesAt).getTime() > now) return { label: 'Registration closes in', at: e.regClosesAt };
  if (e.status === 'live') return { label: 'Ends in', at: e.endAt };
  return null;
}

export function timeLeftLabel(e: EventCard) {
  const ms = new Date(e.status === 'upcoming' ? e.startAt : e.endAt).getTime() - Date.now();
  if (e.status === 'completed' || ms <= 0) return '';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor(ms / 3600000);
  const span = d >= 1 ? `${d} day${d === 1 ? '' : 's'}` : h >= 1 ? `${h} hr` : 'under an hour';
  return e.status === 'upcoming' ? `Starts in ${span}` : `${span} left`;
}

export function eventProgress(e: EventCard) {
  const a = new Date(e.startAt).getTime();
  const b = new Date(e.endAt).getTime();
  return Math.max(0, Math.min(1, (Date.now() - a) / Math.max(1, b - a)));
}

// ── header ───────────────────────────────────────────────────────────────────

/** Back button, page title and the EventHub links. */
export function EventHubHeader({ navigation, title, subtitle, active }: { navigation: any; title: string; subtitle?: string; active?: 'events' | 'mine' | 'admin' }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const back = async () => {
    if (navigation.canGoBack()) return navigation.goBack();
    navigation.navigate((await getToken().catch(() => null)) ? 'App' : 'Splash');
  };
  const link = (label: string, route: string, key: string) => (
    <TouchableOpacity key={key} onPress={() => navigation.navigate(route)} style={[styles.navLink, active === key && styles.navLinkOn]} accessibilityRole="link">
      <Text style={[styles.navLinkText, active === key && styles.navLinkTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={back} accessibilityLabel="Back">
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        {/* minWidth lets the links wrap below on phones instead of squeezing the title */}
        <View style={{ flex: 1, minWidth: 180 }}>
          <Text style={styles.headerTitle} accessibilityRole="header" numberOfLines={2}>{title}</Text>
          {!!subtitle && <Text style={styles.headerSub} numberOfLines={2}>{subtitle}</Text>}
        </View>
        <View style={styles.navRow}>
          {link('All events', 'Events', 'events')}
          {link('My events', 'MyEvents', 'mine')}
        </View>
      </View>
    </View>
  );
}

// ── status ───────────────────────────────────────────────────────────────────

/** A softly pulsing dot for anything happening right now. */
export function LiveDot({ color, size = 8 }: { color: string; size?: number }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: Platform.OS !== 'web' }));
    loop.start();
    return () => loop.stop();
  }, [v, reduced]);
  return (
    <View style={{ width: size, height: size }}>
      {!reduced && (
        <Animated.View style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
        }} />
      )}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

const STATUS_COLORS = (c: any): Record<EventStatus, { bg: string; fg: string }> => ({
  live: { bg: c.primary, fg: c.onPrimary },
  upcoming: { bg: c.primarySoft, fg: c.primaryDeep },
  completed: { bg: c.surfaceAlt, fg: c.textMuted },
});

export function StatusPill({ status, label, onImage }: { status: EventStatus; label?: string; onImage?: boolean }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const sc = onImage
    ? { bg: status === 'live' ? '#16a34a' : 'rgba(255,255,255,0.92)', fg: status === 'live' ? '#ffffff' : '#052e16' }
    : STATUS_COLORS(colors)[status];
  return (
    <View style={[styles.pill, { backgroundColor: sc.bg }]}>
      {status === 'live' && <LiveDot color={sc.fg} size={6} />}
      <Text style={[styles.pillText, { color: sc.fg }]}>{label || STATUS_LABEL[status]}</Text>
    </View>
  );
}

export function Chip({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const map = {
    neutral: { bg: colors.surfaceAlt, fg: colors.textMuted },
    good: { bg: colors.successSoft, fg: colors.success },
    warn: { bg: colors.surfaceAlt, fg: colors.warning },
    bad: { bg: colors.dangerSoft, fg: colors.danger },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: map.bg }]}>
      <Text style={[styles.pillText, { color: map.fg }]}>{label}</Text>
    </View>
  );
}

// ── art ──────────────────────────────────────────────────────────────────────

/** Contour lines, like a topographic map of a hillside. Decorative only. */
export function Contours({ color = '#ffffff', opacity = 0.12, width = 600, height = 300 }: { color?: string; opacity?: number; width?: number; height?: number }) {
  const cx = width * 0.82;
  const cy = height * 0.35;
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 } as any} pointerEvents="none">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <Path
          key={i}
          d={`M ${cx - i * 34} ${cy} C ${cx - i * 34} ${cy - i * 30}, ${cx + i * 40} ${cy - i * 26}, ${cx + i * 38} ${cy + i * 4} S ${cx - i * 10} ${cy + i * 36}, ${cx - i * 34} ${cy}`}
          stroke={color}
          strokeOpacity={opacity * (1 - i * 0.09)}
          strokeWidth={1.4}
          fill="none"
        />
      ))}
    </Svg>
  );
}

/** Event banner: the uploaded image, or category art (gradient, contours, icon). Never a stock photo. */
export function Banner({ uri, height, title, category, radius = 0, iconTop }: { uri?: string; height: number; title: string; category?: string; radius?: number; iconTop?: boolean }) {
  const t = categoryTheme(category);
  if (uri) {
    return (
      <View style={{ height, borderRadius: radius, overflow: 'hidden', backgroundColor: t.from }}>
        <Image source={{ uri }} style={{ width: '100%', height }} resizeMode="cover" accessibilityLabel={title} />
        <LinearGradient colors={['transparent', 'rgba(2,20,10,0.45)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.5 }} />
      </View>
    );
  }
  // iconTop: text will be laid over the lower part, so keep the art in the top corner.
  const iconSize = iconTop ? Math.min(84, height * 0.24) : Math.min(120, height * 0.5);
  const iconPos = iconTop ? { right: 24, top: 24 } : { right: height * 0.12, top: (height - iconSize) / 2.4 };
  return (
    <LinearGradient colors={[t.from, t.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height, borderRadius: radius, overflow: 'hidden' }} accessibilityLabel={title}>
      <Contours color={t.ink} opacity={0.35} />
      <View style={{ position: 'absolute', ...iconPos, opacity: iconTop ? 0.75 : 0.9 }}>
        <t.Icon size={iconSize} color={t.ink} strokeWidth={1.1} />
      </View>
    </LinearGradient>
  );
}

// ── time ─────────────────────────────────────────────────────────────────────

export function Countdown({ at, label, onDark }: { at: string; label: string; onDark?: boolean }) {
  const styles = useStyles();
  const c = useCountdown(at);
  if (c.done) return null;
  const cells: [number, string][] = [[c.days, 'days'], [c.hours, 'hrs'], [c.minutes, 'min'], [c.seconds, 'sec']];
  return (
    <View style={{ gap: 8 }} accessibilityLabel={`${label} ${c.days} days ${c.hours} hours ${c.minutes} minutes`}>
      <Text style={[styles.countLabel, onDark && { color: '#bbf7d0' }]}>{label.toUpperCase()}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {cells.map(([v, u]) => (
          <View key={u} style={[styles.countCell, onDark && styles.countCellDark]}>
            <Text style={[styles.countNum, onDark && { color: '#ffffff' }]}>{String(v).padStart(2, '0')}</Text>
            <Text style={[styles.countUnit, onDark && { color: '#bbf7d0' }]}>{u}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Thin bar showing how far through its dates a live event is. */
export function TimeBar({ event }: { event: EventCard }) {
  const styles = useStyles();
  if (event.status !== 'live') return null;
  const p = eventProgress(event);
  const day = Math.min(event.durationDays, Math.floor(p * event.durationDays) + 1);
  return (
    <View style={{ gap: 5 }}>
      <View style={styles.timeTrack}><View style={[styles.timeFill, { width: `${Math.max(4, p * 100)}%` as any }]} /></View>
      <Text style={styles.timeText}>Day {day} of {event.durationDays}</Text>
    </View>
  );
}

/** Circular progress (points earned of the maximum). */
export function ProgressRing({ value, max, size = 120, stroke = 10, color = '#4ade80', track = 'rgba(255,255,255,0.15)', children }: {
  value: number; max: number; size?: number; stroke?: number; color?: string; track?: string; children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, value / Math.max(1, max)));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] } as any}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - p)} />
      </Svg>
      {children}
    </View>
  );
}

// ── cards ────────────────────────────────────────────────────────────────────

export function regLabel(e: EventCard) {
  if (e.status === 'completed') return 'Ended';
  if (e.registration === 'open') return `Register by ${fmtDate(e.regClosesAt)}`;
  if (e.registration === 'not_yet') return 'Registration opens soon';
  if (e.registration === 'full') return 'Event full';
  return 'Registration closed';
}

export function ctaLabel(e: EventCard) {
  if (e.status === 'completed') return 'See results';
  if (e.registration === 'open') return 'Register now';
  return 'View details';
}

export function EventCardView({ event, onPress, style }: { event: EventCard; onPress: () => void; style?: any }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const t = categoryTheme(event.category);
  const left = timeLeftLabel(event);
  const strong = event.registration === 'open' && event.status !== 'completed';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${event.title}, ${STATUS_LABEL[event.status]}`}
      style={({ hovered, pressed }: any) => [styles.card, (hovered || pressed) && styles.cardHover, style]}
    >
      {({ hovered }: any) => (
        <>
          <View>
            <Banner uri={event.bannerUrl} height={164} title={event.title} category={event.category} />
            <View style={styles.cardBadges}>
              <StatusPill status={event.status} onImage />
              {!!left && <View style={styles.leftChip}><Clock size={11} color="#052e16" /><Text style={styles.leftChipText}>{left}</Text></View>}
            </View>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.catRow}>
              <t.Icon size={13} color={colors.primary} />
              <Text style={styles.category}>{event.category.toUpperCase()}</Text>
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>
            <Text style={styles.cardSummary} numberOfLines={3}>{event.summary}</Text>
            <TimeBar event={event} />
            <View style={styles.meta}>
              <MetaLine icon={<Calendar size={14} color={colors.textMuted} />} text={`${fmtRange(event.startAt, event.endAt)} · ${event.durationDays} days`} />
              <MetaLine icon={<Users size={14} color={colors.textMuted} />} text={`${event.participants.toLocaleString('en-IN')} joined · ${event.fee}`} />
            </View>
            <View style={styles.cardFoot}>
              <Text style={styles.footNote} numberOfLines={1}>{regLabel(event)}</Text>
              <View style={[styles.cardCta, !strong && styles.cardCtaQuiet]}>
                <Text style={[styles.cardCtaText, !strong && styles.cardCtaTextQuiet]}>{ctaLabel(event)}</Text>
                <View style={{ transform: [{ translateX: hovered ? 3 : 0 }] }}>
                  <ArrowRight size={14} color={strong ? colors.onPrimary : colors.primaryDeep} />
                </View>
              </View>
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
}

export function MetaLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  const styles = useStyles();
  return (
    <View style={styles.metaLine}>
      {icon}
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

/** Equal-width columns inside the page's 20px side padding. */
export function Grid({ children, cols }: { children: React.ReactNode; cols: number }) {
  const { width } = useWindowDimensions();
  const items = React.Children.toArray(children);
  const gap = 18;
  const inner = Math.min(width, MAX_WIDTH) - 40;
  const itemWidth = cols === 1 ? inner : Math.floor((inner - gap * (cols - 1)) / cols);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {items.map((child, i) => (
        <View key={i} style={{ width: itemWidth, maxWidth: '100%' }}>
          {child}
        </View>
      ))}
    </View>
  );
}

// ── states & controls ────────────────────────────────────────────────────────

/** Loading, error (with retry or log in) and empty states, in one place. */
export function StateView({ loading, error, onRetry, empty, emptyText, onLogin, children }: {
  loading?: boolean; error?: string | null; onRetry?: () => void; empty?: boolean; emptyText?: string; onLogin?: () => void; children?: React.ReactNode;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  if (loading) {
    return (
      <View style={styles.skeletonWrap} accessibilityLabel="Loading">
        {[0, 1, 2].map((i) => <View key={i} style={[styles.skeleton, { opacity: 1 - i * 0.25 }]} />)}
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.stateBox}>
        <View style={styles.stateIcon}><AlertCircle size={26} color={onLogin ? colors.primary : colors.danger} /></View>
        <Text style={styles.stateText}>{error}</Text>
        {onLogin ? (
          <PrimaryButton label="Log in" onPress={onLogin} icon={<LogIn size={16} color={colors.onPrimary} />} />
        ) : onRetry ? (
          <PrimaryButton label="Try again" onPress={onRetry} icon={<RefreshCw size={16} color={colors.onPrimary} />} />
        ) : null}
      </View>
    );
  }
  if (empty) {
    return (
      <View style={styles.stateBox}>
        <View style={styles.stateIcon}><Leaf size={26} color={colors.primary} /></View>
        <Text style={styles.stateText}>{emptyText || 'Nothing here yet.'}</Text>
      </View>
    );
  }
  return <>{children}</>;
}

export function PrimaryButton({ label, onPress, disabled, busy, icon, quiet, danger, light, style }: {
  label: string; onPress: () => void; disabled?: boolean; busy?: boolean; icon?: React.ReactNode; quiet?: boolean; danger?: boolean; light?: boolean; style?: any;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const off = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ hovered, pressed }: any) => [
        styles.btn, quiet && styles.btnQuiet, danger && styles.btnDanger, light && styles.btnLight, off && styles.btnOff,
        (hovered || pressed) && !off && styles.btnHover, style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
    >
      {busy ? <ActivityIndicator size="small" color={quiet || light ? colors.primary : colors.onPrimary} /> : icon}
      <Text style={[styles.btnText, (quiet || light) && styles.btnTextQuiet]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, error, id, ...props }: TextInputProps & { label: string; hint?: string; error?: string; id: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel} nativeID={`${id}-label`}>{label}</Text>
      <TextInput
        {...props}
        nativeID={id}
        accessibilityLabelledBy={`${id}-label` as any}
        accessibilityLabel={label}
        placeholderTextColor={colors.textFaint}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={[styles.input, props.multiline && styles.inputMulti, focused && { borderColor: colors.primary }, !!error && { borderColor: colors.danger }, props.style]}
      />
      {!!hint && !error && <Text style={styles.fieldHint}>{hint}</Text>}
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

/** Section heading with an optional small eyebrow above it. */
export function SectionTitle({ children, eyebrow }: { children: React.ReactNode; eyebrow?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.sectionHead}>
      {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>}
      <Text style={styles.sectionTitle} accessibilityRole="header">{children}</Text>
    </View>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'good' | 'bad'; children: React.ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const bg = tone === 'good' ? colors.successSoft : tone === 'bad' ? colors.dangerSoft : colors.primarySoft;
  const fg = tone === 'good' ? colors.success : tone === 'bad' ? colors.danger : colors.primaryDeep;
  return (
    <View style={[styles.notice, { backgroundColor: bg, borderLeftColor: fg }]} accessibilityLiveRegion="polite">
      {typeof children === 'string' ? <Text style={[styles.noticeText, { color: fg }]}>{children}</Text> : children}
    </View>
  );
}

/** Sends the user to Login and brings them back to this exact screen afterwards. */
export function goLogin(navigation: any, name: string, params?: Record<string, any>) {
  rememberReturnTo(name, params);
  navigation.navigate('Login');
}

const web = Platform.OS === 'web';
const transition = web ? ({ transitionDuration: '200ms', transitionProperty: 'transform, box-shadow, background-color, border-color' } as any) : {};

const useStyles = makeStyles((c) => ({
  header: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 6, maxWidth: MAX_WIDTH, width: '100%', alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  backBtn: { padding: 8, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border },
  headerTitle: { fontSize: 24, fontWeight: '900', color: c.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 14, color: c.textMuted, marginTop: 2 },
  navRow: { flexDirection: 'row', gap: 6, backgroundColor: c.surfaceAlt, padding: 4, borderRadius: 100 },
  navLink: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100 },
  navLinkOn: { backgroundColor: c.surface, ...(web ? ({ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } as any) : {}) },
  navLinkText: { fontSize: 13, fontWeight: '700', color: c.textMuted },
  navLinkTextOn: { color: c.text },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  pillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },

  card: {
    backgroundColor: c.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: c.border, height: '100%', ...transition,
    ...(web ? ({ boxShadow: '0 1px 2px rgba(5,46,22,0.04), 0 4px 16px rgba(5,46,22,0.05)' } as any) : { elevation: 1 }),
  },
  cardHover: { transform: [{ translateY: -4 }], borderColor: c.primary, ...(web ? ({ boxShadow: '0 14px 34px rgba(5,46,22,0.14)' } as any) : {}) },
  cardBadges: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  leftChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 100 },
  leftChipText: { fontSize: 11, fontWeight: '800', color: '#052e16' },
  cardBody: { padding: 18, gap: 9, flexGrow: 1 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  category: { fontSize: 11, fontWeight: '800', color: c.primary, letterSpacing: 1.2 },
  cardTitle: { fontSize: 19, fontWeight: '900', color: c.text, letterSpacing: -0.2, lineHeight: 24 },
  cardSummary: { fontSize: 14, lineHeight: 21, color: c.textMuted },
  meta: { gap: 6, marginTop: 2 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaText: { fontSize: 13, color: c.textMuted, flexShrink: 1 },
  cardFoot: { marginTop: 'auto' as any, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  footNote: { fontSize: 12, color: c.textFaint, fontWeight: '600', flexShrink: 1 },
  cardCta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 100 },
  cardCtaQuiet: { backgroundColor: c.primarySoft },
  cardCtaText: { color: c.onPrimary, fontWeight: '800', fontSize: 13 },
  cardCtaTextQuiet: { color: c.primaryDeep },

  timeTrack: { height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
  timeFill: { height: 6, borderRadius: 3, backgroundColor: c.primary },
  timeText: { fontSize: 11, fontWeight: '800', color: c.primary, letterSpacing: 0.3 },

  countLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: c.textMuted },
  countCell: { minWidth: 58, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 12, backgroundColor: c.surfaceAlt },
  countCellDark: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  countNum: { fontSize: 24, fontWeight: '900', color: c.text, fontVariant: ['tabular-nums'] },
  countUnit: { fontSize: 10, fontWeight: '700', color: c.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },

  stateBox: { alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 56, paddingHorizontal: 20 },
  stateIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stateText: { fontSize: 15, color: c.textMuted, textAlign: 'center', maxWidth: 460, lineHeight: 22 },
  skeletonWrap: { gap: 14, paddingVertical: 24, alignItems: 'center' },
  skeleton: { width: '100%', height: 120, borderRadius: 18, backgroundColor: c.surfaceAlt },

  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 100, alignSelf: 'flex-start', ...transition },
  btnHover: { transform: [{ translateY: -1 }], ...(web ? ({ boxShadow: '0 6px 18px rgba(22,163,74,0.28)' } as any) : {}) },
  btnQuiet: { backgroundColor: c.primarySoft },
  btnLight: { backgroundColor: '#ffffff' },
  btnDanger: { backgroundColor: c.danger },
  btnOff: { opacity: 0.55 },
  btnText: { color: c.onPrimary, fontWeight: '800', fontSize: 14 },
  btnTextQuiet: { color: c.primaryDeep },

  field: { gap: 6, flexGrow: 1 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: c.text },
  input: { borderWidth: 1.5, borderColor: c.border, backgroundColor: c.inputBg, color: c.text, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, ...transition },
  inputMulti: { minHeight: 110, textAlignVertical: 'top' },
  fieldHint: { fontSize: 12, color: c.textFaint },
  fieldError: { fontSize: 12, color: c.danger, fontWeight: '600' },

  sectionHead: { marginTop: 36, marginBottom: 14, gap: 4 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6, color: c.primary },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: c.text, letterSpacing: -0.3 },
  notice: { borderRadius: 12, padding: 14, borderLeftWidth: 4 },
  noticeText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
}));
