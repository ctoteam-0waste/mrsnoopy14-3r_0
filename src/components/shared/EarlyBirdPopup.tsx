import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PartyPopper, X, Gift } from 'lucide-react-native';
import { KarmaCoin } from './KarmaCoin';
import { LaunchConfetti } from './LaunchConfetti';
import { EARLY_BIRD_COINS } from '../../utils/earlyBird';

export function EarlyBirdPopup({ onGetStarted, onClose }: { onGetStarted: () => void; onClose: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start();
  }, []);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <LaunchConfetti />
        <Animated.View style={[s.cardWrap, { opacity: anim, transform: [{ scale }] }]}>
          <LinearGradient colors={['#052e16', '#166534', '#15803d']} style={s.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <X size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            <View style={s.iconBg}>
              <PartyPopper size={30} color="#fbbf24" />
            </View>
            <Text style={s.title}>🎉 Welcome to KarmaVerse!</Text>
            <Text style={s.sub}>
              Become an Early Bird today and receive {EARLY_BIRD_COINS.toLocaleString()} KarmaCoins XP instantly after registration.
              {'\n\n'}Complete your first eco action to unlock exclusive rewards and premium brand vouchers.
            </Text>

            <View style={s.bonusRow}>
              <KarmaCoin size={22} />
              <Text style={s.bonusRowText}>+{EARLY_BIRD_COINS.toLocaleString()} KarmaCoins XP on signup</Text>
            </View>
            <View style={s.bonusRow}>
              <Gift size={18} color="#fbbf24" />
              <Text style={s.bonusRowText}>Exclusive brand voucher access</Text>
            </View>

            <TouchableOpacity style={s.ctaBtn} onPress={onGetStarted} activeOpacity={0.85}>
              <Text style={s.ctaBtnText}>Get Started</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  cardWrap: { width: '100%', maxWidth: 360 },
  card: { borderRadius: 28, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.35, shadowRadius: 40, elevation: 20 },
  closeBtn: { position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  iconBg: { width: 60, height: 60, borderRadius: 18, backgroundColor: 'rgba(251,191,36,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { color: 'white', fontSize: 21, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', marginBottom: 20, textAlign: 'center', lineHeight: 19 },
  bonusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch', backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  bonusRowText: { color: '#fde68a', fontSize: 13, fontWeight: '700' },
  ctaBtn: { backgroundColor: '#fbbf24', alignSelf: 'stretch', alignItems: 'center', paddingVertical: 14, borderRadius: 100, marginTop: 10 },
  ctaBtnText: { color: '#78350f', fontSize: 15, fontWeight: '900' },
});
