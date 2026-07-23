import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Animated, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Truck, Gamepad2, Coins, ChevronRight, Package, Users, Gift, BookOpen, Star, Flame, Recycle, ArrowRight, Zap, Sparkles, Shield, Trophy, Calendar, X, CheckCircle2, BadgeCheck, ShieldCheck } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { WebFooter } from '../components/shared/WebFooter';
import { profileService } from '../services/profile';
import { bookingService } from '../services/booking';
import { getLocalDateStr, getLocalYesterdayStr } from '../utils/quizDate';
import { REDEEM_INFO_MESSAGE, showRedeemInfoOnce } from '../utils/redeemInfo';
import { getStableUserSuffix } from '../utils/userId';

const MAX = 1200;

const FEATURE_DETAILS = [
  {
    id: 'pickup', title: 'Schedule a pickup', emoji: '🚛',
    desc: 'Give your old items a second life — book a doorstep pickup in 3 taps and earn KarmaCoins for going green.',
    steps: ['Pick what you want to recycle', 'Choose date & time slot', 'Agent comes to your door', 'Earn KarmaCoins XP instantly'],
    benefit: 'Earn coins on every pickup',
    gradient: ['#052e16', '#15803d'] as [string, string],
    accent: '#4ade80',
  },
  {
    id: 'refer', title: 'Refer & earn', emoji: '👥',
    desc: 'Share your referral code with friends. When they make their first pickup, you both get bonus KarmaCoins XP!',
    steps: ['Share your unique code', 'Friend signs up & books pickup', 'Both earn bonus coins', 'No limit on referrals'],
    benefit: 'Bonus coins for every friend',
    gradient: ['#881337', '#e11d48'] as [string, string],
    accent: '#fb7185',
  },
  {
    id: 'knowledge', title: 'Knowledge hub', emoji: '📚',
    desc: 'Learn about sustainable living with curated articles, tips, and guides on waste management and recycling.',
    steps: ['Browse eco articles', 'Learn recycling tips', 'Share with friends', 'Make better choices'],
    benefit: 'Become an eco expert',
    gradient: ['#164e63', '#0891b2'] as [string, string],
    accent: '#22d3ee',
  },
  {
    id: 'waste', title: 'Recycle almost anything', emoji: '♻️',
    desc: 'From old gadgets to glass bottles — we give 10 categories of household items a responsible second life, away from landfills.',
    steps: ['Phones, laptops & appliances', 'Plastic, paper & metal', 'Glass, shoes & textiles', 'Every item earns KarmaCoins'],
    benefit: 'Nothing goes to waste',
    gradient: ['#78350f', '#d97706'] as [string, string],
    accent: '#fbbf24',
  },
  {
    id: 'instant', title: 'Instant credit', emoji: '⚡',
    desc: 'No waiting — KarmaCoins XP are credited to your wallet immediately after the agent verifies and collects your waste.',
    steps: ['Agent weighs items at door', 'Verification done on spot', 'Coins added instantly', 'Check wallet in real-time'],
    benefit: 'Zero wait for rewards',
    gradient: ['#312e81', '#4f46e5'] as [string, string],
    accent: '#818cf8',
  },
  {
    id: 'agents', title: 'Verified agents', emoji: '🛡️',
    desc: 'All our pickup agents are background-verified and trained. Track them live on the map and contact directly from the app.',
    steps: ['Background-checked partners', 'Live GPS tracking', 'Direct call from app', 'Rate after every pickup'],
    benefit: 'Safe & trusted pickups',
    gradient: ['#134e4a', '#14b8a6'] as [string, string],
    accent: '#2dd4bf',
  },
];

const STATUS_CLR: any = {
  Completed: { bg: '#dcfce7', text: '#16a34a' },
  'In Transit': { bg: '#fef9c3', text: '#ca8a04' },
  Scheduled: { bg: '#dbeafe', text: '#2563eb' },
  Cancelled: { bg: '#fee2e2', text: '#dc2626' },
};

