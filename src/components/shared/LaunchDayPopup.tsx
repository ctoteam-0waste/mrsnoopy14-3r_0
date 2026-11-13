import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, TouchableOpacity, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PartyPopper, X } from 'lucide-react-native';
import { LaunchConfetti } from './LaunchConfetti';

const VISIBLE_MS = 9600;
const CLOSE_ANIM_MS = 400;

export function LaunchDayPopup({ onClose }: { onClose: () => void }) {
  const progress = useRef(new Animated.Value(0)).current; // 0 = folded shut, 1 = open
  const closedRef = useRef(false);

  const close = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    Animated.timing(progress, { toValue: 0, duration: CLOSE_ANIM_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => onClose());
  };

  useEffect(() => {
    Animated.spring(progress, { toValue: 1, friction: 7, tension: 55, useNativeDriver: true }).start();
    const timer = setTimeout(close, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  const rotateX = progress.interpolate({ inputRange: [0, 1], outputRange: ['85deg', '0deg'] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={close} />
        <LaunchConfetti />
        <Animated.View style={[s.cardWrap, { opacity: progress, transform: [{ perspective: 1000 }, { rotateX }, { scale }] }]}>
          <LinearGradient colors={['#052e16', '#166534', '#15803d']} style={s.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <TouchableOpacity style={s.closeBtn} onPress={close}>
              <X size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            <View style={s.iconBg}>
              <PartyPopper size={32} color="#fbbf24" />
            </View>
            <Text style={s.title}>We're live! 🎉</Text>
            <Text style={s.sub}>KarmaVerse has officially launched</Text>

            <TouchableOpacity style={s.ctaBtn} onPress={close} activeOpacity={0.85}>
              <Text style={s.ctaBtnText}>Let's go</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  cardWrap: { width: '100%', maxWidth: 340 },
  card: { borderRadius: 28, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.35, shadowRadius: 40, elevation: 20 },
  closeBtn: { position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  iconBg: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(251,191,36,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { color: 'white', fontSize: 22, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginBottom: 18, textAlign: 'center' },
  ctaBtn: { backgroundColor: '#fbbf24', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 100 },
  ctaBtnText: { color: '#78350f', fontSize: 14, fontWeight: '900' },
});
