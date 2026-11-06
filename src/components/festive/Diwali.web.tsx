import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';

// Diwali decorations for the website. Plain SVG + CSS animations (no images), so
// the landing page stays light. All of it is purely decorative: aria-hidden and
// pointer-events none, and it stops moving for visitors who ask for reduced motion.
const CSS = `
.kvd-bulb { animation: kvd-twinkle 2.4s ease-in-out infinite; }
@keyframes kvd-twinkle { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
.kvd-flame { transform-box: fill-box; transform-origin: 50% 100%; animation: kvd-flicker 1.6s ease-in-out infinite; }
@keyframes kvd-flicker {
  0%, 100% { transform: scale(1, 1) skewX(0deg); }
  25% { transform: scale(.92, 1.08) skewX(-3deg); }
  50% { transform: scale(1.05, .94) skewX(2deg); }
  75% { transform: scale(.96, 1.05) skewX(-1deg); }
}
.kvd-halo { transform-box: fill-box; transform-origin: 50% 50%; animation: kvd-glow 2.2s ease-in-out infinite; }
@keyframes kvd-glow { 0%, 100% { opacity: .55; transform: scale(1); } 50% { opacity: .9; transform: scale(1.15); } }
.kvd-spark { opacity: 0; animation: kvd-sparkle 3.2s ease-in-out infinite; }
@keyframes kvd-sparkle { 0%, 100% { opacity: 0; transform: scale(.4) rotate(0deg); } 50% { opacity: .75; transform: scale(1) rotate(45deg); } }
.kvd-strand { transform-origin: 50% 0; animation: kvd-sway 4s ease-in-out infinite; }
@keyframes kvd-sway { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
@media (prefers-reduced-motion: reduce) {
  .kvd-bulb, .kvd-flame, .kvd-halo, .kvd-spark, .kvd-strand { animation: none; }
  .kvd-spark { opacity: .6; }
}
`;

function ensureCss() {
  if (typeof document === 'undefined' || document.getElementById('kv-diwali-css')) return;
  const el = document.createElement('style');
  el.id = 'kv-diwali-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

let uid = 0;
const useUid = () => useMemo(() => `kvd${++uid}`, []);

const BULB_COLORS = ['#fbbf24', '#fb923c', '#f472b6', '#fef3c7', '#4ade80'];
const SEG = 96;

// A string of lights (jhalar) hanging in swags across the full width, from `top`.
export function DiwaliLights({ top = 0, compact = false }: { top?: number; compact?: boolean }) {
  ensureCss();
  const h = compact ? 26 : 34;
  return (
    <div aria-hidden style={{ position: 'absolute', top, left: 0, right: 0, height: h, overflow: 'hidden', pointerEvents: 'none', display: 'flex' }}>
      {Array.from({ length: 32 }, (_, seg) => (
        <svg key={seg} width={(SEG * h) / 34} height={h} viewBox={`0 0 ${SEG} 34`} style={{ flexShrink: 0 }}>
          <path d="M0 3 Q48 22 96 3" fill="none" stroke="rgba(120,53,15,0.8)" strokeWidth={1.3} />
          {[24, 48, 72].map((x, b) => {
            const t = x / SEG;
            const y = 3 + 38 * t * (1 - t);
            const i = seg * 3 + b;
            const color = BULB_COLORS[i % BULB_COLORS.length];
            return (
              <g key={b}>
                <rect x={x - 1.6} y={y - 0.5} width={3.2} height={3} rx={0.8} fill="#57534e" />
                <ellipse
                  className="kvd-bulb"
                  cx={x}
                  cy={y + 7}
                  rx={3.3}
                  ry={4.8}
                  fill={color}
                  style={{ filter: `drop-shadow(0 0 4px ${color})`, animationDelay: `${((i * 0.37) % 2.4).toFixed(2)}s` }}
                />
              </g>
            );
          })}
        </svg>
      ))}
    </div>
  );
}

function Diya({ id, delay, scale = 1 }: { id: string; delay: number; scale?: number }) {
  const anim = { animationDelay: `${delay.toFixed(2)}s` };
  return (
    <svg width={46 * scale} height={52 * scale} viewBox="0 0 46 52">
      <defs>
        <radialGradient id={`${id}h`}>
          <stop offset="0" stopColor="#fde68a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffbeb" />
          <stop offset="0.45" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ea580c" />
          <stop offset="1" stopColor="#7c2d12" />
        </linearGradient>
      </defs>
      <circle className="kvd-halo" cx="23" cy="17" r="15" fill={`url(#${id}h)`} style={anim} />
      <path className="kvd-flame" d="M23 5 C27.5 12 29.5 17 23 25 C16.5 17 18.5 12 23 5 Z" fill={`url(#${id}f)`} style={anim} />
      <path className="kvd-flame" d="M23 13 C25 17 25.5 20 23 24 C20.5 20 21 17 23 13 Z" fill="#fffbeb" opacity="0.85" style={anim} />
      <rect x="22.3" y="23" width="1.4" height="4" fill="#44403c" />
      <path d="M4 27 Q23 50 42 27 Z" fill={`url(#${id}b)`} />
      <ellipse cx="23" cy="27" rx="19" ry="3.6" fill="#9a3412" />
      <ellipse cx="23" cy="26.6" rx="16" ry="2.2" fill="#fbbf24" opacity="0.55" />
      <circle cx="13" cy="33" r="1.6" fill="#fde68a" />
      <circle cx="23" cy="36" r="1.6" fill="#fde68a" />
      <circle cx="33" cy="33" r="1.6" fill="#fde68a" />
    </svg>
  );
}

// A row of lit diyas along the bottom of a section.
export function DiwaliDiyas({ count }: { count: number }) {
  ensureCss();
  const base = useUid();
  return (
    <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 4, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ width: '100%', maxWidth: 1100, display: 'flex', justifyContent: 'space-between', padding: '0 24px' }}>
        {Array.from({ length: count }, (_, i) => (
          <Diya key={i} id={`${base}-${i}`} delay={(i * 0.29) % 1.6} />
        ))}
      </div>
    </div>
  );
}

