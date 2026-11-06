import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Share2, X } from 'lucide-react-native';
import { getLocalDateStr } from '../../utils/quizDate';
import { DIWALI_DAYS } from '../../utils/festive';

// Diwali decorations for the website. Plain SVG + CSS animations (no images), so
// the landing page stays light. All of it is purely decorative: aria-hidden and
// pointer-events none (except hovering a diya). Layers pause while scrolled out of
// view, and everything stands still for visitors who ask for reduced motion.
const CSS = `
.kvd-paused, .kvd-paused * { animation-play-state: paused !important; }

.kvd-bulb { animation: kvd-chase 2.4s ease-in-out infinite; }
@keyframes kvd-chase { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }
.kvd-on { animation: kvd-on .45s ease-out both; }
@keyframes kvd-on { from { opacity: 0; } to { opacity: 1; } }

.kvd-flame { transform-box: fill-box; transform-origin: 50% 100%; animation: kvd-flicker 1.6s ease-in-out infinite; }
@keyframes kvd-flicker {
  0%, 100% { transform: scale(1, 1) skewX(0deg); }
  25% { transform: scale(.92, 1.08) skewX(-3deg); }
  50% { transform: scale(1.05, .94) skewX(2deg); }
  75% { transform: scale(.96, 1.05) skewX(-1deg); }
}
.kvd-halo { transform-box: fill-box; transform-origin: 50% 50%; animation: kvd-glow 2.2s ease-in-out infinite; }
@keyframes kvd-glow { 0%, 100% { opacity: .55; transform: scale(1); } 50% { opacity: .9; transform: scale(1.15); } }
.kvd-ignite { transform-box: fill-box; transform-origin: 50% 100%; animation: kvd-ignite .7s cubic-bezier(.2, 1.6, .4, 1) both; }
@keyframes kvd-ignite { 0% { opacity: 0; transform: scale(.1); } 60% { opacity: 1; transform: scale(1.3); } 100% { transform: scale(1); } }
.kvd-flash { transform-box: fill-box; transform-origin: center; opacity: 0; animation: kvd-flash .9s ease-out both; }
@keyframes kvd-flash { 0% { opacity: .9; transform: scale(.2); } 100% { opacity: 0; transform: scale(2.4); } }
.kvd-diya { pointer-events: auto; cursor: pointer; }
.kvd-grow { transform-box: fill-box; transform-origin: 50% 100%; transition: transform .25s ease; }
.kvd-diya:hover .kvd-grow { transform: scale(1.35); }
.kvd-pop { opacity: 0; }
.kvd-diya:hover .kvd-pop { animation: kvd-pop .8s ease-out; }
@keyframes kvd-pop { 0% { opacity: 1; transform: translate(0, 0); } 100% { opacity: 0; transform: translate(var(--dx), -26px); } }

.kvd-spark { opacity: 0; animation: kvd-sparkle 3.2s ease-in-out infinite; }
@keyframes kvd-sparkle { 0%, 100% { opacity: 0; transform: scale(.4) rotate(0deg); } 50% { opacity: .75; transform: scale(1) rotate(45deg); } }

.kvd-ember { position: absolute; bottom: 0; border-radius: 50%; background: #fcd34d; box-shadow: 0 0 6px 2px rgba(251,191,36,.55); opacity: 0; animation: kvd-rise 5s ease-out infinite; }
@keyframes kvd-rise { 0% { opacity: 0; transform: translate(0, 0) scale(1); } 12% { opacity: 1; } 100% { opacity: 0; transform: translate(var(--dx), var(--rise)) scale(.3); } }

.kvd-strand, .kvd-swing { transform-origin: 50% 0; animation: kvd-sway 4s ease-in-out infinite; }
.kvd-swing { animation-duration: 5s; }
@keyframes kvd-sway { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }

.kvd-spin { transform-box: fill-box; transform-origin: center; animation: kvd-spin 160s linear infinite; }
@keyframes kvd-spin { to { transform: rotate(360deg); } }
@keyframes kvd-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes kvd-fillin { from { fill-opacity: 0; } to { fill-opacity: 1; } }

.kvd-shimmer {
  background: linear-gradient(100deg, #fde68a 0%, #fbbf24 35%, #fff7d6 50%, #fbbf24 65%, #fde68a 100%);
  background-size: 250% 100%; -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: kvd-shimmer 3.5s linear infinite;
}
@keyframes kvd-shimmer { from { background-position: 100% 0; } to { background-position: -150% 0; } }
.kvd-sweep {
  position: absolute; top: 0; bottom: 0; left: 0; width: 45%; pointer-events: none;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.6), transparent);
  transform: translateX(-120%); animation: kvd-sweep 3.2s ease-in-out infinite;
}
@keyframes kvd-sweep { 0% { transform: translateX(-120%); } 55%, 100% { transform: translateX(320%); } }

.kvd-trail {
  position: absolute; width: 9px; height: 9px; margin: -4px 0 0 -4px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, #fff7d6 0%, #fbbf24 60%, transparent 72%);
  box-shadow: 0 0 8px 2px rgba(251,191,36,.7); animation: kvd-trail .8s ease-out forwards;
}
@keyframes kvd-trail { 0% { opacity: 1; transform: translate(0, 0) scale(1); } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(.2); } }

.kvd-item { transform-box: fill-box; transform-origin: center; opacity: 0; animation: kvd-item 6s ease-in-out infinite; }
@keyframes kvd-item {
  0% { opacity: 0; transform: translate(0, 22px) scale(.7) rotate(0deg); }
  8% { opacity: 1; }
  30% { opacity: 1; transform: translate(var(--x), -58px) scale(1) rotate(var(--r)); }
  38%, 100% { opacity: 0; transform: translate(var(--x), -62px) scale(.6) rotate(var(--r)); }
}
.kvd-coin { transform-box: fill-box; transform-origin: center; opacity: 0; animation: kvd-coin 6s ease-out infinite; }
@keyframes kvd-coin {
  0%, 30% { opacity: 0; transform: translate(var(--x), -60px) scale(.3); }
  38% { opacity: 1; transform: translate(var(--x), -62px) scale(1.15); }
  44% { transform: translate(var(--x), -64px) scale(1); }
  70% { opacity: 1; transform: translate(var(--x), -84px) scale(1); }
  80%, 100% { opacity: 0; transform: translate(var(--x), -92px) scale(.9); }
}

.kvd-wait { transform-box: fill-box; transform-origin: center; animation: kvd-wait 1.8s ease-in-out infinite; }
@keyframes kvd-wait { 0%, 100% { opacity: .25; transform: scale(.9); } 50% { opacity: .9; transform: scale(1.1); } }

@property --kvd-a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
.kvd-border {
  position: absolute; top: 0; right: 0; bottom: 0; left: 0; border-radius: inherit; padding: 1.5px; pointer-events: none;
  background: conic-gradient(from var(--kvd-a), transparent 0deg 250deg, #fbbf24 300deg, #fff7d6 320deg, #fbbf24 340deg, transparent 360deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude;
  animation: kvd-border 4s linear infinite;
}
@keyframes kvd-border { to { --kvd-a: 360deg; } }

.kvd-burst span {
  position: absolute; left: 0; top: 0; width: 5px; height: 5px; margin: -2.5px; border-radius: 50%;
  background: #fde68a; box-shadow: 0 0 6px 2px rgba(251,191,36,.7); animation: kvd-burst .9s ease-out forwards;
}
@keyframes kvd-burst { from { opacity: 1; transform: rotate(var(--a)) translateX(0); } to { opacity: 0; transform: rotate(var(--a)) translateX(var(--d)); } }

.kvd-env { animation: kvd-env-out .45s ease-in .95s forwards; }
@keyframes kvd-env-out { to { opacity: 0; transform: translateY(50px) scale(.9); } }
.kvd-flap { transform-box: fill-box; transform-origin: 50% 0; animation: kvd-flap .55s ease-in-out .3s forwards; }
@keyframes kvd-flap { to { transform: scaleY(-1); } }
.kvd-letter { animation: kvd-letter .6s cubic-bezier(.2, 1.3, .4, 1) 1.05s both; }
@keyframes kvd-letter { from { opacity: 0; transform: translateY(70px) scale(.6); } to { opacity: 1; transform: none; } }

@media (prefers-reduced-motion: reduce) {
  .kvd-wait, .kvd-border, .kvd-env, .kvd-flap, .kvd-letter,
  .kvd-bulb, .kvd-on, .kvd-flame, .kvd-halo, .kvd-ignite, .kvd-flash, .kvd-spark, .kvd-ember,
  .kvd-strand, .kvd-swing, .kvd-spin, .kvd-shimmer, .kvd-sweep, .kvd-item, .kvd-coin, .kvd-rangoli * { animation: none !important; }
  .kvd-spark { opacity: .6; }
  .kvd-sweep, .kvd-ember, .kvd-trail, .kvd-item, .kvd-env, .kvd-burst { display: none; }
  .kvd-coin { opacity: 1; transform: translate(var(--x), -64px); }
}
`;

