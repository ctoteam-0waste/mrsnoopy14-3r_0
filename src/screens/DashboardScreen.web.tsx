import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Animated, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Truck, Gamepad2, Coins, ChevronRight, Package, Users, Gift, BookOpen, Star, Flame, ArrowRight, Zap, Sparkles, Trophy, Calendar, X, CheckCircle2, BadgeCheck, ShieldCheck } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from '../utils/tokenStore';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { WebFooter } from '../components/shared/WebFooter';
import { LaunchDayPopup } from '../components/shared/LaunchDayPopup';
import { profileService } from '../services/profile';
import { bookingService } from '../services/booking';
import { streakService } from '../services/streak';
import { getLocalDateStr, getLocalYesterdayStr } from '../utils/quizDate';
import { REDEEM_INFO_MESSAGE, showRedeemInfoOnce } from '../utils/redeemInfo';
import { getStableUserSuffix } from '../utils/userId';
import { loadQuizDays, QuizDays } from '../utils/quizHistory';
import { isLaunchDay } from '../utils/launchDay';
import { isDiwaliSeason } from '../utils/festive';
import {
  DiwaliLights, DiwaliShimmerText, DiwaliCleanupCard, DiwaliKandils, DiwaliEmbers, DiwaliDiyas, DiwaliCoinRangoli,
  DiwaliGoldBorder, DiwaliBurst, useDiwaliCountUp, DiwaliDiyaTracker, DiwaliGreetingModal, DiwaliBackdrop,
} from '../components/festive/Diwali';
import { EARLY_BIRD_COINS } from '../utils/earlyBird';
import { useTheme, makeStyles } from '../theme';
import { bookingCoins, formatBookingCoins } from '../utils/bookingCoins';

const MAX = 1200;

const FEATURE_DETAILS = [
  {
    id: 'refer', title: 'Refer & earn', emoji: '👥', icon: Gift,
    desc: 'Share your referral code with friends. When they sign up with it and verify their phone number, you both get 1,000 bonus KarmaCoins XP!',
    steps: ['Share your unique code', 'Friend signs up with your code', 'Both earn bonus coins', 'No limit on referrals'],
    benefit: 'Bonus coins for every friend',
    gradient: ['#881337', '#e11d48'] as [string, string],
    accent: '#fb7185',
  },
  {
    id: 'knowledge', title: 'Knowledge hub', emoji: '📚', icon: BookOpen,
    desc: 'Learn about sustainable living with curated articles, tips, and guides on the circular economy and greener everyday choices.',
    steps: ['Browse eco articles', 'Learn sustainability tips', 'Share with friends', 'Make better choices'],
    benefit: 'Become an eco expert',
    gradient: ['#164e63', '#0891b2'] as [string, string],
    accent: '#22d3ee',
  },
  {
    id: 'pickup', title: 'Schedule a pickup', emoji: '🚛', icon: Truck,
    desc: 'Give your old items a second life — book a sustainable pickup in 3 taps and earn KarmaCoins for going green.',
    steps: ['Pick the items to hand over', 'Choose date & time slot', 'Agent comes to your door', 'Earn KarmaCoins XP instantly'],
    benefit: 'Earn coins on every pickup',
    gradient: ['#052e16', '#15803d'] as [string, string],
    accent: '#4ade80',
  },
  {
    id: 'quiz', title: 'Daily eco-quiz', emoji: '🧠', icon: Gamepad2, route: 'Quiz',
    desc: 'Test your green IQ with a fresh AI-generated quiz every day and earn KarmaCoins XP for every correct answer.',
    steps: ['Play a new quiz daily', 'Answer eco questions', 'Earn coins per answer', 'Build your streak'],
    benefit: 'Learn and earn daily',
    gradient: ['#4c1d95', '#7c3aed'] as [string, string],
    accent: '#c084fc',
  },
  {
    id: 'instant', title: 'Instant credit', emoji: '⚡', icon: Zap,
    desc: 'No waiting — KarmaCoins XP are credited to your wallet immediately after the agent verifies and collects your materials.',
    steps: ['Agent weighs items at door', 'Verification done on spot', 'Coins added instantly', 'Check wallet in real-time'],
    benefit: 'Zero wait for rewards',
    gradient: ['#312e81', '#4f46e5'] as [string, string],
    accent: '#818cf8',
  },
];

