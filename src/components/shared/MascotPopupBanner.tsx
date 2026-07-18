import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Platform, Image, Linking, Easing } from 'react-native';
import { X, ArrowRight, Sparkles } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'karmaverse_mascotPopupSeenAt';
const REAPPEAR_AFTER_MS = 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 2200;

const MESSAGES = [
  "Hi! I'm Earth Buddy 👋",
  "Let's recycle together!",
  'Every kg you recycle helps me breathe easier.',
  'Ready to earn KarmaCoins XP?',
];

interface Props {
  onGetStarted: () => void;
}

export function MascotPopupBanner({ onGetStarted }: Props) {
  const [visible, setVisible] = useState(false);
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const wiggle = useRef(new Animated.Value(0)).current;
  const bubbleOpacity = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(0.7)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const typingPulse = useRef(new Animated.Value(0.3)).current;
  const [typing, setTyping] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    AsyncStorage.getItem(STORAGE_KEY).then((seenAt) => {
      const last = seenAt ? Number(seenAt) : 0;
      if (Date.now() - last < REAPPEAR_AFTER_MS) return;
      timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    });
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    // Idle bob + wiggle loop, like Earth Buddy is waving hello.
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -10, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
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

    // Speech bubble pops in a beat after the mascot, shows a "typing…" moment,
    // then starts talking — cycling through a few friendly lines.
    const bubbleTimer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(bubbleScale, { toValue: 1, friction: 6, useNativeDriver: true }),
        Animated.timing(bubbleOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }, 500);

    const typingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(typingPulse, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(typingPulse, { toValue: 0.3, duration: 350, useNativeDriver: true }),
      ])
    );
    typingLoop.start();

    const typingTimer = setTimeout(() => {
      typingLoop.stop();
      setTyping(false);
    }, 1400);

    const cycleInterval = setInterval(() => {
      Animated.timing(textOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setMessageIndex((i) => (i + 1) % MESSAGES.length);
        Animated.timing(textOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    }, 3400);

    return () => {
      bounceLoop.stop();
      wiggleLoop.stop();
      typingLoop.stop();
      clearTimeout(bubbleTimer);
      clearTimeout(typingTimer);
      clearInterval(cycleInterval);
    };
  }, [visible]);

  const rotate = wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-6deg', '6deg'] });

  const dismiss = () => {
    setVisible(false);
    AsyncStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  const handleGetStarted = () => {
    dismiss();
    onGetStarted();
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={dismiss}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={dismiss}>
        <Animated.View style={[s.card, { opacity, transform: [{ scale }] }]} onStartShouldSetResponder={() => true}>
          <TouchableOpacity style={s.closeBtn} onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={18} color="#64748b" />
          </TouchableOpacity>

          <View style={s.mascotWrap}>
            <View style={s.mascotCircle}>
              <Animated.View style={{ transform: [{ translateY: bounce }, { rotate }] }}>
                <Image source={require('../../../assets/mascot-earth-buddy.png')} style={s.mascotImg} resizeMode="contain" />
              </Animated.View>
            </View>

            <Animated.View style={[s.speechBubble, { opacity: bubbleOpacity, transform: [{ scale: bubbleScale }] }]}>
              {typing ? (
                <View style={s.typingRow}>
                  <Animated.View style={[s.typingDot, { opacity: typingPulse }]} />
                  <Animated.View style={[s.typingDot, { opacity: typingPulse, marginHorizontal: 3 }]} />
                  <Animated.View style={[s.typingDot, { opacity: typingPulse }]} />
                </View>
              ) : (
                <Animated.Text style={[s.speechText, { opacity: textOpacity }]}>{MESSAGES[messageIndex]}</Animated.Text>
              )}
              <View style={s.speechTail} />
            </Animated.View>
          </View>

          <View style={s.sparkleRow}>
            <Sparkles size={14} color="#16a34a" />
            <Text style={s.eyebrow}>MEET EARTH BUDDY</Text>
          </View>

          <Text style={s.title}>Turn your waste into KarmaCoins XP!</Text>
          <Text style={s.body}>
            KarmaVerse is India's first circular economy rewards app — free doorstep pickups for
            recyclables, daily eco-quizzes, and real rewards for every kg you recycle. Earth Buddy
            gets a little happier every time you do.
          </Text>

          <TouchableOpacity style={s.cta} onPress={handleGetStarted} activeOpacity={0.85}>
            <Text style={s.ctaText}>Get started free</Text>
            <ArrowRight size={16} color="#052e16" />
          </TouchableOpacity>

          <TouchableOpacity onPress={dismiss}>
            <Text style={s.later}>Maybe later</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => Linking.openURL('https://0waste.co.in/')}>
            <Text style={s.parentLink}>A 3R Zero Waste initiative · 0waste.co.in ↗</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,46,22,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 20px 60px rgba(0,0,0,0.25)' } as any,
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 30, elevation: 10 },
    }),
  },
  closeBtn: { position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  mascotWrap: { alignItems: 'center', marginBottom: 16, marginTop: 4, position: 'relative' },
  mascotCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  mascotImg: { width: 96, height: 96 },
  mascotEmoji: { fontSize: 48 },
  speechBubble: {
    position: 'absolute', top: -8, left: '55%', minWidth: 130, maxWidth: 170,
    backgroundColor: 'white', borderRadius: 14, borderWidth: 1.5, borderColor: '#dcfce7',
    paddingHorizontal: 12, paddingVertical: 9,
    ...Platform.select({
      web: { boxShadow: '0 6px 16px rgba(0,0,0,0.12)' } as any,
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
    }),
  },
  speechText: { fontSize: 12.5, color: '#0f172a', fontWeight: '700', lineHeight: 17 },
  speechTail: {
    position: 'absolute', bottom: -7, left: 14, width: 0, height: 0,
    borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'white',
  },
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a' },
  sparkleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  eyebrow: { fontSize: 12, fontWeight: '900', color: '#16a34a', letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 10, letterSpacing: -0.5 },
  body: { fontSize: 14, color: '#64748b', fontWeight: '500', textAlign: 'center', lineHeight: 21, marginBottom: 22 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#4ade80', borderRadius: 14, paddingHorizontal: 26, paddingVertical: 14, marginBottom: 12 },
  ctaText: { color: '#052e16', fontWeight: '900', fontSize: 15 },
  later: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  parentLink: { fontSize: 12, color: '#16a34a', fontWeight: '700', marginTop: 10 },
});
