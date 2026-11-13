import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PartyPopper } from 'lucide-react-native';

export function LaunchDayBanner() {
  return (
    <LinearGradient colors={['#052e16', '#166534', '#15803d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.banner}>
      <View style={s.iconBg}>
        <PartyPopper size={20} color="#fbbf24" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>We're live! 🎉</Text>
        <Text style={s.sub}>KarmaVerse has officially launched</Text>
      </View>
      <View style={s.todayChip}>
        <Text style={s.todayChipText}>TODAY{'\n'}ONLY</Text>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, padding: 16 },
  iconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  title: { color: 'white', fontSize: 15, fontWeight: '900', marginBottom: 2 },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },
  todayChip: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, minWidth: 56 },
  todayChipText: { color: 'white', fontSize: 10, fontWeight: '900', textAlign: 'center', lineHeight: 13 },
});
