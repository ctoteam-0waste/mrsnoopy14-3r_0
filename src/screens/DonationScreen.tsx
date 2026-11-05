import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, TreePine, Monitor, Laptop, HeartHandshake } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { profileService } from '../services/profile';
import { showAlert } from '../utils/alert';
import { makeStyles } from '../theme';
import { StatusBarFiller } from '../components/shared/StatusBarFiller';

// UI-only for now — no backend donation endpoint exists yet. Wire this up to a real
// API (deduct coins, record the donation) once the backend contract is available.
const DONATION_OPTIONS = [
  {
    id: 'tree',
    icon: TreePine,
    title: 'Plant One Tree',
    desc: 'Fund a sapling planted and maintained by the foundation.',
    coins: 2000,
    color: '#16a34a',
    bg: '#f0fdf4',
  },
  {
    id: 'computer',
    icon: Monitor,
    title: 'Computer Donation',
    desc: 'Refurbish and gift a computer to a student in need.',
    coins: 100000,
    color: '#0ea5e9',
    bg: '#f0f9ff',
  },
  {
    id: 'laptop',
    icon: Laptop,
    title: 'Laptop Donation',
    desc: 'Refurbish and gift a laptop to a student in need.',
    coins: 50000,
    color: '#8b5cf6',
    bg: '#faf5ff',
  },
];

export function DonationScreen({ navigation, route }: any) {
  const styles = useStyles();
  const [balance, setBalance] = useState<number>(route?.params?.balance || 0);

  useEffect(() => {
    profileService.getProfile()
      .then((profile) => setBalance(profile.karmaCoins || profile.coins || 0))
      .catch(() => {});
  }, []);

  const handleDonate = (option: typeof DONATION_OPTIONS[number], canAfford: boolean, shortfall: number) => {
    if (!canAfford) {
      showAlert(
        'Not enough KarmaCoins XP',
        `You need ${shortfall.toLocaleString()} more KarmaCoins XP to make the "${option.title}" donation. Keep earning and come back soon.`
      );
      return;
    }
    showAlert(
      'Donations opening soon',
      `Thanks for supporting 3R ZeroWaste. The "${option.title}" donation will be live shortly — check back soon.`
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      <StatusBarFiller color="#064e3b" />

      <LinearGradient colors={['#064e3b', '#15803d']} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('App')}>
              <ChevronLeft size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Donate</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.balancePill}>
            <KarmaCoin size={22} />
            <Text style={styles.balanceText}>{balance.toLocaleString()} available</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          {/* Foundation branding — neutral placeholder icon, NOT the KarmaVerse
              logo (that misrepresented the partner). TODO: drop the real 3R ZeroWaste
              logo into assets/ and render it here once the Founding
              Engineer supplies the branding asset. */}
          <View style={styles.foundationCard}>
            <View style={styles.foundationLogoWrap}>
              <HeartHandshake size={30} color="#15803d" />
            </View>
            <Text style={styles.foundationLabel}>IN PARTNERSHIP WITH</Text>
            <Text style={styles.foundationName}>3R ZeroWaste</Text>
            <Text style={styles.foundationDesc}>
              Every donation goes directly to 3R ZeroWaste, supporting environmental and
              community welfare initiatives.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Choose a donation</Text>

          {DONATION_OPTIONS.map((option) => {
            const Icon = option.icon;
            const canAfford = balance >= option.coins;
            const shortfall = Math.max(0, option.coins - balance);
            return (
              <View key={option.id} style={styles.optionCard}>
                <View style={[styles.optionIconBg, { backgroundColor: option.bg }]}>
                  <Icon size={22} color={option.color} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDesc}>{option.desc}</Text>
                  <View style={styles.optionCoinRow}>
                    <KarmaCoin size={16} />
                    <Text style={styles.optionCoinText}>{option.coins.toLocaleString()} KarmaCoins XP</Text>
                  </View>
                  {!canAfford && (
                    <Text style={styles.optionShortfall}>Need {shortfall.toLocaleString()} more to unlock</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.donateBtn}
                  onPress={() => handleDonate(option, canAfford, shortfall)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.donateBtnText}>Donate</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  scroll: { flex: 1 },

  header: { paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, maxWidth: 800, width: '100%', alignSelf: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: 'white', textAlign: 'center' },

  balancePill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8, marginTop: 16,
  },
  balanceText: { color: 'white', fontWeight: '800', fontSize: 13 },

  content: { padding: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },

  foundationCard: {
    backgroundColor: c.surface, borderRadius: 20, padding: 22, alignItems: 'center',
    borderWidth: 1, borderColor: c.border, marginBottom: 28,
  },
  foundationLogoWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#dcfce7' },
  foundationLabel: { fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 1.2, marginBottom: 4 },
  foundationName: { fontSize: 18, fontWeight: '900', color: c.text, marginBottom: 8 },
  foundationDesc: { fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 20, fontWeight: '500' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: c.text, marginBottom: 14 },

  optionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 18,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border,
    elevation: 2, shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8,
  },
  optionIconBg: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionInfo: { flex: 1, marginLeft: 12, marginRight: 10 },
  optionTitle: { fontSize: 14, fontWeight: '800', color: c.text, marginBottom: 3 },
  optionDesc: { fontSize: 12, color: c.textMuted, fontWeight: '500', marginBottom: 6, lineHeight: 16 },
  optionCoinRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  optionCoinText: { fontSize: 12, fontWeight: '800', color: c.primary },
  optionShortfall: { fontSize: 11, fontWeight: '700', color: '#d97706', marginTop: 4 },

  donateBtn: { backgroundColor: '#15803d', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100 },
  donateBtnText: { color: 'white', fontWeight: '800', fontSize: 12 },
}));
