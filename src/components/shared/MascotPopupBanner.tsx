import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, Image, Linking, Easing } from 'react-native';
import { X, ArrowRight } from 'lucide-react-native';

const SHOW_DELAY_MS = 2200;
const REAPPEAR_GAP_MS = 15000;
const MAX_SHOWS_PER_VISIT = 3;

const MESSAGES = [
  "Hi! I'm Planet Buddy 👋",
  "Let's recycle together!",
  'Every kg you recycle helps me breathe easier.',
  'Ready to earn KarmaCoins XP?',
];

interface Props {
  // True while the page is scrolled near the footer, so the fixed
  // bottom-right widget doesn't sit on top of the footer's contact info.
  suppressed?: boolean;
}

export function MascotPopupBanner({ suppressed = false }: Props) {
  const [visible, setVisible] = useState(false);
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const wiggle = useRef(new Animated.Value(0)).current;
  const bubbleOpacity = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(0.7)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const typingPulse = useRef(new Animated.Value(0.3)).current;
  const mouthOpen = useRef(new Animated.Value(1)).current;
  const blink = useRef(new Animated.Value(0)).current;
  const armWave = useRef(new Animated.Value(0)).current;
  const suppressOpacity = useRef(new Animated.Value(1)).current;
  const [typing, setTyping] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const [showCount, setShowCount] = useState(0);

  useEffect(() => {
    Animated.timing(suppressOpacity, {
      toValue: suppressed ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [suppressed]);

  // First appearance, shortly after the page loads.
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
      setShowCount(1);
    }, SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Re-show a beat after each dismissal, up to MAX_SHOWS_PER_VISIT times per page load.
  useEffect(() => {
    if (visible || showCount === 0 || showCount >= MAX_SHOWS_PER_VISIT) return;
    const timer = setTimeout(() => {
      setVisible(true);
      setShowCount((c) => c + 1);
    }, REAPPEAR_GAP_MS);
    return () => clearTimeout(timer);
  }, [visible, showCount]);

  useEffect(() => {
    if (!visible) return;

    // Reset entrance state so the whole intro (fade/scale + typing beat) replays on every reappearance.
    scale.setValue(0.9);
    opacity.setValue(0);
    bubbleOpacity.setValue(0);
    bubbleScale.setValue(0.7);
    typingPulse.setValue(0.3);
    setTyping(true);
    setMessageIndex(0);

    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    // Idle bob + wiggle loop, like Planet Buddy is waving hello.
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
    // Alternate the open-mouth and closed-mouth frames the whole time Planet
    // Buddy is on screen — actual lip movement, not a body-wide pulse.
    const mouthLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(mouthOpen, { toValue: 1, duration: 190, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(mouthOpen, { toValue: 0, duration: 190, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );

    // Quick blink every few seconds — eyes+mouth momentarily swap to the neutral frame.
    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(3400),
        Animated.timing(blink, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 0, duration: 90, useNativeDriver: true }),
      ])
    );

    // Gentle continuous wave — just the arm, rotating back and forth like a greeting.
    const armWaveLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(armWave, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(armWave, { toValue: -1, duration: 840, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(armWave, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

    bounceLoop.start();
    wiggleLoop.start();
    mouthLoop.start();
    blinkLoop.start();
    armWaveLoop.start();

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
      mouthLoop.stop();
      blinkLoop.stop();
      armWaveLoop.stop();
      typingLoop.stop();
      clearTimeout(bubbleTimer);
      clearTimeout(typingTimer);
      clearInterval(cycleInterval);
    };
  }, [visible]);

  const rotate = wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-6deg', '6deg'] });
  const armRotate = armWave.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] });

  const dismiss = () => {
    setVisible(false);
  };

  const visitWebsite = () => {
    dismiss();
    Linking.openURL('https://0waste.co.in/');
  };

  if (!visible) return null;

  return (
    <View style={s.container} pointerEvents={suppressed ? 'none' : 'box-none'}>
      <Animated.View style={[s.widget, { opacity: Animated.multiply(opacity, suppressOpacity), transform: [{ scale }] }]}>
        <TouchableOpacity style={s.closeBtn} onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={14} color="#64748b" />
        </TouchableOpacity>

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

        <TouchableOpacity onPress={visitWebsite} activeOpacity={0.85}>
          <View style={s.mascotCircle}>
            <Animated.View style={{ transform: [{ translateY: bounce }, { rotate }] }}>
              <Image source={require('../../../assets/mascot-mouth-closed-transparent.png')} style={s.mascotImg} resizeMode="contain" />
              <Animated.Image
                source={require('../../../assets/mascot-earth-buddy-transparent.png')}
                style={[s.mascotImg, s.mascotImgOverlay, { opacity: mouthOpen }]}
                resizeMode="contain"
              />
              <Animated.Image
                source={require('../../../assets/mascot-blink-transparent.png')}
                style={[s.mascotImg, s.mascotImgOverlay, { opacity: blink }]}
                resizeMode="contain"
              />
              <Animated.View style={[s.armOverlayWrap, { transform: [{ rotate: armRotate }] }]}>
                <Image source={require('../../../assets/mascot-arm-raised-transparent.png')} style={s.armOverlayImg} resizeMode="contain" />
              </Animated.View>
            </Animated.View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={s.lookPill} onPress={visitWebsite} activeOpacity={0.85}>
          <Text style={s.lookPillText}>We're part of the 3R Zero Waste movement</Text>
          <ArrowRight size={12} color="#16a34a" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    ...Platform.select({
      web: { position: 'fixed' } as any,
      default: { position: 'absolute' },
    }),
    bottom: 20,
    right: 20,
    left: 20,
    alignItems: 'flex-end',
    zIndex: 9999,
  },
  widget: { alignItems: 'center', position: 'relative' },
  closeBtn: {
    position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, zIndex: 1,
    backgroundColor: 'white', alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.18)' } as any,
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
    }),
  },
  mascotCircle: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  mascotImg: { width: 76, height: 76 },
  mascotImgOverlay: { position: 'absolute', top: 0, left: 0 },
  // Positioned/sized to match the raised-arm crop's box within the 1254x1254
  // source, scaled down to the 76px mascotImg display size (×0.0606).
  armOverlayWrap: { position: 'absolute', left: 51, top: 24, width: 19, height: 22 },
  armOverlayImg: { width: 19, height: 22 },
  speechBubble: {
    minWidth: 110, maxWidth: 200, marginBottom: 8,
    backgroundColor: 'white', borderRadius: 14, borderWidth: 1.5, borderColor: '#dcfce7',
    paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 6px 16px rgba(0,0,0,0.12)' } as any,
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
    }),
  },
  speechText: { fontSize: 12, color: '#0f172a', fontWeight: '700', lineHeight: 16, textAlign: 'center' },
  speechTail: {
    position: 'absolute', bottom: -7, left: '50%', marginLeft: -6, width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'white',
  },
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  typingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#16a34a' },
  lookPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8,
    backgroundColor: 'white', borderRadius: 12, borderWidth: 1.5, borderColor: '#dcfce7',
    paddingHorizontal: 14, paddingVertical: 8, maxWidth: 200,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } as any,
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
    }),
  },
  lookPillText: { flexShrink: 1, fontSize: 12, color: '#16a34a', fontWeight: '800', textAlign: 'center', lineHeight: 16 },
});