const STATUS_CLR: any = {
  Completed: { bg: '#dcfce7', text: '#16a34a' },
  'In Transit': { bg: '#fef9c3', text: '#ca8a04' },
  Scheduled: { bg: '#dbeafe', text: '#2563eb' },
  Cancelled: { bg: '#fee2e2', text: '#dc2626' },
};

// Time-aware greeting based on the user's device clock.
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Still awake, night owl? 🦉';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export function DashboardScreen({ navigation, route }: any) {
  const z = useStyles();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  // 900 (not 768) so iPad portrait (~810px) uses the clean stacked layout —
  // the desktop row squeezes the redeem banner into a tall unreadable sliver.
  const isMobile = width < 900;
  const diwali = isDiwaliSeason();
  const isTablet = width >= 768 && width < 1024;
  const pad = isMobile ? 16 : 32;

  const [userName, setUserName] = useState('');
  const [balance, setBalance] = useState(0);
  const [streak, setStreak] = useState(0);
  const [quizStreak, setQuizStreak] = useState(0);
  const [totalPickups, setTotalPickups] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<typeof FEATURE_DETAILS[0] | null>(null);
  const [showLaunchPopup, setShowLaunchPopup] = useState(false);
  const [showWelcomeBonusBanner, setShowWelcomeBonusBanner] = useState(false);
  // Diwali: days with a quiz or a pickup light the Deepotsav diyas.
  const [quizDays, setQuizDays] = useState<string[]>([]);
  const [pickupDays, setPickupDays] = useState<string[]>([]);
  const [userSuffix, setUserSuffix] = useState('');
  const [showDiwaliGreeting, setShowDiwaliGreeting] = useState(false);
  const [shownBalance, balanceBurst] = useDiwaliCountUp(balance, diwali);

  // New signup arriving straight from the Welcome Celebration scratch card —
  // show the "coins added" banner once, then clear the param so it doesn't
  // reappear on the next tab focus.
  useEffect(() => {
    if (route?.params?.justClaimedWelcomeBonus) {
      setShowWelcomeBonusBanner(true);
      navigation.setParams({ justClaimedWelcomeBonus: undefined });
    }
  }, [route?.params?.justClaimedWelcomeBonus]);

  useEffect(() => {
    const load = async () => {
      const [prof, orders] = await Promise.all([
        profileService.getProfile().catch(() => ({})),
        bookingService.getMyBookings().catch(() => []),
      ]);
        // A signed-in user without a verified phone (social sign-in) must verify it
        // first; this also catches the app being reopened on the OTP page.
        if (prof?.isPhoneVerified === false) {
          (navigation.getParent() ?? navigation).reset({ index: 0, routes: [{ name: 'Login', params: { verifyPhone: true } }] });
          return;
        }
      if (prof.name) { const first = prof.name.trim().split(/\s+/)[0]; setUserName(first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()); }
      setBalance(prof.karmaCoins || prof.coins || 0);
      if (Array.isArray(orders)) {
        setPickupDays(orders.filter((o: any) => o.status !== 'CANCELLED' && o.createdAt).map((o: any) => getLocalDateStr(new Date(o.createdAt))));
        setTotalPickups(orders.filter((o: any) => o.status === 'COMPLETED').length);
        setRecentOrders(orders.slice(0, 6).map((o: any) => {
          let st = 'Scheduled';
          if (o.status === 'COMPLETED') st = 'Completed';
          if (o.status === 'IN_TRANSIT' || o.status === 'ACCEPTED') st = 'In Transit';
          if (o.status === 'CANCELLED') st = 'Cancelled';
          const cat = o.categories?.[0]?.subCategory || o.categories?.[0]?.category || 'Mixed items';
          const date = new Date(o.pickupDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
          return { id: `#${(o._id || o.id || '').substring(0, 8).toUpperCase()}`, type: cat, date, status: st, credits: bookingCoins(o), raw: o };
        }));
      }
    };
    const loadQuiz = async () => {
      const token = await getToken();
      const sfx = getStableUserSuffix(token);
      const today = getLocalDateStr();
      const yest = getLocalYesterdayStr();
      setUserSuffix(sfx);
      const showQuiz = ({ days, streak }: QuizDays) => { setQuizDays(days); setQuizStreak(streak); };
      showQuiz(await loadQuizDays(sfx, false));
      loadQuizDays(sfx).then(showQuiz).catch(() => {});

      // Day streak from the backend (same as the wallet); the on-device count is only a fallback.
      const live = streakService.getStatus().catch(() => null);
      const [lad, ds] = await Promise.all([AsyncStorage.getItem(`lastActiveDate_${sfx}`), AsyncStorage.getItem(`dayStreak_${sfx}`)]);
      let dayStreak: number;
      if (lad === today) dayStreak = Number(ds) || 1;
      else if (lad === yest) dayStreak = (Number(ds) || 0) + 1;
      else dayStreak = 1;
      await AsyncStorage.multiSet([[`lastActiveDate_${sfx}`, today], [`dayStreak_${sfx}`, String(dayStreak)]]);
      const status = await live;
      setStreak(status ? status.currentStreak : dayStreak);
    };
    const unsub = navigation.addListener('focus', () => { load(); loadQuiz(); });
    load(); loadQuiz();

    (async () => {
      // Home redirects a user without a verified phone to the OTP page; don't start
      // its pop-ups (redeem info, tour, greetings) over that page.
      if ((await profileService.getProfile().catch(() => null))?.isPhoneVerified === false) return;
      const token = await getToken();
      const sfx = getStableUserSuffix(token);
      // A first-ever visit already gets the redeem info popup; the Diwali greeting
      // waits for the next visit rather than stacking on top of it.
      const returning = !!(await AsyncStorage.getItem(`firstHomeRedeemInfo_${sfx}`));
      showRedeemInfoOnce(`firstHomeRedeemInfo_${sfx}`);
      if (isDiwaliSeason() && returning && !(await AsyncStorage.getItem(`diwaliGreeting2026_${sfx}`))) {
        await AsyncStorage.setItem(`diwaliGreeting2026_${sfx}`, '1');
        setTimeout(() => setShowDiwaliGreeting(true), 1200);
      }

      if (isLaunchDay()) {
        const suffix = getStableUserSuffix(token);
        const todayStr = getLocalDateStr();
        const key = `launchDayConfettiSeen_${suffix}`;
        const lastSeen = await AsyncStorage.getItem(key);
        if (lastSeen !== todayStr) {
          setShowLaunchPopup(true);
          await AsyncStorage.setItem(key, todayStr);
        }
      }
    })();

    return unsub;
  }, [navigation]);

  const nav = (screen: string, p?: any) => navigation.navigate(screen, p);

  return (
    <View style={[{ flex: 1 }, diwali && { backgroundColor: colors.bg }]}>
    {diwali && <DiwaliBackdrop dark={isDark} />}
    <ScrollView style={[z.root, diwali && { backgroundColor: 'transparent' }]} showsVerticalScrollIndicator={false}>

      {/* ════════ HERO ════════ */}
      <LinearGradient colors={['#052e16', '#064e3b', '#0f766e']} style={[z.hero, diwali && { paddingTop: 44, paddingBottom: 76 }]}>
        <View style={z.heroDecor1} />
        <View style={z.heroDecor2} />
        {/* Below 768 there's no top navbar to hang the lights from (see AppTopBar). */}
        {diwali && width < 768 && <DiwaliLights />}
        {diwali && (width < 768 || width >= 1360) && <DiwaliKandils wide={width >= 1360} variant="dashboard" />}
        {diwali && <DiwaliEmbers count={isMobile ? 6 : 12} />}
        {diwali && <DiwaliDiyas count={isMobile ? 5 : 9} />}
        <View style={[z.container, { paddingHorizontal: pad }]}>

          {/* Hero content */}
          <View style={[z.heroGrid, isMobile && { flexDirection: 'column', gap: 20, alignItems: 'stretch' }]}>
            {/* Left: Greeting + Balance */}
            <View style={z.heroLeft}>
              <Text style={z.heroGreet}>{diwali ? <DiwaliShimmerText text="Happy Diwali" /> : getGreeting()},</Text>
              <Text style={[z.heroName, isMobile && { fontSize: 20 }]}>{userName || '...'}</Text>
              <View style={[z.heroBalance, diwali && { gap: 28 }]}>
                <View style={z.heroCoinGlow}>
                  {diwali && <DiwaliCoinRangoli size={isMobile ? 84 : 100} />}
                  <KarmaCoin size={isMobile ? 52 : 64} glow animated />
                </View>
                <View>
                  <Text style={[z.heroBalNum, isMobile && { fontSize: 32 }]}>{shownBalance.toLocaleString()}</Text>
                  {balanceBurst && <DiwaliBurst />}
                  <Text style={z.heroBalLabel}>KarmaCoins XP</Text>
                </View>
              </View>
              <View style={[z.redeemBanner, { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, isMobile ? { maxWidth: '100%' } : { maxWidth: 420 }]}>
                <KarmaCoin size={18} />
                <Text style={[z.redeemBannerText, { flex: 1 }]}>{REDEEM_INFO_MESSAGE}</Text>
              </View>
            </View>

            {/* Stats grid */}
            {isMobile ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {[
                  { icon: Coins, color: '#4ade80', val: balance.toLocaleString(), label: 'Total Karma Coins' },
                  { icon: Flame, color: '#fb923c', val: `${streak}`, label: 'Day streak' },
                  { icon: Trophy, color: '#c084fc', val: `${quizStreak}`, label: 'Eco Quiz Streak' },
                  { icon: Package, color: '#22d3ee', val: `${totalPickups}`, label: 'Sustainability Actions' },
                ].map((st, i) => (
                  <View key={i} style={{ width: Math.floor((width - 2 * pad - 8) / 2), backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                    {diwali && <DiwaliGoldBorder delay={i * 1} />}
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
                  { icon: Coins, color: '#4ade80', val: balance.toLocaleString(), label: 'Total Karma Coins' },
                  { icon: Flame, color: '#fb923c', val: `${streak}`, label: 'Day streak' },
                  { icon: Trophy, color: '#c084fc', val: `${quizStreak}`, label: 'Eco Quiz Streak' },
                  { icon: Package, color: '#22d3ee', val: `${totalPickups}`, label: 'Sustainability Actions' },
                ].map((st, i) => (
                  <View key={i} style={z.statCard}>
                    {diwali && <DiwaliGoldBorder delay={i * 1} />}
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

      {/* Welcome bonus banner — shown once, right after claiming on the scratch card */}
      {showWelcomeBonusBanner && (
        <View style={[z.container, { marginTop: 20, paddingHorizontal: pad }]}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setShowWelcomeBonusBanner(false)}>
            <LinearGradient colors={['#166534', '#15803d', '#22c55e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={z.welcomeBonusBanner}>
              <KarmaCoin size={30} />
              <Text style={z.welcomeBonusText}>🎁 Welcome, Early Bird! Your {EARLY_BIRD_COINS.toLocaleString()} Karma Coins have been credited successfully. Schedule your first pickup today and unlock even more rewards, badges, and exclusive partner vouchers.</Text>
              <X size={16} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {diwali && (
        <View style={[z.container, { marginTop: 24, paddingHorizontal: pad, gap: 20 }]}>
          <DiwaliDiyaTracker
            litDays={[...quizDays, ...pickupDays]}
            seenKey={`diwaliDiyasSeen_${userSuffix}`}
            onQuiz={() => nav('Quiz')}
            onPickup={() => nav('SchedulePickup')}
            isMobile={isMobile}
          />
          <DiwaliCleanupCard onPress={() => nav('SchedulePickup')} isMobile={isMobile} />
        </View>
      )}
      {diwali && (
        <DiwaliGreetingModal visible={showDiwaliGreeting} name={userName} pickups={totalPickups} onClose={() => setShowDiwaliGreeting(false)} />
      )}

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
              <Text style={z.actionCardSub}>Turn your clutter into KarmaCoins — sustainable pickup, zero effort, planet-friendly</Text>
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
              <Text style={z.actionCardSub}>Test your green IQ — earn KarmaCoins XP daily</Text>
              <View style={z.actionCardCTA}>
                <Text style={[z.actionCardCTAText, { color: '#c084fc' }]}>Play now</Text>
                <ArrowRight size={14} color="#c084fc" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* ════════ REFER BANNER ════════ */}
      <View style={[z.container, { marginTop: 28, paddingHorizontal: pad }]}>
        <LinearGradient colors={['#4338ca', '#7c3aed', '#db2777']} style={[z.referBanner, isMobile && { flexDirection: 'column', gap: 16, padding: 20 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={z.referBannerDecor} />
          <View style={{ flex: isMobile ? undefined : 1, zIndex: 1 }}>
            <Text style={[z.referTitle, isMobile && { fontSize: 18 }]}>Invite friends, earn together</Text>
            <Text style={z.referSub}>Share your referral code. When a friend signs up with it and verifies their phone number, you both get 1,000 bonus KarmaCoins XP</Text>
          </View>
          <TouchableOpacity style={z.referBtn} onPress={() => nav('Referral')}>
            <Users size={18} color="#422006" />
            <Text style={z.referBtnText}>Refer now</Text>
          </TouchableOpacity>
        </LinearGradient>
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
            const Icon = f.icon || Package;
            const cardW = isMobile ? Math.floor((width - 2 * pad - 10) / 2) : undefined;
            return (
              <TouchableOpacity
                key={f.id}
                style={[z.discoverCard, cardW ? { width: cardW } : undefined]}
                activeOpacity={0.85}
                onPress={() => (f.id === 'knowledge' ? nav('KnowledgeHub') : (f as any).route ? nav((f as any).route) : setSelectedFeature(f))}
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
            <Package size={44} color={colors.border} />
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
                    <Text style={z.orderCoinsText}>{order.credits == null ? '—' : `${formatBookingCoins(order.credits)} coins`}</Text>
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
                <TouchableOpacity key={i} style={[z.ordersRow, i % 2 === 0 && { backgroundColor: colors.surfaceAlt }]} onPress={() => nav('BookingDetails', { booking: order.raw })} activeOpacity={0.7}>
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
                  <Text style={[z.orderCoinsText, { flex: 1, textAlign: 'right' }]}>{formatBookingCoins(order.credits)}</Text>
                  <ChevronRight size={14} color={colors.borderStrong} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
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

    {showLaunchPopup && <LaunchDayPopup onClose={() => setShowLaunchPopup(false)} />}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bg },
  container: { maxWidth: MAX, width: '100%', alignSelf: 'center', paddingHorizontal: 32 },

  // Hero — compact
  hero: { paddingTop: 24, paddingBottom: 28, position: 'relative', overflow: 'hidden', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
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
  actionCardGrad: { flex: 1, padding: 22, minHeight: 160, justifyContent: 'space-between', position: 'relative', overflow: 'hidden' },
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
  sectionTitle: { fontSize: 20, fontWeight: '900', color: c.text, letterSpacing: -0.3 },
  viewAll: { color: '#16a34a', fontWeight: '700', fontSize: 14 },

  // Discover
  discoverRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  discoverCard: { width: '31.5%', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  discoverCardInner: { padding: 18, minHeight: 150, justifyContent: 'space-between', position: 'relative', overflow: 'hidden' },
  discoverCardDecor: { position: 'absolute', top: -15, right: -15, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.08)' },
  discoverIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  discoverCardTitle: { color: 'white', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  discoverCardDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500', lineHeight: 16 },
  discoverCardArrow: { position: 'absolute', bottom: 16, right: 16, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  // Orders table
  ordersTable: { backgroundColor: c.surface, borderRadius: 20, overflow: 'hidden', shadowColor: c.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: c.border },
  ordersHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: c.surfaceAlt, borderBottomWidth: 1, borderBottomColor: c.border },
  ordersHeadText: { fontSize: 11, fontWeight: '800', color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 },
  ordersRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.border },
  ordersCell: {},
  ordersCellText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  orderDot: { width: 32, height: 32, borderRadius: 10, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  orderItemText: { fontSize: 14, fontWeight: '700', color: c.text },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusPillText: { fontSize: 11, fontWeight: '800' },
  orderCoinsText: { fontSize: 14, fontWeight: '800', color: '#16a34a' },

  mobileOrderCard: { backgroundColor: c.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.border, shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  emptyOrders: { backgroundColor: c.surface, borderRadius: 20, padding: 50, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: c.border },
  emptyText: { color: c.textFaint, fontSize: 15, fontWeight: '600' },
  emptyBtn: { backgroundColor: '#15803d', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, marginTop: 8 },
  emptyBtnText: { color: 'white', fontWeight: '800', fontSize: 14 },

  // Refer banner
  referBanner: { borderRadius: 24, padding: 32, flexDirection: 'row', alignItems: 'center', gap: 32, overflow: 'hidden', position: 'relative' },
  referBannerDecor: { position: 'absolute', top: -40, right: 100, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.1)' },
  referTitle: { color: 'white', fontSize: 22, fontWeight: '900', marginBottom: 8 },
  referSub: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '500', lineHeight: 22 },
  referBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#facc15', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, flexShrink: 0 },
  referBtnText: { color: '#422006', fontWeight: '900', fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 460, backgroundColor: c.surface, borderRadius: 24, overflow: 'hidden', shadowColor: c.shadow, shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 40, elevation: 20 },
  modalHeader: { padding: 28, paddingTop: 32, position: 'relative', overflow: 'hidden' },
  modalHeaderDecor: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)' },
  modalCloseBtn: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  modalEmoji: { fontSize: 40, marginBottom: 12 },
  modalTitle: { color: 'white', fontSize: 24, fontWeight: '900', marginBottom: 8, letterSpacing: -0.5 },
  modalDesc: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '500', lineHeight: 22 },
  modalBody: { padding: 28 },
  modalStepsTitle: { fontSize: 14, fontWeight: '800', color: c.text, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  modalStep: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  modalStepNum: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalStepNumText: { fontSize: 14, fontWeight: '900' },
  modalStepText: { fontSize: 15, fontWeight: '600', color: c.textMuted, flex: 1 },
  modalBenefit: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, padding: 14, borderRadius: 14, borderWidth: 1 },
  modalBenefitText: { fontSize: 14, fontWeight: '800' },

  // Welcome bonus banner
  welcomeBonusBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, padding: 16 },
  welcomeBonusText: { flex: 1, color: 'white', fontSize: 13, fontWeight: '700', lineHeight: 19 },

  // Featured rewards
  rewardCard: { width: 150, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  rewardCardInner: { padding: 16, minHeight: 130, justifyContent: 'center' },
  rewardCardEmoji: { fontSize: 30, marginBottom: 10 },
  rewardCardBrand: { color: 'white', fontSize: 14, fontWeight: '900', marginBottom: 3 },
  rewardCardLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600', lineHeight: 15 },
  firstPickupCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#15803d', borderRadius: 16, paddingVertical: 16, marginTop: 18 },
  firstPickupCtaText: { color: 'white', fontSize: 15, fontWeight: '900' },
}));