function ensureCss() {
  if (typeof document === 'undefined' || document.getElementById('kv-diwali-css')) return;
  const el = document.createElement('style');
  el.id = 'kv-diwali-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

// The opening sequence (lights switching on, diyas lighting up, rangoli drawing
// itself) plays once per browser tab, during the first seconds of that page load.
let introThisLoad: boolean | null = null;
function playIntro(): boolean {
  if (introThisLoad === null) {
    try {
      introThisLoad = !sessionStorage.getItem('kvDiwaliIntro');
      sessionStorage.setItem('kvDiwaliIntro', '1');
    } catch {
      introThisLoad = false;
    }
  }
  return introThisLoad && performance.now() < 15000;
}

let uid = 0;
const useUid = () => useMemo(() => `kvd${++uid}`, []);

// Pauses the animations inside a layer while it's scrolled out of view.
function usePauseOffscreen() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(([entry]) => el.classList.toggle('kvd-paused', !entry.isIntersecting));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

const cssVars = (vars: Record<string, string>) => vars as React.CSSProperties;

// Absolute layer with a centred box as wide as the page content, for decorations
// placed relative to the content rather than the screen edge.
function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 1100, height: '100%' }}>{children}</div>
    </div>
  );
}

const BULB_COLORS = ['#fbbf24', '#fb923c', '#f472b6', '#fef3c7', '#4ade80'];
const SEG = 96;

