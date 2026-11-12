import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Circle, Path, Ellipse, G, Rect } from 'react-native-svg';

// Illustrated "people" avatars (real image assets) — young/old, different genders.
// Ids are 'p1'..'p5'; rendered as a circular <Image>. These sit alongside the SVG
// eco-creatures below so the picker can offer both.
const PERSON_IMAGES: Record<string, any> = {
  p1: require('../../../assets/avatars/woman.png'),
  p2: require('../../../assets/avatars/man.png'),
  p3: require('../../../assets/avatars/senior-man.png'),
  p4: require('../../../assets/avatars/senior-woman.png'),
  p5: require('../../../assets/avatars/youth.png'),
};
export const PERSON_AVATAR_IDS = ['p1', 'p2', 'p3', 'p4', 'p5'] as const;

// 10 preset illustrated "eco creature" avatars. Each is a rounded character with a
// distinct colour + a small nature motif on top + a friendly face. Rendered from
// react-native-svg (no image assets), so they scale crisply at any size.
//
// Storage: the chosen avatar is an id string ('a1'..'a10'). Persist it on the
// profile (`avatarId`) and mirror in AsyncStorage; when none is set we fall back
// to the user's initials.

export const AVATAR_IDS = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10'] as const;
export type AvatarId = typeof AVATAR_IDS[number];

const GRADS: Record<AvatarId, [string, string]> = {
  a1: ['#34d399', '#059669'], // sprout — green
  a2: ['#60a5fa', '#2563eb'], // water drop — blue
  a3: ['#fbbf24', '#f59e0b'], // sun — amber
  a4: ['#2dd4bf', '#0d9488'], // recycle — teal
  a5: ['#f472b6', '#db2777'], // flower — pink
  a6: ['#a78bfa', '#7c3aed'], // sparkle — purple
  a7: ['#fb923c', '#ea580c'], // leaf — orange
  a8: ['#38bdf8', '#0284c7'], // cloud — sky
  a9: ['#4ade80', '#16a34a'], // tree — leaf green
  a10: ['#f87171', '#dc2626'], // heart — rose
};

const EYE = '#20303b';
// Shared friendly face — big glossy eyes with catchlights, rosy cheeks and a
// warm smile. The gloss + blush is what lifts these from "flat sticker" to cute.
function Face() {
  return (
    <G>
      {/* rosy cheeks (behind the eyes so highlights read on top) */}
      <Ellipse cx="31" cy="63" rx="5" ry="3.4" fill="#ff8fa3" opacity={0.5} />
      <Ellipse cx="69" cy="63" rx="5" ry="3.4" fill="#ff8fa3" opacity={0.5} />
      {/* eyes */}
      <Ellipse cx="39" cy="55" rx="5" ry="6" fill={EYE} />
      <Ellipse cx="61" cy="55" rx="5" ry="6" fill={EYE} />
      <Circle cx="41" cy="52.5" r="1.9" fill="#ffffff" />
      <Circle cx="63" cy="52.5" r="1.9" fill="#ffffff" />
      <Circle cx="37.5" cy="57.5" r="0.9" fill="#ffffff" opacity={0.7} />
      <Circle cx="59.5" cy="57.5" r="0.9" fill="#ffffff" opacity={0.7} />
      {/* smile */}
      <Path d="M42 65 Q50 73 58 65" stroke={EYE} strokeWidth={3} fill="none" strokeLinecap="round" />
    </G>
  );
}