export function DashboardScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const pad = isMobile ? 16 : 32;

  const [userName, setUserName] = useState('');
  const [balance, setBalance] = useState(0);
  const [streak, setStreak] = useState(0);
  const [quizStreak, setQuizStreak] = useState(0);
  const [totalPickups, setTotalPickups] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<typeof FEATURE_DETAILS[0] | null>(null);

  useEffect(() => {
    const load = async () => {
      const [prof, orders] = await Promise.all([
        profileService.getProfile().catch(() => ({})),
        bookingService.getMyBookings().catch(() => []),
      ]);
      if (prof.name) { const first = prof.name.trim().split(/\s+/)[0]; setUserName(first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()); }
      setBalance(prof.karmaCoins || prof.coins || 0);
      if (Array.isArray(orders)) {
        setTotalPickups(orders.filter((o: any) => o.status === 'COMPLETED').length);
        setRecentOrders(orders.slice(0, 6).map((o: any) => {
          let st = 'Scheduled';
          if (o.status === 'COMPLETED') st = 'Completed';
          if (o.status === 'IN_TRANSIT' || o.status === 'ACCEPTED') st = 'In Transit';
          if (o.status === 'CANCELLED') st = 'Cancelled';
          const cat = o.categories?.[0]?.subCategory || o.categories?.[0]?.category || 'Mixed Waste';
          const date = new Date(o.pickupDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
          return { id: `#${(o._id || o.id || '').substring(0, 8).toUpperCase()}`, type: cat, date, status: st, credits: o.totalKarmaCoins || 0, raw: o };
        }));
      }
    };
    const loadQuiz = async () => {
      const token = await AsyncStorage.getItem('userToken');
      const sfx = getStableUserSuffix(token);
      const [sd, ss] = await Promise.all([AsyncStorage.getItem(`lastQuizDate_${sfx}`), AsyncStorage.getItem(`quizStreak_${sfx}`)]);
      const today = getLocalDateStr();
      const yest = getLocalYesterdayStr();
      setQuizStreak(!sd ? 0 : (sd === today || sd === yest ? Number(ss) || 0 : 0));

      // Day streak = consecutive days the app was opened (frontend-tracked, no backend dependency)
      const [lad, ds] = await Promise.all([AsyncStorage.getItem(`lastActiveDate_${sfx}`), AsyncStorage.getItem(`dayStreak_${sfx}`)]);
      let dayStreak: number;
      if (lad === today) dayStreak = Number(ds) || 1;
      else if (lad === yest) dayStreak = (Number(ds) || 0) + 1;
      else dayStreak = 1;
      await AsyncStorage.multiSet([[`lastActiveDate_${sfx}`, today], [`dayStreak_${sfx}`, String(dayStreak)]]);
      setStreak(dayStreak);
    };
    const unsub = navigation.addListener('focus', () => { load(); loadQuiz(); });
    load(); loadQuiz();

    (async () => {
      const token = await AsyncStorage.getItem('userToken');
      showRedeemInfoOnce(`firstHomeRedeemInfo_${getStableUserSuffix(token)}`);
    })();

    return unsub;
  }, [navigation]);

  const progress = balance % 50 === 0 && balance > 0 ? 100 : (balance % 50) * 2;
  const nav = (screen: string, p?: any) => navigation.navigate(screen, p);

  return (
    <ScrollView style={z.root} showsVerticalScrollIndicator={false}>

      {/* ════════ HERO ════════ */}
      <LinearGradient colors={['#052e16', '#064e3b', '#0f766e']} style={z.hero}>
        <View style={z.heroDecor1} />
        <View style={z.heroDecor2} />
        <View style={[z.container, { paddingHorizontal: pad }]}>

          {/* Hero content */}
          <View style={[z.heroGrid, isMobile && { flexDirection: 'column', gap: 20, alignItems: 'stretch' }]}>
            {/* Left: Greeting + Balance */}
            <View style={z.heroLeft}>
              <Text style={z.heroGreet}>Welcome back,</Text>
              <Text style={[z.heroName, isMobile && { fontSize: 20 }]}>{userName || '...'}</Text>
              <View style={z.heroBalance}>
                <View style={z.heroCoinGlow}>
                  <KarmaCoin size={isMobile ? 52 : 64} glow animated />
                </View>
                <View>
                  <Text style={[z.heroBalNum, isMobile && { fontSize: 32 }]}>{balance.toLocaleString()}</Text>
                  <Text style={z.heroBalLabel}>KarmaCoins XP</Text>
                </View>
              </View>
              <View style={[z.heroProgressWrap, isMobile && { maxWidth: '100%' }]}>
                <View style={z.heroProgressTrack}>
                  <LinearGradient colors={['#4ade80', '#22d3ee']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[z.heroProgressFill, { width: `${progress}%` as any }]} />
                </View>
                <Text style={z.heroProgressText}>{progress}% to next reward</Text>
              </View>
              <View style={[z.redeemBanner, { flexDirection: 'row', alignItems: 'center', gap: 8 }, isMobile && { maxWidth: '100%' }]}>
                <KarmaCoin size={18} />
                <Text style={[z.redeemBannerText, { flex: 1 }]}>{REDEEM_INFO_MESSAGE}</Text>
              </View>
            </View>

            {/* Stats grid */}
            {isMobile ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {[
                  { icon: Coins, color: '#4ade80', val: balance.toLocaleString(), label: 'Total coins' },
                  { icon: Flame, color: '#fb923c', val: `${streak}`, label: 'Day streak' },
                  { icon: Trophy, color: '#c084fc', val: `${quizStreak}`, label: 'Quiz streak' },
                  { icon: Package, color: '#22d3ee', val: `${totalPickups}`, label: 'Pickups done' },
                ].map((st, i) => (
                  <View key={i} style={{ width: Math.floor((width - 2 * pad - 8) / 2), backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: st.color + '20', alignItems: 'center', justifyContent: 'center' }}>
                        <st.icon size={14} color={st.color} />
                      </View>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: '600' }}>{st.label}</Text>
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: st.color }}>{st.val}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={z.heroRight}>
                {[
                  { icon: Coins, color: '#4ade80', val: balance.toLocaleString(), label: 'Total coins' },
                  { icon: Flame, color: '#fb923c', val: `${streak}`, label: 'Day streak' },
                  { icon: Trophy, color: '#c084fc', val: `${quizStreak}`, label: 'Quiz streak' },
                  { icon: Package, color: '#22d3ee', val: `${totalPickups}`, label: 'Pickups done' },
                ].map((st, i) => (
                  <View key={i} style={z.statCard}>
                    <View style={z.statTop}>
                      <View style={[z.statIconBg, { backgroundColor: st.color + '20' }]}>
                        <st.icon size={18} color={st.color} />
                      </View>
                      <Text style={z.statLabel}>{st.label}</Text>
                    </View>
                    <Text style={[z.statVal, { color: st.color }]}>{st.val}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* ════════ TWO ACTION CARDS: Schedule + Quiz ════════ */}
      <View style={[z.container, { marginTop: 24, paddingHorizontal: pad }]}>
        <View style={[z.actionPair, isMobile && { flexDirection: 'column' }]}>
          {/* Schedule Pickup */}
          <TouchableOpacity style={z.actionCard} activeOpacity={0.85} onPress={() => nav('SchedulePickup')}>
            <LinearGradient colors={['#052e16', '#166534']} style={z.actionCardGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={z.actionCardDecor} />
              <View style={z.actionCardTop}>
                <View style={z.actionCardIconBg}>
                  <Truck size={28} color="#4ade80" />
                </View>
                <ArrowRight size={20} color="rgba(255,255,255,0.4)" />
              </View>
              <Text style={z.actionCardTitle}>Schedule a pickup</Text>
              <Text style={z.actionCardSub}>Turn your clutter into KarmaCoins. Doorstep pickup, zero effort, planet-friendly.</Text>
              <View style={z.actionCardCTA}>
                <Text style={z.actionCardCTAText}>Schedule now</Text>
                <ArrowRight size={14} color="#4ade80" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Daily Quiz */}
          <TouchableOpacity style={z.actionCard} activeOpacity={0.85} onPress={() => nav('Quiz')}>
            <LinearGradient colors={['#3b0764', '#6b21a8']} style={z.actionCardGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={[z.actionCardDecor, { backgroundColor: 'rgba(168,85,247,0.2)' }]} />
              <View style={z.actionCardTop}>
                <View style={[z.actionCardIconBg, { backgroundColor: 'rgba(168,85,247,0.2)' }]}>
                  <Gamepad2 size={28} color="#c084fc" />
                </View>
                <View style={z.streakChip}>
                  <Flame size={12} color="#f97316" />
                  <Text style={z.streakChipText}>{quizStreak} streak</Text>
                </View>
              </View>
              <Text style={z.actionCardTitle}>Daily eco-quiz</Text>
              <Text style={z.actionCardSub}>Test your green IQ. Earn KarmaCoins XP daily.</Text>
              <View style={z.actionCardCTA}>
                <Text style={[z.actionCardCTAText, { color: '#c084fc' }]}>Play now</Text>
                <ArrowRight size={14} color="#c084fc" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* ════════ DISCOVER FEATURES ════════ */}
      <View style={[z.container, { marginTop: 28, paddingHorizontal: pad }]}>
        <View style={z.sectionHead}>
          <View>
            <Text style={z.sectionLabel}>EXPLORE</Text>
            <Text style={z.sectionTitle}>Discover features</Text>
          </View>
        </View>

        <View style={[z.discoverRow, isMobile && { gap: 10 }]}>
          {FEATURE_DETAILS.map((f, i) => {
            const icons = [Truck, Gift, BookOpen, Recycle, Zap, Shield];
            const Icon = icons[i] || Package;
            const cardW = isMobile ? Math.floor((width - 2 * pad - 10) / 2) : undefined;
            return (
              <TouchableOpacity
                key={f.id}
                style={[z.discoverCard, cardW ? { width: cardW } : undefined]}
                activeOpacity={0.85}
                onPress={() => (f.id === 'knowledge' ? nav('KnowledgeHub') : setSelectedFeature(f))}
              >
                <LinearGradient colors={f.gradient} style={z.discoverCardInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <View style={z.discoverCardDecor} />
                  <View style={z.discoverIconBg}>
                    <Icon size={24} color="rgba(255,255,255,0.9)" />
                  </View>
                  <Text style={z.discoverCardTitle}>{f.title}</Text>
                  <Text style={z.discoverCardDesc}>{f.desc.substring(0, 50)}...</Text>
                  <View style={z.discoverCardArrow}>
                    <ArrowRight size={14} color="rgba(255,255,255,0.5)" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ════════ RECENT ORDERS (full width) ════════ */}
      <View style={[z.container, { marginTop: 28, paddingHorizontal: pad }]}>
        <View style={z.sectionHead}>
          <View>
            <Text style={z.sectionLabel}>ACTIVITY</Text>
            <Text style={z.sectionTitle}>Recent orders</Text>
          </View>
          <TouchableOpacity onPress={() => nav('Orders')}>
            <Text style={z.viewAll}>View all orders →</Text>
          </TouchableOpacity>
        </View>

        {recentOrders.length === 0 ? (
          <View style={z.emptyOrders}>
            <Package size={44} color="#e2e8f0" />
            <Text style={z.emptyText}>No orders yet</Text>
            <TouchableOpacity style={z.emptyBtn} onPress={() => nav('SchedulePickup')}>
              <Text style={z.emptyBtnText}>Schedule your first pickup</Text>
            </TouchableOpacity>
          </View>
        ) : isMobile ? (
          <View style={{ gap: 10 }}>
            {recentOrders.map((order, i) => {
              const sc = STATUS_CLR[order.status] || STATUS_CLR.Scheduled;
              return (
                <TouchableOpacity key={i} style={z.mobileOrderCard} onPress={() => nav('BookingDetails', { booking: order.raw })} activeOpacity={0.7}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={z.orderDot}><Package size={14} color="#15803d" /></View>
                      <Text style={z.orderItemText}>{order.type}</Text>
                    </View>
                    <View style={[z.statusPill, { backgroundColor: sc.bg }]}>
                      <Text style={[z.statusPillText, { color: sc.text }]}>{order.status}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={z.ordersCellText}>{order.id} · {order.date}</Text>
                    <Text style={z.orderCoinsText}>{order.credits > 0 ? `+${order.credits} coins` : '—'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={z.ordersTable}>
            <View style={z.ordersHead}>
              <Text style={[z.ordersHeadText, { flex: 2 }]}>Item</Text>
              <Text style={[z.ordersHeadText, { flex: 1.5 }]}>Order ID</Text>
              <Text style={[z.ordersHeadText, { flex: 1.5 }]}>Date</Text>
              <Text style={[z.ordersHeadText, { flex: 1 }]}>Status</Text>
              <Text style={[z.ordersHeadText, { flex: 1, textAlign: 'right' }]}>Coins</Text>
              <View style={{ width: 24 }} />
            </View>
            {recentOrders.map((order, i) => {
              const sc = STATUS_CLR[order.status] || STATUS_CLR.Scheduled;
              return (
                <TouchableOpacity key={i} style={[z.ordersRow, i % 2 === 0 && { backgroundColor: '#fafafa' }]} onPress={() => nav('BookingDetails', { booking: order.raw })} activeOpacity={0.7}>
                  <View style={[z.ordersCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                    <View style={z.orderDot}><Package size={14} color="#15803d" /></View>
                    <Text style={z.orderItemText}>{order.type}</Text>
                  </View>
                  <Text style={[z.ordersCellText, { flex: 1.5 }]}>{order.id}</Text>
                  <Text style={[z.ordersCellText, { flex: 1.5 }]}>{order.date}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={[z.statusPill, { backgroundColor: sc.bg }]}>
                      <Text style={[z.statusPillText, { color: sc.text }]}>{order.status}</Text>
                    </View>
                  </View>
                  <Text style={[z.orderCoinsText, { flex: 1, textAlign: 'right' }]}>{order.credits > 0 ? `+${order.credits}` : '—'}</Text>
                  <ChevronRight size={14} color="#cbd5e1" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* ════════ REFER BANNER ════════ */}
      <View style={[z.container, { marginTop: 28, paddingHorizontal: pad }]}>
        <LinearGradient colors={['#052e16', '#166534']} style={[z.referBanner, isMobile && { flexDirection: 'column', gap: 16, padding: 20 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <View style={z.referBannerDecor} />
          <View style={{ flex: isMobile ? undefined : 1, zIndex: 1 }}>
            <Text style={[z.referTitle, isMobile && { fontSize: 18 }]}>Invite friends, earn together</Text>
            <Text style={z.referSub}>Share your referral code and both of you earn bonus KarmaCoins XP on their first pickup.</Text>
          </View>
          <TouchableOpacity style={z.referBtn} onPress={() => nav('Referral')}>
            <Users size={18} color="#052e16" />
            <Text style={z.referBtnText}>Refer now</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      <View style={{ height: 60 }} />
      <WebFooter />

      {/* ════════ FEATURE DETAIL MODAL ════════ */}
      {selectedFeature && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setSelectedFeature(null)}>
          <TouchableOpacity style={z.modalOverlay} activeOpacity={1} onPress={() => setSelectedFeature(null)}>
            <TouchableOpacity activeOpacity={1} style={z.modalCard} onPress={() => {}}>
              <LinearGradient colors={selectedFeature.gradient} style={z.modalHeader}>
                <View style={z.modalHeaderDecor} />
                <Text style={z.modalEmoji}>{selectedFeature.emoji}</Text>
                <Text style={z.modalTitle}>{selectedFeature.title}</Text>
                <Text style={z.modalDesc}>{selectedFeature.desc}</Text>
                <TouchableOpacity style={z.modalCloseBtn} onPress={() => setSelectedFeature(null)}>
                  <X size={18} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              </LinearGradient>

              <View style={z.modalBody}>
                <Text style={z.modalStepsTitle}>How it works</Text>
                {selectedFeature.steps.map((step, i) => (
                  <View key={i} style={z.modalStep}>
                    <View style={[z.modalStepNum, { backgroundColor: selectedFeature.accent + '20' }]}>
                      <Text style={[z.modalStepNumText, { color: selectedFeature.accent }]}>{i + 1}</Text>
                    </View>
                    <Text style={z.modalStepText}>{step}</Text>
                  </View>
                ))}

                <View style={[z.modalBenefit, { backgroundColor: selectedFeature.accent + '12', borderColor: selectedFeature.accent + '30' }]}>
                  <CheckCircle2 size={18} color={selectedFeature.accent} />
                  <Text style={[z.modalBenefitText, { color: selectedFeature.accent }]}>{selectedFeature.benefit}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </ScrollView>
  );
}

const z = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  container: { maxWidth: MAX, width: '100%', alignSelf: 'center', paddingHorizontal: 32 },

  // Hero — compact
  hero: { paddingTop: 24, paddingBottom: 28, position: 'relative', overflow: 'hidden' },
  heroDecor1: { position: 'absolute', top: -80, right: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.03)' },
  heroDecor2: { position: 'absolute', bottom: -50, left: '25%', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.02)' },
  heroGrid: { flexDirection: 'row', gap: 32, alignItems: 'center' },
  heroLeft: { flex: 1 },
  heroGreet: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  heroName: { color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: -0.3, marginBottom: 16 },
  heroBalance: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  // No background/border circle here — a static ring behind the coin shows
  // through as a "second circle" while the coin does its 3D spin.
  heroCoinGlow: { alignItems: 'center', justifyContent: 'center' },
  heroBalNum: { fontSize: 38, fontWeight: '900', color: 'white', letterSpacing: -2 },
  heroBalLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: 1 },
  heroProgressWrap: { maxWidth: 320 },
  heroProgressTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  heroProgressFill: { height: 5, borderRadius: 3 },
  heroProgressText: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '600' },
  redeemBanner: { marginTop: 14, maxWidth: 320, padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  redeemBannerText: { color: 'rgba(255,255,255,0.75)', fontSize: 11.5, fontWeight: '600', lineHeight: 16 },

  // Stats — single horizontal row on right
  heroRight: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statIconBg: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 20, fontWeight: '900', marginBottom: 2 },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },

  // Action pair
  actionPair: { flexDirection: 'row', gap: 20 },
  actionCard: { flex: 1, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6 },
  actionCardGrad: { padding: 22, minHeight: 160, justifyContent: 'space-between', position: 'relative', overflow: 'hidden' },
  actionCardDecor: { position: 'absolute', top: -25, right: -25, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(74,222,128,0.1)' },
  actionCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  actionCardIconBg: { width: 44, height: 44, borderRadius: 13, backgroundColor: 'rgba(74,222,128,0.15)', alignItems: 'center', justifyContent: 'center' },
  actionCardTitle: { color: 'white', fontSize: 18, fontWeight: '900', marginBottom: 4, letterSpacing: -0.3 },
  actionCardSub: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '500', lineHeight: 18, marginBottom: 12 },
  actionCardCTA: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionCardCTAText: { color: '#4ade80', fontWeight: '800', fontSize: 14 },
  streakChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  streakChipText: { color: '#fbbf24', fontSize: 12, fontWeight: '700' },

  // Section headers
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#16a34a', letterSpacing: 2, marginBottom: 3 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 },
  viewAll: { color: '#16a34a', fontWeight: '700', fontSize: 14 },

  // Discover
  discoverRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  discoverCard: { width: '31.5%', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  discoverCardInner: { padding: 18, minHeight: 150, justifyContent: 'space-between', position: 'relative', overflow: 'hidden' },
  discoverCardDecor: { position: 'absolute', top: -15, right: -15, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.08)' },
  discoverIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  discoverCardTitle: { color: 'white', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  discoverCardDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500', lineHeight: 16 },
  discoverCardArrow: { position: 'absolute', bottom: 16, right: 16, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  // Orders table
  ordersTable: { backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#e2e8f0' },
  ordersHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  ordersHeadText: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  ordersRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  ordersCell: {},
  ordersCellText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  orderDot: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  orderItemText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusPillText: { fontSize: 11, fontWeight: '800' },
  orderCoinsText: { fontSize: 14, fontWeight: '800', color: '#16a34a' },

  mobileOrderCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  emptyOrders: { backgroundColor: 'white', borderRadius: 20, padding: 50, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
  emptyBtn: { backgroundColor: '#15803d', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, marginTop: 8 },
  emptyBtnText: { color: 'white', fontWeight: '800', fontSize: 14 },

  // Refer banner
  referBanner: { borderRadius: 24, padding: 32, flexDirection: 'row', alignItems: 'center', gap: 32, overflow: 'hidden', position: 'relative' },
  referBannerDecor: { position: 'absolute', top: -40, right: 100, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(74,222,128,0.08)' },
  referTitle: { color: 'white', fontSize: 22, fontWeight: '900', marginBottom: 8 },
  referSub: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '500', lineHeight: 22 },
  referBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#4ade80', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, flexShrink: 0 },
  referBtnText: { color: '#052e16', fontWeight: '900', fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 460, backgroundColor: 'white', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 40, elevation: 20 },
  modalHeader: { padding: 28, paddingTop: 32, position: 'relative', overflow: 'hidden' },
  modalHeaderDecor: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)' },
  modalCloseBtn: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  modalEmoji: { fontSize: 40, marginBottom: 12 },
  modalTitle: { color: 'white', fontSize: 24, fontWeight: '900', marginBottom: 8, letterSpacing: -0.5 },
  modalDesc: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '500', lineHeight: 22 },
  modalBody: { padding: 28 },
  modalStepsTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  modalStep: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  modalStepNum: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalStepNumText: { fontSize: 14, fontWeight: '900' },
  modalStepText: { fontSize: 15, fontWeight: '600', color: '#334155', flex: 1 },
  modalBenefit: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, padding: 14, borderRadius: 14, borderWidth: 1 },
  modalBenefitText: { fontSize: 14, fontWeight: '800' },
});