// A string of lights (jhalar) hanging in swags across the full width, from `top`.
// The light runs along it as a wave; on the first load the bulbs switch on left to right.
export function DiwaliLights({ top = 0, compact = false }: { top?: number; compact?: boolean }) {
  ensureCss();
  const ref = usePauseOffscreen();
  const intro = playIntro();
  const h = compact ? 26 : 34;
  return (
    <div ref={ref} aria-hidden style={{ position: 'absolute', top, left: 0, right: 0, height: h, overflow: 'hidden', pointerEvents: 'none', display: 'flex' }}>
      {Array.from({ length: 32 }, (_, seg) => (
        <svg key={seg} width={(SEG * h) / 34} height={h} viewBox={`0 0 ${SEG} 34`} style={{ flexShrink: 0 }}>
          <path d="M0 3 Q48 22 96 3" fill="none" stroke="rgba(120,53,15,0.8)" strokeWidth={1.3} />
          {[24, 48, 72].map((x, b) => {
            const t = x / SEG;
            const y = 3 + 38 * t * (1 - t);
            const i = seg * 3 + b;
            const color = BULB_COLORS[i % BULB_COLORS.length];
            return (
              <g key={b} className={intro ? 'kvd-on' : undefined} style={intro ? { animationDelay: `${(0.3 + i * 0.025).toFixed(3)}s` } : undefined}>
                <rect x={x - 1.6} y={y - 0.5} width={3.2} height={3} rx={0.8} fill="#57534e" />
                <ellipse
                  className="kvd-bulb"
                  cx={x}
                  cy={y + 7}
                  rx={3.3}
                  ry={4.8}
                  fill={color}
                  style={{ filter: `drop-shadow(0 0 4px ${color})`, animationDelay: `${((i * 0.1) % 2.4).toFixed(2)}s` }}
                />
              </g>
            );
          })}
        </svg>
      ))}
    </div>
  );
}

// One clay diya. With `ignite` it lights up after `igniteDelay`. Hovering makes the
// flame jump and throw a few sparks. Unlit (`lit` false) it shows only the wick, with
// a pulsing ring when `waiting` for today's action.
function Diya({ id, delay, scale = 1, ignite = false, igniteDelay = 0, lit = true, waiting = false }: {
  id: string; delay: number; scale?: number; ignite?: boolean; igniteDelay?: number; lit?: boolean; waiting?: boolean;
}) {
  const anim = { animationDelay: `${delay.toFixed(2)}s` };
  const igniteStyle = { animationDelay: `${igniteDelay.toFixed(2)}s` };
  return (
    <svg className={lit ? 'kvd-diya' : undefined} width={46 * scale} height={52 * scale} viewBox="0 0 46 52" style={{ overflow: 'visible' }}>
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
      {lit && (
        <>
          <g className="kvd-grow">
            <g className={ignite ? 'kvd-ignite' : undefined} style={ignite ? igniteStyle : undefined}>
              <circle className="kvd-halo" cx="23" cy="17" r="15" fill={`url(#${id}h)`} style={anim} />
              <path className="kvd-flame" d="M23 5 C27.5 12 29.5 17 23 25 C16.5 17 18.5 12 23 5 Z" fill={`url(#${id}f)`} style={anim} />
              <path className="kvd-flame" d="M23 13 C25 17 25.5 20 23 24 C20.5 20 21 17 23 13 Z" fill="#fffbeb" opacity="0.85" style={anim} />
            </g>
          </g>
          {ignite && <circle className="kvd-flash" cx="23" cy="16" r="10" fill="#fff7d6" style={igniteStyle} />}
          {[-8, 0, 8].map((dx) => (
            <circle key={dx} className="kvd-pop" cx="23" cy="8" r="1.4" fill="#fde68a" style={cssVars({ '--dx': `${dx}px` })} />
          ))}
        </>
      )}
      {waiting && <circle className="kvd-wait" cx="23" cy="16" r="10" fill="none" stroke="#fde68a" strokeWidth="1.5" strokeDasharray="3 3" />}
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

// A row of lit diyas along the bottom of a section. On the first load they light
// up one after another, left to right.
export function DiwaliDiyas({ count }: { count: number }) {
  ensureCss();
  const base = useUid();
  const ref = usePauseOffscreen();
  const intro = playIntro();
  return (
    <div ref={ref} aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 4, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ width: '100%', maxWidth: 1100, display: 'flex', justifyContent: 'space-between', padding: '0 24px' }}>
        {Array.from({ length: count }, (_, i) => (
          <Diya key={i} id={`${base}-${i}`} delay={(i * 0.29) % 1.6} ignite={intro} igniteDelay={0.5 + i * 0.22} />
        ))}
      </div>
    </div>
  );
}

