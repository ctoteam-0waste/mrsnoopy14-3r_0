import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StatusBar, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { WebFooter } from '../components/shared/WebFooter';
import { LinearGradient } from 'expo-linear-gradient';
import { ShoppingBag, Gift, ArrowRight } from 'lucide-react-native';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { isDiwaliSeason } from '../utils/festive';
import { DiwaliHeaderDecor, DiwaliCoinRangoli, DiwaliSparkles, DiwaliBackdrop } from '../components/festive/Diwali';
import { makeStyles, useTheme } from '../theme';
import { trackEvent } from '../utils/analytics';

export function StoreScreen({ navigation }: any) {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const { isDark } = useTheme();
  const diwali = isDiwaliSeason();
  // Tab screens stay mounted, so count each time the tab is focused rather than on mount.
  useFocusEffect(useCallback(() => {
    trackEvent('reward_view', { reward_context: 'store' });
  }, []));

  return (
    <View style={styles.rootContainer}>
      {diwali && <DiwaliBackdrop dark={isDark} />}
      <StatusBar barStyle="light-content" />
      <ScrollView style={[styles.container, diwali && { backgroundColor: 'transparent' }]} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#052e16', '#166534', '#15803d']} style={[styles.header, diwali && { overflow: 'hidden' }]}>
          {diwali && <DiwaliHeaderDecor wide={width >= 768} />}
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerSubtitle}>Spend your rewards</Text>
              <Text style={styles.headerTitle}>Karma store</Text>
            </View>
            <View style={styles.headerIconBox}>
              <ShoppingBag size={24} color="#fff" />
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>

          <View style={[styles.coinWrap, diwali && { marginTop: 48, marginBottom: 64 }]}>
            {diwali && <DiwaliSparkles count={8} />}
            {diwali && <DiwaliCoinRangoli size={240} opacity={0.9} />}
            <KarmaCoin size={110} glow animated />
            <View style={styles.giftBadge}>
              <Gift size={20} color="#15803d" />
            </View>
          </View>

          <Text style={styles.comingSoonText}>Coming soon!</Text>
          <Text style={styles.descText}>
            We're curating a premium collection of zero-waste, eco-friendly products. Soon you'll be able to spend your KarmaCoins XP here on sustainable goodies!
          </Text>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('SchedulePickup')}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>Keep making an impact to earn coins</Text>
            <ArrowRight size={20} color="white" />
          </TouchableOpacity>
        </View>
        {Platform.OS === 'web' && <WebFooter />}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  rootContainer: { flex: 1, backgroundColor: c.bg },
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', maxWidth: 800, width: '100%', alignSelf: 'center' },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: '900', letterSpacing: 0.5 },
  headerSubtitle: { color: '#86efac', fontSize: 13, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  headerIconBox: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 64, paddingBottom: 60, maxWidth: 600, width: '100%', alignSelf: 'center' },
  coinWrap: { marginTop: 8, marginBottom: 32, alignItems: 'center', justifyContent: 'center' },
  giftBadge: { position: 'absolute', top: -6, right: -14, backgroundColor: c.surface, padding: 8, borderRadius: 20, elevation: 5, shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
  comingSoonText: { fontSize: 32, fontWeight: '900', color: c.text, marginBottom: 16 },
  descText: { fontSize: 15, color: c.textMuted, textAlign: 'center', fontWeight: '500', lineHeight: 24, marginBottom: 40 },

  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#15803d', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 20, gap: 12, shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  actionBtnText: { color: 'white', fontWeight: '900', fontSize: 15 },
}));