// Per-avatar top motif (drawn above the face, y ≈ 6–34).
function Motif({ id }: { id: AvatarId }) {
  switch (id) {
    case 'a1': // sprout — two leaves
      return (
        <G>
          <Path d="M50 34 C50 20 40 14 34 16 C36 26 44 32 50 34 Z" fill="#ffffff" opacity={0.9} />
          <Path d="M50 34 C50 20 60 14 66 16 C64 26 56 32 50 34 Z" fill="#ffffff" opacity={0.7} />
          <Rect x="48.5" y="30" width="3" height="8" rx="1.5" fill="#ffffff" opacity={0.9} />
        </G>
      );
    case 'a2': // water drop
      return <Path d="M50 8 C58 20 64 26 64 32 A14 14 0 1 1 36 32 C36 26 42 20 50 8 Z" fill="#ffffff" opacity={0.85} />;
    case 'a3': // sun burst
      return (
        <G stroke="#ffffff" strokeWidth={3} strokeLinecap="round" opacity={0.9}>
          <Circle cx="50" cy="24" r="9" fill="#ffffff" stroke="none" opacity={0.9} />
          <Path d="M50 6 V12 M50 36 V42 M32 24 H38 M62 24 H68 M37 11 L41 15 M63 11 L59 15 M37 37 L41 33 M63 37 L59 33" />
        </G>
      );
    case 'a4': // recycle swirl
      return (
        <G fill="none" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" opacity={0.9}>
          <Path d="M50 14 A12 12 0 0 1 61 30" />
          <Path d="M61 30 l -1 -6 m 1 6 l 6 -1" />
          <Path d="M50 14 A12 12 0 0 0 39 30" />
          <Path d="M39 30 l 1 -6 m -1 6 l -6 -1" />
        </G>
      );
    case 'a5': // flower
      return (
        <G fill="#ffffff" opacity={0.9}>
          <Circle cx="50" cy="14" r="5" />
          <Circle cx="40" cy="21" r="5" />
          <Circle cx="60" cy="21" r="5" />
          <Circle cx="44" cy="31" r="5" />
          <Circle cx="56" cy="31" r="5" />
          <Circle cx="50" cy="23" r="4.5" fill="#fde047" opacity={1} />
        </G>
      );
    case 'a6': // sparkle
      return <Path d="M50 8 L54 22 L68 26 L54 30 L50 44 L46 30 L32 26 L46 22 Z" fill="#ffffff" opacity={0.92} />;
    case 'a7': // single leaf
      return (
        <G>
          <Path d="M50 36 C34 34 30 18 34 10 C52 12 58 26 50 36 Z" fill="#ffffff" opacity={0.9} />
          <Path d="M42 30 L48 20" stroke="#ea580c" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
        </G>
      );
    case 'a8': // cloud
      return (
        <G fill="#ffffff" opacity={0.92}>
          <Circle cx="40" cy="26" r="9" />
          <Circle cx="54" cy="22" r="11" />
          <Circle cx="64" cy="28" r="8" />
          <Rect x="38" y="26" width="28" height="10" rx="5" />
        </G>
      );
    case 'a9': // tree top
      return (
        <G opacity={0.92}>
          <Circle cx="50" cy="20" r="10" fill="#ffffff" />
          <Circle cx="40" cy="26" r="8" fill="#ffffff" />
          <Circle cx="60" cy="26" r="8" fill="#ffffff" />
          <Rect x="47.5" y="30" width="5" height="8" rx="1.5" fill="#065f46" opacity={0.5} />
        </G>
      );
    case 'a10': // heart
      return <Path d="M50 38 C40 30 32 24 32 17 A8 8 0 0 1 50 14 A8 8 0 0 1 68 17 C68 24 60 30 50 38 Z" fill="#ffffff" opacity={0.9} />;
    default:
      return null;
  }
}

export function Avatar({ avatarId, size = 48, name, ring }: {
  avatarId?: string | null;
  size?: number;
  name?: string;
  ring?: boolean; // subtle white ring (for coloured headers)
}) {
  // The ring is a border, which takes its width from inside the box; shrink the
  // artwork by the same amount or it starts at the border and gets cropped off-centre.
  const inner = ring ? size - RING_WIDTH * 2 : size;

  // Illustrated people avatars (image assets) — rendered as a circular photo.
  if (avatarId && PERSON_IMAGES[avatarId]) {
    return (
      <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }, ring && styles.ring]}>
        <Image source={PERSON_IMAGES[avatarId]} style={{ width: inner, height: inner, borderRadius: inner / 2 }} resizeMode="cover" />
      </View>
    );
  }

  const id = (avatarId && (AVATAR_IDS as readonly string[]).includes(avatarId)) ? (avatarId as AvatarId) : null;

  if (!id) {
    // Initials fallback — first + last name initial.
    const parts = (name || '').trim().split(/\s+/);
    const initials = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U';
    return (
      <View style={[styles.initialsWrap, { width: size, height: size, borderRadius: size / 2 }, ring && styles.ring]}>
        <Text style={[styles.initialsText, { fontSize: size * 0.36 }]}>{initials}</Text>
      </View>
    );
  }

  const [c1, c2] = GRADS[id];
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }, ring && styles.ring]}>
      <Svg width={inner} height={inner} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c1} />
            <Stop offset="1" stopColor={c2} />
          </LinearGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#g-${id})`} />
        {/* soft top sheen + bottom shading for depth */}
        <Ellipse cx="36" cy="32" rx="28" ry="18" fill="#ffffff" opacity={0.16} />
        <Ellipse cx="50" cy="92" rx="44" ry="16" fill="#000000" opacity={0.07} />
        <Motif id={id} />
        <Face />
      </Svg>
    </View>
  );
}

const RING_WIDTH = 3;

const styles = StyleSheet.create({
  initialsWrap: { backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  initialsText: { color: 'white', fontWeight: '800' },
  ring: { borderWidth: RING_WIDTH, borderColor: 'rgba(255,255,255,0.9)' },
});