// Small gold sparkles twinkling across a dark section. `from` keeps them right of
// that point (in %), away from text on the left.
export function DiwaliSparkles({ count = 18, from = 0 }: { count?: number; from?: number }) {
  ensureCss();
  const stars = useMemo(
    () => Array.from({ length: count }, () => ({
      left: from + Math.random() * (97 - from),
      top: 8 + Math.random() * 80,
      size: 9 + Math.random() * 9,
      delay: Math.random() * 3.2,
      duration: 2.6 + Math.random() * 2,
    })),
    [count, from],
  );
  return (
    <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none' }}>
      {stars.map((st, i) => (
        <svg
          key={i}
          className="kvd-spark"
          width={st.size}
          height={st.size}
          viewBox="0 0 10 10"
          style={{ position: 'absolute', left: `${st.left}%`, top: `${st.top}%`, animationDelay: `${st.delay.toFixed(2)}s`, animationDuration: `${st.duration.toFixed(2)}s` }}
        >
          <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="#fde68a" />
        </svg>
      ))}
    </div>
  );
}

function Strand({ n, x, delay }: { n: number; x: number; delay: number }) {
  const h = n * 13 + 16;
  return (
    <svg className="kvd-strand" width={20} height={h} viewBox={`0 0 20 ${h}`} style={{ position: 'absolute', top: 0, left: x, animationDelay: `${delay}s` }}>
      <line x1="10" y1="0" x2="10" y2={n * 13} stroke="#65a30d" strokeWidth="1" />
      {Array.from({ length: n }, (_, i) => {
        const cy = 8 + i * 13;
        const yellow = i % 2 === 1;
        return (
          <g key={i}>
            <circle cx="10" cy={cy} r="7" fill={yellow ? '#facc15' : '#f97316'} />
            <circle cx="10" cy={cy} r="7" fill="none" stroke={yellow ? '#eab308' : '#ea580c'} strokeWidth="2" strokeDasharray="2 1.6" />
            <circle cx="10" cy={cy} r="2" fill={yellow ? '#ca8a04' : '#c2410c'} />
          </g>
        );
      })}
      <path d={`M10 ${n * 13 + 2} q5 6 0 13 q-5 -7 0 -13 Z`} fill="#16a34a" />
    </svg>
  );
}

// Marigold (genda) strings hanging in both top corners. Wide screens only, where
// the corners are clear of the content.
export function DiwaliMarigolds() {
  ensureCss();
  return (
    <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: 0, left: 10, width: 64 }}>
        <Strand n={6} x={0} delay={0} />
        <Strand n={9} x={22} delay={0.6} />
        <Strand n={5} x={44} delay={1.2} />
      </div>
      <div style={{ position: 'absolute', top: 0, right: 10, width: 64 }}>
        <Strand n={5} x={0} delay={0.9} />
        <Strand n={9} x={22} delay={0.3} />
        <Strand n={6} x={44} delay={1.5} />
      </div>
    </div>
  );
}

// "Diwali cleaning" call to action: the clean-up before Diwali is exactly what a
// pickup is for.
export function DiwaliCleanupCard({ onPress, isMobile = false }: { onPress: () => void; isMobile?: boolean }) {
  ensureCss();
  const base = useUid();
  return (
    <LinearGradient colors={['#450a0a', '#7c2d12', '#b45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.card, isMobile && s.cardMobile]}>
      <DiwaliLights compact />
      {!isMobile && <DiwaliSparkles count={8} from={68} />}
      <View style={[s.row, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 0 }]}>
        <View style={isMobile ? undefined : { flex: 1 }}>
          <View style={s.chip}><Text style={s.chipText}>DIWALI SPECIAL</Text></View>
          <Text style={[s.title, isMobile && { fontSize: 22 }]}>Clearing out before Diwali?</Text>
          <Text style={s.body}>
            Old newspapers, cartons, e-waste and clothes from your Diwali cleaning deserve a second life.
            Schedule a pickup and earn KarmaCoins for it.
          </Text>
          <TouchableOpacity style={s.cta} onPress={onPress} activeOpacity={0.85}>
            <Text style={s.ctaText}>Schedule a pickup</Text>
            <ArrowRight size={16} color="#451a03" />
          </TouchableOpacity>
        </View>
        {!isMobile && (
          <div aria-hidden style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            <Diya id={`${base}-a`} delay={0.2} scale={1.3} />
            <Diya id={`${base}-b`} delay={0.9} scale={1.8} />
            <Diya id={`${base}-c`} delay={0.5} scale={1.3} />
          </div>
        )}
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 20, overflow: 'hidden', paddingHorizontal: 28, paddingTop: 44, paddingBottom: 28 },
  cardMobile: { paddingHorizontal: 20, paddingBottom: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  chip: { alignSelf: 'flex-start', backgroundColor: 'rgba(251,191,36,0.18)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12 },
  chipText: { color: '#fcd34d', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: '#ffffff', fontSize: 26, fontWeight: '900', marginBottom: 8 },
  body: { color: 'rgba(255,255,255,0.82)', fontSize: 15, lineHeight: 22, maxWidth: 560, marginBottom: 18 },
  cta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fbbf24', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  ctaText: { color: '#451a03', fontSize: 15, fontWeight: '900' },
});
