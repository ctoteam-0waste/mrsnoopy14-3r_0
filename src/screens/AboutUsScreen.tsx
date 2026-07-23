import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Target, Eye, Recycle, Users, Truck, Coins, Sparkles } from 'lucide-react-native';

const STATS = [
  { value: '1.85L+', label: 'Citizens reached' },
  { value: '100%', label: 'Free doorstep pickup' },
  { value: '10', label: 'Waste categories accepted' },
  { value: '2020', label: 'Founded in Haryana' },
];

const INITIATIVES = [
  { icon: Truck, title: 'Free doorstep recycling', desc: 'Verified agents collect plastic, paper, metal, e-waste and more directly from your home, at no cost.' },
  { icon: Coins, title: 'Rewarding good behavior', desc: 'Every verified kilogram earns KarmaCoins XP — real rewards for real environmental impact.' },
  { icon: Users, title: 'Community-first model', desc: 'Referral and awareness programs that grow the circular economy through the people already in it.' },
  { icon: Recycle, title: 'Closing the loop', desc: 'Segregated waste is routed to certified recyclers, keeping material in use instead of landfill.' },
];

export function AboutUsScreen({ navigation }: any) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#052e16', '#166534', '#15803d']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerInner}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <ChevronLeft size={24} color="white" />
              </TouchableOpacity>
              <View style={styles.headerIconBox}>
                <Sparkles size={22} color="white" />
              </View>
            </View>
            <Text style={styles.headerTitle}>About KarmaVer$e</Text>
            <Text style={styles.headerSub}>A product of 3R Zero Waste Pvt. Ltd.</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          KarmaVer$e is the doorstep recycling rewards platform built by 3R Zero Waste Pvt. Ltd. — a Haryana-based
          company founded to make responsible waste management effortless and rewarding for every household in India.
        </Text>

        <View style={styles.statsGrid}>
          {STATS.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeadRow}>
            <View style={[styles.cardIconBg, { backgroundColor: '#f0fdf4' }]}><Target size={20} color="#16a34a" /></View>
            <Text style={styles.cardTitle}>Our mission</Text>
          </View>
          <Text style={styles.cardText}>
            To turn India's growing waste problem into a circular economy opportunity — making it free, simple, and
            rewarding for households to recycle plastic, paper, metal, e-waste and more from their doorstep.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeadRow}>
            <View style={[styles.cardIconBg, { backgroundColor: '#ecfeff' }]}><Eye size={20} color="#0891b2" /></View>
            <Text style={styles.cardTitle}>Our vision</Text>
          </View>
          <Text style={styles.cardText}>
            A future where zero waste reaches landfills — where every citizen is an active participant in the
            circular economy, earning real value for the material they help recover.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>What we're doing about it</Text>
        {INITIATIVES.map((item, i) => (
          <View key={i} style={styles.initiativeRow}>
            <View style={styles.initiativeIconBg}>
              <item.icon size={20} color="#16a34a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.initiativeTitle}>{item.title}</Text>
              <Text style={styles.initiativeDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.companyLink} onPress={() => Linking.openURL('https://0waste.co.in/')}>
          <Text style={styles.companyLinkText}>Learn more about 3R Zero Waste at 0waste.co.in ↗</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },

  header: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerInner: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 22, maxWidth: 800, width: '100%', alignSelf: 'center' },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: 'white', fontSize: 26, fontWeight: '900', letterSpacing: 0.3, marginBottom: 6 },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60, maxWidth: 800, width: '100%', alignSelf: 'center' },
  intro: { fontSize: 15, color: '#334155', lineHeight: 24, fontWeight: '500', marginBottom: 24 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  statCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: 'white', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#e2e8f0' },
  statValue: { fontSize: 24, fontWeight: '900', color: '#16a34a', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },

  card: { backgroundColor: 'white', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  cardText: { fontSize: 14, color: '#475569', lineHeight: 22, fontWeight: '500' },

  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginTop: 8, marginBottom: 16 },
  initiativeRow: { flexDirection: 'row', gap: 14, marginBottom: 18 },
  initiativeIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  initiativeTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  initiativeDesc: { fontSize: 13, color: '#64748b', lineHeight: 20, fontWeight: '500' },

  companyLink: { marginTop: 8, alignItems: 'center', paddingVertical: 14 },
  companyLinkText: { color: '#16a34a', fontWeight: '700', fontSize: 13 },
});
