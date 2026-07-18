import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, Easing, Image, Linking } from 'react-native';
import { X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { MASCOT_CHIRP_DATA_URI } from '../../utils/mascotChirp';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

const KARMAVERSE_URL = 'https://karmaverse.earth/';
const STORAGE_KEY = 'karmaverse_planetBuddyShownToday';
const MAX_SHOWS_PER_DAY = 3;
const MIN_GAP_BETWEEN_SHOWS_MS = 90 * 1000; // don't re-pop immediately on rapid navigation within the same visit
const SHOW_DELAY_MS = 1800;
const CHAR_SIZE = 108;
const todayKey = () => new Date().toISOString().slice(0, 10);

const MESSAGES = [
  "Hi! I'm Planet Buddy 🌍",
  "Let's clean up together!",
  'Every kg you recycle keeps me smiling.',
  'Ready to earn KarmaCoins XP?',
];

export function PlanetBuddyWidget() {
  const [open, setOpen] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  const bounce = useRef(new Animated.Value(0)).current;
  const wiggle = useRef(new Animated.Value(0)).current;
  const eyelidY = useRef(new Animated.Value(0)).current; // 0 = flattened to nothing, 1 = full height (blink closed)
  const mouthClose = useRef(new Animated.Value(0)).current; // 0 = mouth fully open (no cover), 1 = mouth fully closed (full cover), scales down from the top edge like the eyelids
  const bubbleScale = useRef(new Animated.Value(0.85)).current;
  const bubbleOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const hintPulse = useRef(new Animated.Value(1)).current;

  const chirpPlayer = useAudioPlayer(MASCOT_CHIRP_DATA_URI);
  const playChirp = () => {
    chirpPlayer.seekTo(0);
    chirpPlayer.play();
  };

  // Automatic appearance — up to 3 times per day, spaced out across visits.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      const state = raw ? JSON.parse(raw) : { day: '', count: 0, lastShownAt: 0 };
      const isNewDay = state.day !== todayKey();
      const count = isNewDay ? 0 : state.count;
      const lastShownAt = isNewDay ? 0 : state.lastShownAt;

      if (count >= MAX_SHOWS_PER_DAY) return;
      if (Date.now() - lastShownAt < MIN_GAP_BETWEEN_SHOWS_MS) return;

      timer = setTimeout(() => {
        setOpen(true);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ day: todayKey(), count: count + 1, lastShownAt: Date.now() }));
      }, SHOW_DELAY_MS);
    });
    return () => clearTimeout(timer);
  }, []);

  // Idle bob + gentle wiggle — the "alive" movement, same technique the original mascot popup used.
  useEffect(() => {
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -8, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const wiggleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(wiggle, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: -1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    bounceLoop.start();
    wiggleLoop.start();
    return () => { bounceLoop.stop(); wiggleLoop.stop(); };
  }, []);

  // "Click me!" hint pulses gently while the bubble is closed, to invite the first click.
  useEffect(() => {
    if (open) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hintPulse, { toValue: 1.08, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(hintPulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [open]);

  // Blink — a natural single blink, occasionally a soft double-blink, spaced out randomly.
  useEffect(() => {
    let cancelled = false;
    const closeEye = () =>
      Animated.timing(eyelidY, { toValue: 1, duration: 80, easing: Easing.bezier(0.4, 0, 1, 1), useNativeDriver: false });
    const openEye = () =>
      Animated.timing(eyelidY, { toValue: 0, duration: 170, easing: Easing.out(Easing.back(1.3)), useNativeDriver: false });
    const blink = () => {
      if (cancelled) return;
      const isDouble = Math.random() < 0.25;
      const sequence = isDouble
        ? [closeEye(), Animated.delay(60), openEye(), Animated.delay(130), closeEye(), Animated.delay(60), openEye()]
        : [closeEye(), Animated.delay(60), openEye()];
      Animated.sequence(sequence).start(() => setTimeout(blink, 2000 + Math.random() * 2200));
    };
    const t = setTimeout(blink, 700);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  // Mouth talk-flicker — only while the speech bubble is open. Scales the same cover shape used for the
  // eyelids down from the top edge (rather than an instant opacity toggle), so it reads as lips closing
  // rather than a patch flashing on and off. Irregular timing so it feels like talking, not a metronome.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const closeMouth = () =>
      Animated.timing(mouthClose, { toValue: 1, duration: 90 + Math.random() * 40, easing: Easing.out(Easing.quad), useNativeDriver: false });
    const openMouth = () =>
      Animated.timing(mouthClose, { toValue: 0, duration: 110 + Math.random() * 60, easing: Easing.in(Easing.quad), useNativeDriver: false });
    const flap = () => {
      if (cancelled) return;
      Animated.sequence([closeMouth(), Animated.delay(30 + Math.random() * 60), openMouth()]).start(() => {
        if (!cancelled) setTimeout(flap, 60 + Math.random() * 170);
      });
    };
    flap();
    return () => { cancelled = true; };
  }, [open, messageIndex]);

  // Bubble open/close + message cycling.
  useEffect(() => {
    if (!open) return;
    Animated.parallel([
      Animated.spring(bubbleScale, { toValue: 1, friction: 7, useNativeDriver: true }),
      Animated.timing(bubbleOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const cycle = setInterval(() => {
      Animated.timing(textOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setMessageIndex((i) => (i + 1) % MESSAGES.length);
        Animated.timing(textOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      });
    }, 3200);

    return () => clearInterval(cycle);
  }, [open]);

  const closeBubble = () => {
    setOpen(false);
    Animated.parallel([
      Animated.timing(bubbleScale, { toValue: 0.85, duration: 150, useNativeDriver: true }),
      Animated.timing(bubbleOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const rotate = wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '4deg'] });
  const eyelidScale = eyelidY.interpolate({ inputRange: [0, 1], outputRange: [0.03, 1] });
  const mouthScale = mouthClose.interpolate({ inputRange: [0, 1], outputRange: [0.05, 1] });

  const handleMascotPress = () => {
    setOpen((o) => !o);
    playChirp();
    Linking.openURL(KARMAVERSE_URL);
  };

  return (
    <View style={s.wrap} pointerEvents="box-none">
      {open && (
        <Animated.View style={[s.bubble, { opacity: bubbleOpacity, transform: [{ scale: bubbleScale }] }]}>
          <TouchableOpacity style={s.closeBtn} onPress={closeBubble} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={14} color="#ffffff" />
          </TouchableOpacity>
          <Animated.Text style={[s.bubbleText, { opacity: textOpacity }]}>{MESSAGES[messageIndex]}</Animated.Text>
          <TouchableOpacity onPress={() => Linking.openURL(KARMAVERSE_URL)}>
            <Text style={s.parentLink}>Planet Buddy ↗</Text>
          </TouchableOpacity>
          <View style={s.bubbleTail} />
        </Animated.View>
      )}

      <View style={s.charRow}>
        {!open && (
          <Animated.View style={[s.hintBadge, { transform: [{ scale: hintPulse }] }]}>
            <Text style={s.hintBadgeText}>Click me!</Text>
            <View style={s.hintBadgeTail} />
          </Animated.View>
        )}

        <TouchableOpacity activeOpacity={0.85} onPress={handleMascotPress}>
          <Animated.View style={{ width: CHAR_SIZE, height: CHAR_SIZE, transform: [{ translateY: bounce }, { rotate }] }}>
            <Image
              source={require('../../../assets/mascot-earth-buddy-transparent.png')}
              resizeMode="contain"
              style={{ width: CHAR_SIZE, height: CHAR_SIZE }}
            />

            {/* eyelids — sit exactly over each eye and scale down to nothing when open, so there's no floating blob at rest; positions found by pixel-scanning the actual PNG's eye-white regions (the art is a full-body character, so the face is a small region near the top). Each uses a top-to-bottom gradient sampled from the real skin tone bordering that eye, since a flat color reads as a sticker against the shaded 3D render. */}
            <AnimatedGradient
              colors={['#19A3C9', '#7DCFEE']}
              style={[s.eyelid, { left: 37, top: 28, width: 11, height: 13, transform: [{ scaleY: eyelidScale }] }]}
            />
            <AnimatedGradient
              colors={['#52D1E9', '#8EDFF4']}
              style={[s.eyelid, { left: 56, top: 26, width: 12, height: 13, transform: [{ scaleY: eyelidScale }] }]}
            />

            {/* mouth cover — same technique as the eyelids: scales down from the top edge rather than fading in/out, so it reads as lips closing over the open mouth instead of a patch flickering on and off */}
            <AnimatedGradient
              colors={['#1A4F5D', '#2DB6DA', '#196A7F']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[s.mouthCover, { transform: [{ scaleY: mouthScale }] }]}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    bottom: 22,
    right: 22,
    alignItems: 'flex-end',
    zIndex: 999,
  },
  bubble: {
    width: 220,
    backgroundColor: 'rgba(5,46,22,0.82)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 14,
    marginBottom: 10,
    position: 'relative',
    ...Platform.select({
      web: { boxShadow: '0 10px 30px rgba(0,0,0,0.28)', backdropFilter: 'blur(8px)' } as any,
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
    }),
  },
  closeBtn: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  bubbleText: { fontSize: 13.5, fontWeight: '700', color: '#ffffff', lineHeight: 19, marginRight: 18, marginBottom: 10 },
  parentLink: { fontSize: 11, color: '#86efac', fontWeight: '700', textAlign: 'center', marginTop: 4 },
  bubbleTail: {
    position: 'absolute', bottom: -7, right: 30, width: 0, height: 0,
    borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'rgba(5,46,22,0.82)',
  },
  eyelid: { position: 'absolute', borderRadius: 10, overflow: 'hidden', zIndex: 5, transformOrigin: 'top' } as any,
  mouthCover: { position: 'absolute', left: 47, top: 42, width: 13, height: 9, borderRadius: 5, overflow: 'hidden', zIndex: 5, transformOrigin: 'top' } as any,

  charRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hintBadge: {
    backgroundColor: '#052e16',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: 'relative',
    ...Platform.select({
      web: { boxShadow: '0 6px 16px rgba(0,0,0,0.25)' } as any,
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
    }),
  },
  hintBadgeText: { color: '#ffffff', fontSize: 12.5, fontWeight: '800' },
  hintBadgeTail: {
    position: 'absolute', top: '50%', right: -6, marginTop: -6, width: 0, height: 0,
    borderTopWidth: 6, borderBottomWidth: 6, borderLeftWidth: 7,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#052e16',
  },
});