// Gold embers drifting up from the diyas and fading out.
export function DiwaliEmbers({ count = 16 }: { count?: number }) {
  ensureCss();
  const ref = usePauseOffscreen();
  const embers = useMemo(
    () => Array.from({ length: count }, () => ({
      left: 3 + Math.random() * 94,
      size: 2 + Math.random() * 2.5,
      dx: (Math.random() - 0.5) * 60,
      rise: -(160 + Math.random() * 160),
      delay: Math.random() * 6,
      duration: 4 + Math.random() * 3,
    })),
    [count],
  );
  return (
    <div ref={ref} aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 34, height: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 1100 }}>
        {embers.map((e, i) => (
          <span
            key={i}
            className="kvd-ember"
            style={{
              left: `${e.left}%`, width: e.size, height: e.size,
              animationDelay: `${e.delay.toFixed(2)}s`, animationDuration: `${e.duration.toFixed(2)}s`,
              ...cssVars({ '--dx': `${e.dx.toFixed(0)}px`, '--rise': `${e.rise.toFixed(0)}px` }),
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Small gold sparkles twinkling across a dark section. `from` keeps them right of
// that point (in %), away from text on the left.
export function DiwaliSparkles({ count = 18, from = 0 }: { count?: number; from?: number }) {
  ensureCss();
  const ref = usePauseOffscreen();
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
    <div ref={ref} aria-hidden style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none' }}>
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

const PETAL_SMALL = 'M0 -118 C9 -132 9 -150 0 -165 C-9 -150 -9 -132 0 -118 Z';
const PETAL_BIG = 'M0 -38 C22 -60 22 -88 0 -110 C-22 -88 -22 -60 0 -38 Z';
const PETAL_INNER = 'M0 -50 C9 -62 9 -78 0 -92 C-9 -78 -9 -62 0 -50 Z';
const LEAF = 'M0 -40 C10 -55 10 -70 0 -84 C-10 -70 -10 -55 0 -40 Z';

function RangoliArt({ size, intro }: { size: number; intro: boolean }) {
  // Drawn from the centre outwards: each layer's outline draws in, then its colour fills.
  const layer = (n: number) => (intro
    ? { animation: `kvd-draw 1.3s ease ${(0.4 + n * 0.35).toFixed(2)}s both, kvd-fillin .9s ease ${(1.1 + n * 0.35).toFixed(2)}s both` }
    : undefined);
  const line = { pathLength: 1, strokeDasharray: '1', stroke: '#fef3c7', strokeWidth: 1.2, strokeOpacity: 0.8 } as const;
  const ring = (count: number, r: number, dot: number, fill: string, n: number) =>
    Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2;
      return <circle key={i} cx={Math.sin(a) * r} cy={-Math.cos(a) * r} r={dot} fill={fill} style={layer(n)} />;
    });
  return (
    <svg className="kvd-rangoli" width={size} height={size} viewBox="0 0 400 400" style={{ filter: 'drop-shadow(0 0 18px rgba(251,191,36,0.25))' }}>
      <g className="kvd-spin">
        <g transform="translate(200 200)">
          {ring(32, 186, 4, '#fde68a', 6)}
          {Array.from({ length: 16 }, (_, i) => (
            <path key={i} d={PETAL_SMALL} transform={`rotate(${i * 22.5})`} fill={i % 2 ? '#facc15' : '#fb923c'} {...line} style={layer(5)} />
          ))}
          <circle r="112" fill="none" {...line} strokeWidth={2} style={layer(4)} />
          {ring(24, 100, 3, '#fef3c7', 3)}
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d={LEAF} transform={`rotate(${i * 45 + 22.5})`} fill="#22c55e" {...line} style={layer(2)} />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <g key={i} transform={`rotate(${i * 45})`}>
              <path d={PETAL_BIG} fill={i % 2 ? '#9333ea' : '#db2777'} {...line} style={layer(1)} />
              <path d={PETAL_INNER} fill="#fde68a" {...line} style={layer(1)} />
            </g>
          ))}
          <circle r="36" fill="#f97316" {...line} style={layer(0)} />
          <circle r="24" fill="#facc15" {...line} style={layer(0)} />
          <circle r="12" fill="#db2777" {...line} style={layer(0)} />
          <circle r="5" fill="#fef3c7" style={layer(0)} />
        </g>
      </g>
    </svg>
  );
}

// Rangoli that draws itself on the first load, then turns very slowly. Beside the
// text on wide screens; a faint watermark behind the headline on tablets. Phones
// skip it: at that size it only muddies the headline.
export function DiwaliRangoli({ wide }: { wide: boolean }) {
  ensureCss();
  const ref = usePauseOffscreen();
  const intro = playIntro();
  if (!wide) {
    return (
      <div ref={ref} aria-hidden style={{ position: 'absolute', top: 40, right: -90, opacity: 0.12, pointerEvents: 'none' }}>
        <RangoliArt size={260} intro={intro} />
      </div>
    );
  }
  return (
    <Stage>
      <div ref={ref} style={{ position: 'absolute', top: 150, right: 10 }}>
        <RangoliArt size={360} intro={intro} />
      </div>
    </Stage>
  );
}

function Kandil({ len, left, delay, scale = 1, id }: { len: number; left: number; delay: number; scale?: number; id: string }) {
  const h = len + 108;
  return (
    <svg className="kvd-swing" width={60 * scale} height={h * scale} viewBox={`0 0 60 ${h}`} style={{ position: 'absolute', top: 0, left, animationDelay: `${delay}s` }}>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f97316" />
          <stop offset="1" stopColor="#b91c1c" />
        </linearGradient>
        <radialGradient id={`${id}g`}>
          <stop offset="0" stopColor="#fde68a" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <line x1="30" y1="0" x2="30" y2={len} stroke="#a16207" strokeWidth="1.2" />
      <g transform={`translate(0 ${len})`}>
        <rect x="24" y="0" width="12" height="5" rx="1" fill="#a16207" />
        <path d="M30 5 L54 30 L46 64 L30 76 L14 64 L6 30 Z" fill={`url(#${id}b)`} />
        <circle className="kvd-halo" cx="30" cy="40" r="20" fill={`url(#${id}g)`} />
        <path d="M30 5 L30 76 M6 30 L54 30 M14 64 L46 64 M30 5 L14 64 M30 5 L46 64" stroke="rgba(255,237,170,0.6)" strokeWidth="1" fill="none" />
        {Array.from({ length: 7 }, (_, k) => (
          <line key={k} x1={18 + k * 4} y1={70} x2={18 + k * 4} y2={96 + (k % 2) * 4} stroke={k % 2 ? '#ef4444' : '#facc15'} strokeWidth="1.6" />
        ))}
        <circle cx="30" cy="100" r="2.5" fill="#facc15" />
      </g>
    </svg>
  );
}

// Paper akash kandils hanging from the lights and swinging gently. The dashboard
// variant is a single one in the hero's right corner.
export function DiwaliKandils({ wide, variant = 'landing' }: { wide: boolean; variant?: 'landing' | 'dashboard' }) {
  ensureCss();
  const base = useUid();
  const ref = usePauseOffscreen();
  if (variant === 'dashboard' && wide) {
    return (
      <div ref={ref} aria-hidden style={{ position: 'absolute', top: 0, right: 18, width: 52, height: 150, pointerEvents: 'none' }}>
        <Kandil id={`${base}a`} len={40} left={0} delay={0.6} scale={0.85} />
      </div>
    );
  }
  if (!wide) {
    return (
      <div ref={ref} aria-hidden style={{ position: 'absolute', top: 0, right: 14, width: 42, height: 130, pointerEvents: 'none' }}>
        <Kandil id={`${base}a`} len={70} left={0} delay={0} scale={0.7} />
      </div>
    );
  }
  return (
    <Stage>
      <div ref={ref} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 180 }}>
        <Kandil id={`${base}a`} len={60} left={660} delay={0} />
        <Kandil id={`${base}b`} len={10} left={1050} delay={1.4} scale={0.85} />
      </div>
    </Stage>
  );
}

// Desktop only: a trail of gold sparks behind the mouse while it's over this layer's
// parent section.
export function DiwaliCursorSparks() {
  ensureCss();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window.matchMedia !== 'function') return;
    if (!window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let last = 0;
    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - last < 35) return;
      last = now;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height || el.childElementCount > 40) return;
      const spark = document.createElement('span');
      spark.className = 'kvd-trail';
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.style.setProperty('--dx', `${(Math.random() * 30 - 15).toFixed(0)}px`);
      spark.style.setProperty('--dy', `${(10 + Math.random() * 25).toFixed(0)}px`);
      el.appendChild(spark);
      setTimeout(() => spark.remove(), 800);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);
  return <div ref={ref} aria-hidden style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', pointerEvents: 'none' }} />;
}

// Gold text with a light sweeping across it. Goes inside a <Text>, which sets the font.
export function DiwaliShimmerText({ text }: { text: string }) {
  ensureCss();
  return <span className="kvd-shimmer">{text}</span>;
}

// Old newspaper, a carton and a phone pop out of a box one after another and turn
// into KarmaCoins: the Diwali clean-up, turned into coins.
function SafaiScene({ scale = 1 }: { scale?: number }) {
  const items = [
    {
      x: -62, r: -14,
      art: (
        <g>
          <rect x="117" y="86" width="26" height="20" rx="1.5" fill="#e5e7eb" />
          <rect x="120" y="89" width="9" height="7" fill="#9ca3af" />
          <path d="M131 90 H140 M131 94 H140 M120 99 H140 M120 102 H136" stroke="#6b7280" strokeWidth="1.2" />
        </g>
      ),
    },
    {
      x: 0, r: 10,
      art: (
        <g>
          <rect x="119" y="85" width="22" height="20" rx="2" fill="#d97706" />
          <path d="M119 85 L130 80 L141 85 Z" fill="#f59e0b" />
          <rect x="128" y="85" width="4" height="20" fill="#fcd34d" opacity="0.6" />
        </g>
      ),
    },
    {
      x: 62, r: 16,
      art: (
        <g>
          <rect x="123" y="82" width="14" height="25" rx="3" fill="#1f2937" />
          <rect x="125" y="85" width="10" height="17" rx="1" fill="#60a5fa" />
          <circle cx="130" cy="104.5" r="1" fill="#9ca3af" />
        </g>
      ),
    },
  ];
  return (
    <svg width={260 * scale} height={170 * scale} viewBox="0 0 260 170" style={{ overflow: 'visible' }}>
      <rect x="96" y="96" width="68" height="8" fill="#78350f" />
      <path d="M92 100 L66 88 L84 78 L104 96 Z" fill="#d97706" />
      <path d="M168 100 L194 88 L176 78 L156 96 Z" fill="#d97706" />
      {items.map((it, i) => {
        const vars = cssVars({ '--x': `${it.x}px`, '--r': `${it.r}deg`, animationDelay: `${i * 2}s` });
        return (
          <g key={i}>
            <g className="kvd-item" style={vars}>{it.art}</g>
            <g className="kvd-coin" style={vars}>
              <circle cx="130" cy="96" r="12" fill="#fbbf24" stroke="#b45309" strokeWidth="2" />
              <circle cx="130" cy="96" r="8" fill="none" stroke="#fde68a" strokeWidth="1" />
              <text x="130" y="100.5" textAnchor="middle" fontSize="12" fontWeight="900" fill="#78350f" fontFamily="system-ui, sans-serif">K</text>
            </g>
          </g>
        );
      })}
      <rect x="92" y="100" width="76" height="58" rx="3" fill="#b45309" />
      <rect x="92" y="100" width="76" height="6" fill="#92400e" />
      <rect x="124" y="100" width="12" height="22" fill="#fcd34d" opacity="0.45" />
    </svg>
  );
}

// "Diwali cleaning" call to action: the clean-up before Diwali is exactly what a
// pickup is for.
export function DiwaliCleanupCard({ onPress, isMobile = false }: { onPress: () => void; isMobile?: boolean }) {
  ensureCss();
  const base = useUid();
  const ref = usePauseOffscreen();
  return (
    <LinearGradient colors={['#450a0a', '#7c2d12', '#b45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.card, isMobile && s.cardMobile]}>
      <DiwaliLights compact />
      {!isMobile && <DiwaliSparkles count={8} from={68} />}
      <View style={[s.row, isMobile && { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
        <View style={isMobile ? undefined : { flex: 1 }}>
          <View style={s.chip}><Text style={s.chipText}>DIWALI SPECIAL</Text></View>
          <Text style={[s.title, isMobile && { fontSize: 22 }]}>Clearing out before Diwali?</Text>
          <Text style={s.body}>
            Old newspapers, cartons, e-waste and clothes from your Diwali cleaning deserve a second life.
            Schedule a pickup and earn KarmaCoins for it.
          </Text>
          <TouchableOpacity style={s.cta} onPress={onPress} activeOpacity={0.85}>
            <div className="kvd-sweep" />
            <Text style={s.ctaText}>Schedule a pickup</Text>
            <ArrowRight size={16} color="#451a03" />
          </TouchableOpacity>
        </View>
        <div ref={ref} aria-hidden style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, paddingTop: isMobile ? 50 : 60 }}>
          <Diya id={`${base}-a`} delay={0.2} scale={isMobile ? 1 : 1.3} />
          <SafaiScene scale={isMobile ? 0.8 : 1} />
          <Diya id={`${base}-b`} delay={0.9} scale={isMobile ? 1 : 1.3} />
        </div>
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
  cta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fbbf24', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, overflow: 'hidden' },
  ctaText: { color: '#451a03', fontSize: 15, fontWeight: '900' },
});

// Rangoli turning slowly behind a coin. Goes inside the coin's wrapper, before the
// coin, so the coin sits at its centre.
export function DiwaliCoinRangoli({ size, opacity = 0.6 }: { size: number; opacity?: number }) {
  ensureCss();
  const ref = usePauseOffscreen();
  const intro = playIntro();
  return (
    <div ref={ref} aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, opacity, pointerEvents: 'none' }}>
      <RangoliArt size={size} intro={intro} />
    </div>
  );
}

// A gold light running round the border of the card it's placed in. `delay`
// staggers neighbouring cards.
export function DiwaliGoldBorder({ delay = 0 }: { delay?: number }) {
  ensureCss();
  return <div aria-hidden className="kvd-border" style={{ animationDelay: `${-delay}s` }} />;
}

// A one-off burst of gold sparks from the centre of its parent.
export function DiwaliBurst() {
  ensureCss();
  return (
    <div aria-hidden className="kvd-burst" style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, pointerEvents: 'none' }}>
      {Array.from({ length: 14 }, (_, i) => (
        <span key={i} style={cssVars({ '--a': `${(i * 360) / 14}deg`, '--d': `${36 + (i % 3) * 10}px`, animationDelay: `${(i % 2) * 0.06}s` })} />
      ))}
    </div>
  );
}

// Counts the balance up from 0 the first time it loads in this tab, then reports a
// burst. Returns the number to show and whether the burst is playing.
export function useDiwaliCountUp(value: number, enabled: boolean): [number, boolean] {
  const [shown, setShown] = useState<number | null>(null);
  const [burst, setBurst] = useState(false);
  const done = useRef(false);
  useEffect(() => {
    if (!enabled || done.current || value <= 0) return;
    done.current = true;
    let seen = true;
    try {
      seen = !!sessionStorage.getItem('kvDiwaliCount');
      sessionStorage.setItem('kvDiwaliCount', '1');
    } catch { /* storage blocked: skip the effect */ }
    if (seen || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 1400);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) { raf = requestAnimationFrame(step); return; }
      setShown(null);
      setBurst(true);
      setTimeout(() => setBurst(false), 1100);
    };
    setShown(0);
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); setShown(null); };
  }, [value, enabled]);
  return [shown ?? value, burst];
}

const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short' })} ${d}`;
};

// Deepotsav: one diya for each day of the Diwali theme. A day's diya lights when the
// user played the daily quiz or booked a pickup that day. Diyas lit since the last
// visit light up with the ignite animation.
export function DiwaliDiyaTracker({ litDays, seenKey, onQuiz, onPickup, isMobile = false }: {
  litDays: string[]; seenKey: string; onQuiz: () => void; onPickup: () => void; isMobile?: boolean;
}) {
  ensureCss();
  const base = useUid();
  const ref = usePauseOffscreen();
  const today = getLocalDateStr();
  const lit = useMemo(() => new Set(litDays.filter((d) => DIWALI_DAYS.includes(d))), [litDays]);
  const seen = useMemo(() => {
    try { return new Set<string>(JSON.parse(localStorage.getItem(seenKey) || '[]')); } catch { return new Set<string>(); }
  }, [seenKey]);
  useEffect(() => {
    if (seenKey.endsWith('_')) return; // user not known yet
    try { localStorage.setItem(seenKey, JSON.stringify([...lit])); } catch { /* storage blocked */ }
  }, [lit, seenKey]);

  const count = lit.size;
  const complete = count === DIWALI_DAYS.length;
  const todayIsDiwaliDay = DIWALI_DAYS.includes(today);
  const scale = isMobile ? 0.92 : 1.35;

  return (
    <LinearGradient colors={['#0f0a2e', '#1e1b4b', '#3b0764']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[t.card, isMobile && t.cardMobile]}>
      <DiwaliSparkles count={isMobile ? 8 : 14} />
      <View style={[t.head, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
        <View style={isMobile ? undefined : { flex: 1 }}>
          <View style={s.chip}><Text style={s.chipText}>DEEPOTSAV</Text></View>
          <Text style={[t.title, isMobile && { fontSize: 20 }]}>Light a diya every day of Diwali</Text>
          <Text style={t.sub}>Play the daily quiz or book a pickup, and that day's diya lights up.</Text>
        </View>
        <View style={[t.pill, complete && t.pillDone]}>
          <Text style={[t.pillText, complete && { color: '#451a03' }]}>{complete ? 'Deepotsav complete' : `${count} of ${DIWALI_DAYS.length} lit`}</Text>
        </View>
      </View>

      <div ref={ref} style={{ display: 'flex', justifyContent: 'space-between', marginTop: isMobile ? 14 : 22, position: 'relative' }}>
        {complete && <DiwaliBurst />}
        {DIWALI_DAYS.map((day, i) => {
          const isLit = lit.has(day);
          const isToday = day === today;
          const faded = !isLit && !isToday;
          return (
            <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={faded ? { opacity: day < today ? 0.35 : 0.5, filter: day < today ? 'grayscale(1)' : undefined } : undefined}>
                <Diya
                  id={`${base}-${i}`}
                  delay={(i * 0.31) % 1.6}
                  scale={scale}
                  lit={isLit}
                  waiting={isToday && !isLit}
                  ignite={isLit && !seen.has(day)}
                  igniteDelay={0.5 + i * 0.25}
                />
              </div>
              <Text style={[t.day, (isToday || day === '2026-11-08') && { color: '#fcd34d' }]}>
                {isToday ? 'Today' : day === '2026-11-08' ? 'Diwali' : dayLabel(day)}
              </Text>
            </div>
          );
        })}
      </div>

      <View style={[t.foot, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        {complete ? (
          <Text style={t.footText}>Every diya is lit. Thank you for a green Diwali!</Text>
        ) : !todayIsDiwaliDay || lit.has(today) ? (
          <Text style={t.footText}>Today's diya is lit. Come back tomorrow to light the next one.</Text>
        ) : (
          <>
            <TouchableOpacity style={s.cta} onPress={onQuiz} activeOpacity={0.85}>
              <div className="kvd-sweep" />
              <Text style={s.ctaText}>Play today's quiz</Text>
              <ArrowRight size={16} color="#451a03" />
            </TouchableOpacity>
            <TouchableOpacity style={t.ctaAlt} onPress={onPickup} activeOpacity={0.85}>
              <Text style={t.ctaAltText}>Schedule a pickup</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

// Once-per-user Diwali greeting: an envelope opens and the card rises out of it.
export function DiwaliGreetingModal({ visible, name, pickups, onClose }: { visible: boolean; name: string; pickups: number; onClose: () => void }) {
  ensureCss();
  const base = useUid();
  const [copied, setCopied] = useState(false);
  const message = pickups > 0
    ? `Thank you for ${pickups} eco ${pickups === 1 ? 'action' : 'actions'} with KarmaVer$e. May this Diwali be bright, clean and green.`
    : 'This Diwali, give your clean-up a second life with KarmaVer$e. Wishing you a bright, clean and green festival.';

  const share = async () => {
    const text = 'Happy Diwali from KarmaVer$e! Celebrate a green Diwali with me.';
    const url = 'https://karmaverse.earth';
    try {
      if (navigator.share) { await navigator.share({ title: 'Happy Diwali', text, url }); return; }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
    } catch { /* share sheet dismissed */ }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={t.overlay}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
          <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: '50%', display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <svg className="kvd-env" width="220" height="150" viewBox="0 0 220 150" style={{ marginTop: -75, overflow: 'visible' }}>
              <rect x="0" y="0" width="220" height="150" rx="8" fill="#92400e" />
              <rect x="20" y="14" width="180" height="110" rx="4" fill="#fef3c7" />
              <path d="M0 150 L110 70 L220 150 Z" fill="#b45309" />
              <path d="M0 0 L0 150 L100 78 Z M220 0 L220 150 L120 78 Z" fill="#a16207" />
              <path className="kvd-flap" d="M0 0 L110 82 L220 0 Z" fill="#d97706" />
              <circle cx="110" cy="80" r="14" fill="#dc2626" />
              <text x="110" y="85" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fde68a" fontFamily="system-ui, sans-serif">K</text>
            </svg>
          </div>
          <div className="kvd-letter">
            <LinearGradient colors={['#450a0a', '#7c2d12', '#b45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={t.letter}>
              <DiwaliLights compact />
              <DiwaliSparkles count={10} />
              <TouchableOpacity onPress={onClose} style={t.close} accessibilityLabel="Close">
                <X size={18} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
              <div aria-hidden style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <Diya id={`${base}-g`} delay={0.3} scale={1.6} ignite igniteDelay={1.5} />
              </div>
              <Text style={t.greet}><DiwaliShimmerText text={`Happy Diwali${name ? `, ${name}` : ''}!`} /></Text>
              <Text style={t.greetSub}>{message}</Text>
              <View style={t.greetRow}>
                <TouchableOpacity style={s.cta} onPress={share} activeOpacity={0.85}>
                  <div className="kvd-sweep" />
                  <Share2 size={16} color="#451a03" />
                  <Text style={s.ctaText}>{copied ? 'Link copied' : 'Share greeting'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={t.ctaAlt} onPress={onClose} activeOpacity={0.85}>
                  <Text style={t.ctaAltText}>Close</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </div>
        </div>
      </View>
    </Modal>
  );
}

const t = StyleSheet.create({
  card: { borderRadius: 20, overflow: 'hidden', padding: 28 },
  cardMobile: { padding: 20 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  title: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginBottom: 6 },
  sub: { color: 'rgba(255,255,255,0.75)', fontSize: 14.5, lineHeight: 21 },
  pill: { backgroundColor: 'rgba(251,191,36,0.15)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.45)', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7 },
  pillDone: { backgroundColor: '#fbbf24', borderColor: '#fbbf24' },
  pillText: { color: '#fcd34d', fontSize: 13, fontWeight: '900' },
  day: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  footText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  ctaAlt: { alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11 },
  ctaAltText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  letter: { borderRadius: 22, overflow: 'hidden', paddingHorizontal: 24, paddingTop: 44, paddingBottom: 24, alignItems: 'center' },
  close: { position: 'absolute', top: 30, right: 14, padding: 6 },
  greet: { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  greetSub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 20 },
  greetRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
});

const TORAN_SEG = 80;

// A toran across the top: a string of mango leaves with marigolds between them,
// the leaves swaying a little.
function DiwaliToran() {
  return (
    <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 48, overflow: 'hidden', pointerEvents: 'none', display: 'flex' }}>
      {Array.from({ length: 24 }, (_, seg) => (
        <svg key={seg} width={TORAN_SEG} height={48} viewBox={`0 0 ${TORAN_SEG} 48`} style={{ flexShrink: 0, overflow: 'visible' }}>
          <path d="M0 4 Q40 12 80 4" fill="none" stroke="#a16207" strokeWidth="1.4" />
          {[18, 62].map((x, k) => (
            <g key={x} className="kvd-strand" style={{ transformBox: 'fill-box', transformOrigin: '50% 0', animationDelay: `${((seg * 2 + k) * 0.37) % 4}s` } as React.CSSProperties}>
              <path d={`M${x} 7 C${x + 7} 16 ${x + 7} 30 ${x} 40 C${x - 7} 30 ${x - 7} 16 ${x} 7 Z`} fill={k ? '#16a34a' : '#15803d'} />
              <path d={`M${x} 9 L${x} 37`} stroke="#86efac" strokeWidth="0.8" opacity="0.7" />
            </g>
          ))}
          <line x1="40" y1="8" x2="40" y2="14" stroke="#a16207" strokeWidth="1" />
          <circle cx="40" cy="20" r="6.5" fill={seg % 2 ? '#facc15' : '#f97316'} />
          <circle cx="40" cy="20" r="6.5" fill="none" stroke={seg % 2 ? '#eab308' : '#ea580c'} strokeWidth="2" strokeDasharray="2 1.6" />
          <circle cx="40" cy="20" r="1.8" fill={seg % 2 ? '#ca8a04' : '#c2410c'} />
          <circle cx="0" cy="5" r="2.5" fill="#fbbf24" />
        </svg>
      ))}
    </div>
  );
}

// Decoration for a page's green header: a large rangoli turning half out of the
// corner(s) and a few sparkles; on phones (no navbar lights above) a toran too.
// The header needs overflow hidden.
export function DiwaliHeaderDecor({ wide }: { wide: boolean }) {
  ensureCss();
  const ref = usePauseOffscreen();
  const intro = playIntro();
  return (
    <div ref={ref} aria-hidden style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: wide ? -90 : -70, right: wide ? -70 : -110, opacity: 0.32 }}>
        <RangoliArt size={wide ? 280 : 240} intro={intro} />
      </div>
      {wide && (
        <div style={{ position: 'absolute', bottom: -140, left: -90, opacity: 0.22 }}>
          <RangoliArt size={260} intro={false} />
        </div>
      )}
      <DiwaliSparkles count={wide ? 10 : 6} from={wide ? 60 : 50} />
      {!wide && <DiwaliToran />}
    </div>
  );
}

// A slim festive bar under a page header, leading to a pickup.
export function DiwaliStrip({ onPress }: { onPress: () => void }) {
  ensureCss();
  const base = useUid();
  return (
    <LinearGradient colors={['#450a0a', '#7c2d12', '#b45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={u.strip}>
      <DiwaliSparkles count={5} from={40} />
      <div aria-hidden style={{ flexShrink: 0 }}>
        <Diya id={`${base}-s`} delay={0.4} scale={0.9} />
      </div>
      <View style={{ flex: 1 }}>
        <Text style={u.stripTitle}>Diwali clean-up?</Text>
        <Text style={u.stripSub}>Give the clutter a second life and earn KarmaCoins.</Text>
      </View>
      <TouchableOpacity style={[s.cta, u.stripCta]} onPress={onPress} activeOpacity={0.85}>
        <div className="kvd-sweep" />
        <Text style={[s.ctaText, { fontSize: 14 }]}>Schedule</Text>
        <ArrowRight size={15} color="#451a03" />
      </TouchableOpacity>
    </LinearGradient>
  );
}

// True only the first time `key` is asked for in this browser tab.
export function useDiwaliOncePerTab(key: string): boolean {
  return useMemo(() => {
    try {
      if (sessionStorage.getItem(key)) return false;
      sessionStorage.setItem(key, '1');
      return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }, [key]);
}

const u = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 12 },
  stripTitle: { color: '#fde68a', fontSize: 15, fontWeight: '900' },
  stripSub: { color: 'rgba(255,255,255,0.82)', fontSize: 12.5, marginTop: 2 },
  stripCta: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 9 },
});
