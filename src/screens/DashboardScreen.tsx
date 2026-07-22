import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Animated, Dimensions, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, ChevronRight, Truck, Camera, Clock, Users, Package, Flame, Gamepad2, Gift, Star, ShieldCheck, Coins, BadgeCheck, ArrowRight, BookOpen, X, WifiOff, RefreshCw } from 'lucide-react-native';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { QuizCalendarModal } from '../components/shared/QuizCalendarModal';
import { NotificationPanel } from '../components/shared/NotificationPanel';
import { useNotifications } from '../context/NotificationContext';
import { profileService } from '../services/profile';
import { getLocalDateStr, getLocalYesterdayStr } from '../utils/quizDate';
import { bookingService } from '../services/booking';
import { BACKEND_BASE } from '../services/api';
import { REDEEM_INFO_MESSAGE, showRedeemInfoOnce } from '../utils/redeemInfo';
import { getStableUserSuffix } from '../utils/userId';

const STATUS_COLOR: any = {
  Completed: { bg: "rgba(22,163,74,0.1)", text: "#16a34a", dot: "#16a34a" },
  "In Transit": { bg: "rgba(245,158,11,0.1)", text: "#d97706", dot: "#f59e0b" },
};

const CARD_WIDTH = Math.round(Dimensions.get('window').width * 0.42);

const FEATURES = [
  {
    id: 'pickup',
    emoji: '🚛',
    tag: 'STEP 1',
    title: 'Schedule a pickup',
    desc: 'Book a doorstep pickup for your recyclable waste in just 3 taps. We collect plastic, metal, paper, e-waste & more.',
    benefit: 'Earn Credits on Pickup',
    benefitIcon: <Coins size={16} color="#f59e0b" />,
    bg: ['#064e3b', '#065f46'] as [string, string],
    accent: '#4ade80',
    steps: ['Select waste type', 'Choose time slot', 'Earn Credits ✅'],
    navTarget: 'SchedulePickup',
    ctaLabel: 'Schedule now',
  },
  {
    id: 'upload',
    emoji: '📸',
    tag: 'STEP 2',
    title: 'Upload & earn',
    desc: 'Click a photo of your waste. Our AI identifies the type, weight, and credits your account within minutes.',
    benefit: 'Fast & Easy Verification',
    benefitIcon: <BadgeCheck size={16} color="#60a5fa" />,
    bg: ['#1c1917', '#292524'] as [string, string],
    accent: '#60a5fa',
    steps: ['Click photo', 'AI scans waste', 'Credits added 💰'],
  },
  {
    id: 'earn',
    emoji: '🪙',
    tag: 'EARN',
    title: 'KarmaCoins XP',
    desc: 'Every kg of waste you recycle earns you KarmaCoins XP. Keep your streaks up for even more rewards!',
    benefit: 'Reward for Every kg',
    benefitIcon: <Star size={16} color="#fbbf24" fill="#fbbf24" />,
    bg: ['#312e81', '#4338ca'] as [string, string],
    accent: '#a78bfa',
    steps: ['Recycle waste', 'Maintain streak 🔥', 'Get rewarded'],
    navTarget: 'Wallet',
    ctaLabel: 'View my wallet',
  },
  {
    id: 'redeem',
    emoji: '🎁',
    tag: 'REDEEM',
    title: 'Amazing rewards',
    desc: 'Use your credits for eco products, vouchers, plant trees, or donate to green causes. Real rewards, real impact.',
    benefit: 'Eco-friendly Goodies',
    benefitIcon: <Gift size={16} color="#f472b6" />,
    bg: ['#831843', '#9d174d'] as [string, string],
    accent: '#f472b6',
    steps: ['Earn credits', 'Open Store 🛍️', 'Redeem & smile'],
    navTarget: 'Store',
    ctaLabel: 'Open store',
  },
  {
    id: 'impact',
    emoji: '🌍',
    tag: 'IMPACT',
    title: 'Your green impact',
    desc: 'See your personal contribution — CO₂ saved, trees equivalent, and your rank among eco heroes in your city.',
    benefit: 'Track Your Journey',
    benefitIcon: <ShieldCheck size={16} color="#34d399" />,
    bg: ['#0c4a6e', '#0369a1'] as [string, string],
    accent: '#38bdf8',
    steps: ['Recycle more', 'Climb ranks 📊', 'Become Eco Hero 🏆'],
    navTarget: 'Profile',
    ctaLabel: 'See my impact',
  },
  {
    id: 'refer',
    emoji: '👥',
    tag: 'REFER',
    title: 'Invite friends',
    desc: 'Share your referral code. When your friend makes their first pickup, you both get bonus KarmaCoins XP!',
    benefit: 'Bonus for Every Friend',
    benefitIcon: <Coins size={16} color="#fb923c" />,
    bg: ['#134e4a', '#0f766e'] as [string, string],
    accent: '#2dd4bf',
    steps: ['Share code', 'Friend joins 🤝', 'Both get rewards!'],
    navTarget: 'Referral',
    ctaLabel: 'Invite friends',
  },
];

function FeatureCard({ feature, onPress }: { feature: typeof FEATURES[0], onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <LinearGradient colors={feature.bg} style={[styles.featureCard, { width: CARD_WIDTH }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.featureTagRow}>
          <View style={[styles.featureTag, { backgroundColor: feature.accent + '30', borderColor: feature.accent + '60' }]}>
            <Text style={[styles.featureTagText, { color: feature.accent }]}>{feature.tag}</Text>
          </View>
        </View>

        <Text style={styles.featureEmoji}>{feature.emoji}</Text>
        <Text style={styles.featureTitle} numberOfLines={2}>{feature.title}</Text>
        
        <View style={styles.featureActionRow}>
          <Text style={[styles.featureActionText, { color: feature.accent }]}>Learn more</Text>
          <ArrowRight size={12} color={feature.accent} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}


function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardScreen({ navigation }: any) {
  const [userName, setUserName] = useState('Loading...');
  const [balance, setBalance] = useState(0);
  const [streak, setStreak] = useState(0);
  const [quizStreak, setQuizStreak] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const offlineAnim = useRef(new Animated.Value(0)).current;
  const [quizHistory, setQuizHistory] = useState<string[]>([]);
  const [showQuizCalendar, setShowQuizCalendar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<typeof FEATURES[0] | null>(null);
  const [quizPlayedToday, setQuizPlayedToday] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [profileData, ordersData] = await Promise.all([
          profileService.getProfile().catch(() => ({})),
          bookingService.getMyBookings().catch(() => [])
        ]);

        if (profileData.name) setUserName(
          profileData.name
            .split(' ')
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ')
        );
        setBalance(profileData.karmaCoins || profileData.coins || 0);
        setStreak(profileData.streak || profileData.activeStreak || 0);

        if (ordersData && Array.isArray(ordersData)) {
          const formattedOrders = ordersData.slice(0, 2).map((order: any) => {
            let uiStatus = 'Scheduled';
            if (order.status === 'COMPLETED') uiStatus = 'Completed';
            if (order.status === 'IN_TRANSIT' || order.status === 'ACCEPTED') uiStatus = 'In Transit';

            const dateObj = new Date(order.pickupDate);
            const dateStr = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
            const mainCategory = order.categories?.[0]?.subCategory || order.categories?.[0]?.category || 'Mixed Waste';
            
            const rawId = order._id || order.id || '00000000';
            return {
              id: `#${rawId.substring(0, 8).toUpperCase()}`,
              type: mainCategory,
              date: dateStr,
              status: uiStatus,
              credits: order.totalKarmaCoins || 0
            };
          });
          setRecentOrders(formattedOrders);
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      }
    };
    
    const fetchQuizStreak = async () => {
      const token = await AsyncStorage.getItem('userToken');
      const suffix = getStableUserSuffix(token);
      const [storedDate, storedStreak, storedHistory] = await Promise.all([
        AsyncStorage.getItem(`lastQuizDate_${suffix}`),
        AsyncStorage.getItem(`quizStreak_${suffix}`),
        AsyncStorage.getItem(`quizHistory_${suffix}`),
      ]);
      let history: string[] = storedHistory ? JSON.parse(storedHistory) : [];
      // If history is empty but lastQuizDate exists, seed it (quiz played before history tracking was added)
      if (history.length === 0 && storedDate && /^\d{4}-\d{2}-\d{2}$/.test(storedDate)) {
        history = [storedDate];
        await AsyncStorage.setItem(`quizHistory_${suffix}`, JSON.stringify(history));
      }
      setQuizHistory(history);
      if (!storedDate) { setQuizStreak(0); return; }
      const todayStr = getLocalDateStr();
      const yesterdayStr = getLocalYesterdayStr();
      setQuizPlayedToday(storedDate === todayStr);
      const valid = storedDate === todayStr || storedDate === yesterdayStr;
      if (!valid) {
        await AsyncStorage.setItem(`quizStreak_${suffix}`, '0');
        setQuizStreak(0);
      } else {
        setQuizStreak(Number(storedStreak) || 0);
      }
    };

    const unsubscribe = navigation.addListener('focus', () => {
      fetchDashboardData();
      fetchQuizStreak();
    });
    fetchDashboardData();
    fetchQuizStreak();

    (async () => {
      const token = await AsyncStorage.getItem('userToken');
      showRedeemInfoOnce(`firstHomeRedeemInfo_${getStableUserSuffix(token)}`);
    })();

    return unsubscribe;
  }, [navigation]);

  // Network connectivity check
  const isOfflineRef = useRef(false);
  useEffect(() => {
    const setOnline = () => {
      if (isOfflineRef.current) {
        isOfflineRef.current = false;
        Animated.timing(offlineAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setIsOffline(false));
      }
    };
    const setOffline = () => {
      if (!isOfflineRef.current) {
        isOfflineRef.current = true;
        setIsOffline(true);
        Animated.timing(offlineAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      }
    };

    if (Platform.OS === 'web') {
      if (!navigator.onLine) setOffline();
      window.addEventListener('online', setOnline);
      window.addEventListener('offline', setOffline);
      return () => {
        window.removeEventListener('online', setOnline);
        window.removeEventListener('offline', setOffline);
      };
    } else {
      const checkNet = () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        fetch(`${BACKEND_BASE}/`, { method: 'HEAD', cache: 'no-store', signal: controller.signal })
          .then(() => { clearTimeout(timer); setOnline(); })
          .catch(() => { clearTimeout(timer); setOffline(); });
      };
      checkNet();
      const interval = setInterval(checkNet, 8000);
      return () => clearInterval(interval);
    }
  }, []);

  const nextReward = Math.max(1290, balance + (50 - (balance % 50 || 50)));
  const progress = balance % 50 === 0 && balance > 0 ? 100 : (balance % 50) * 2;

  return (
    <View style={{ flex: 1, backgroundColor: '#f0fdf6' }}>

    {/* Offline banner */}
    {isOffline && (
      <Animated.View style={[styles.offlineBanner, { opacity: offlineAnim, transform: [{ translateY: offlineAnim.interpolate({ inputRange: [0, 1], outputRange: [-48, 0] }) }] }]}>
        <WifiOff size={15} color="white" />
        <Text style={styles.offlineText}>No internet connection</Text>
        <TouchableOpacity onPress={() => {
          fetch(`${BACKEND_BASE}/`, { method: 'HEAD', cache: 'no-store' })
            .then(() => { setIsOffline(false); })
            .catch(() => {});
        }}>
          <RefreshCw size={14} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </Animated.View>
    )}

    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      {/* Green Header */}
      <LinearGradient colors={['#052e16', '#166534', '#15803d']} style={styles.header}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.userInfo}>
            <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.avatarText}>{userName !== 'Loading...' ? (userName.charAt(0) + (userName.split(' ')[1]?.[0] || '')) : 'RS'}</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.greetingText}>{getGreeting()},</Text>
              <Text style={styles.nameText}>{userName.split(' ')[0]} 👋</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={styles.streakBadge} onPress={() => setShowQuizCalendar(true)} activeOpacity={0.75}>
              <Flame size={16} color="#f97316" fill="#f97316" />
              <Text style={styles.streakText}>{quizStreak}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bellButton} onPress={() => setShowNotifications(true)}>
              <Bell size={20} color="white" />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* KarmaCoins XP card */}
        <View style={styles.creditsCard}>
          <View style={styles.creditsHeader}>
            <Text style={styles.creditsLabel}>KarmaCoins XP balance</Text>
            <TouchableOpacity style={styles.walletLink} onPress={() => navigation.navigate('Wallet')}>
              <Text style={styles.walletLinkText}>Wallet</Text>
              <ChevronRight size={14} color="#86efac" />
            </TouchableOpacity>
          </View>
          <View style={styles.balanceRow}>
            <KarmaCoin size={44} glow />
            <Text style={styles.balanceText}>{balance.toLocaleString()}</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressLabel}>{nextReward - balance} coins to next reward</Text>
              <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={['#4ade80', '#86efac']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progress}%` }]}
              />
            </View>
          </View>

          {/* Redeem info banner */}
          <View style={styles.redeemBanner}>
            <Text style={styles.redeemBannerText}>{REDEEM_INFO_MESSAGE}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Impact Cards */}
      {/* Feature Discovery — Swipeable Cards */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Discover the feature ✨</Text>
          <Text style={styles.discoverSub}>Swipe to explore →</Text>
        </View>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + 16}
          snapToAlignment="start"
          contentContainerStyle={{ paddingHorizontal: 4, gap: 16, paddingBottom: 8 }}
        >
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} onPress={() => setSelectedFeature(feature)} />
          ))}
        </ScrollView>
      </View>

      {/* Daily Eco-Quiz Banner */}
      <View style={styles.section}>
        <LinearGradient colors={['#065f46', '#047857']} style={styles.quizCard} start={{x:0, y:0}} end={{x:1,y:1}}>
          <View style={styles.quizContent}>
            <View style={styles.quizIconBg}>
              <Gamepad2 size={24} color="#fbbf24" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quizTitle}>Daily eco-quiz 🧠</Text>
              <Text style={styles.quizSub}>Test your green IQ. Earn KarmaCoins XP daily.</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.quizBtn} onPress={() => navigation.navigate('Quiz')}>
            <Text style={styles.quizBtnText}>Play now</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Smart Quick Actions — context-aware based on user state */}
      {(() => {
        const hasActiveOrder = recentOrders.some(o => o.status === 'In Transit' || o.status === 'Scheduled');
        type ActionConfig = { id: string; label: string; IconComp: any; color: string; bg: string; iconBg: string; navTarget: string; badge?: string };
        const picked: ActionConfig[] = [];

        if (!quizPlayedToday) picked.push({ id: 'quiz', label: "Today's\nquiz", IconComp: Gamepad2, color: '#d97706', bg: '#fffbeb', iconBg: 'rgba(217,119,6,0.1)', navTarget: 'Quiz', badge: '🔥 New' });
        if (hasActiveOrder) picked.push({ id: 'track', label: 'Track\npickup', IconComp: Truck, color: '#0891b2', bg: '#f0f9ff', iconBg: 'rgba(8,145,178,0.1)', navTarget: 'Orders', badge: '● Live' });
        if (balance >= 1000) picked.push({ id: 'redeem', label: 'Redeem\nrewards', IconComp: Gift, color: '#db2777', bg: '#fdf2f8', iconBg: 'rgba(219,39,119,0.1)', navTarget: 'Store' });

        const defaults: ActionConfig[] = [
          { id: 'pickup',  label: 'Schedule\npickup', IconComp: Truck,  color: '#16a34a', bg: '#f0fdf4', iconBg: 'rgba(22,163,74,0.1)',    navTarget: 'SchedulePickup' },
          { id: 'refer',   label: 'Refer\n& earn',    IconComp: Users,  color: '#db2777', bg: '#fdf2f8', iconBg: 'rgba(219,39,119,0.1)',   navTarget: 'Referral' },
          { id: 'orders',  label: 'My\norders',       IconComp: Clock,  color: '#7c3aed', bg: '#faf5ff', iconBg: 'rgba(124,58,237,0.1)',   navTarget: 'Orders' },
          { id: 'wallet',  label: 'My\nwallet',       IconComp: Coins,  color: '#d97706', bg: '#fffbeb', iconBg: 'rgba(217,119,6,0.1)',    navTarget: 'Wallet' },
          { id: 'quiz_d',  label: "Today's\nquiz",    IconComp: Gamepad2, color: '#d97706', bg: '#fffbeb', iconBg: 'rgba(217,119,6,0.1)', navTarget: 'Quiz' },
        ];
        for (const def of defaults) {
          if (picked.length >= 4) break;
          if (!picked.find(a => a.id === def.id && a.id !== 'quiz_d')) picked.push(def);
        }
        const actions = picked.slice(0, 4);

        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick actions</Text>
            <View style={styles.actionsGrid}>
              {actions.map((action) => (
                <TouchableOpacity key={action.id} style={[styles.actionBtn, { backgroundColor: action.bg }]} onPress={() => navigation.navigate(action.navTarget)}>
                  {action.badge && (
                    <View style={styles.actionBadge}>
                      <Text style={styles.actionBadgeText}>{action.badge}</Text>
                    </View>
                  )}
                  <View style={[styles.actionIconBg, { backgroundColor: action.iconBg }]}>
                    <action.IconComp size={20} color={action.color} />
                  </View>
                  <Text style={styles.actionText}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })()}

      {/* Recent Orders */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Recent orders</Text>
          <TouchableOpacity style={styles.seeAllBtn} onPress={() => navigation.navigate('Orders')}>
            <Text style={styles.seeAllText}>See all</Text>
            <ChevronRight size={14} color="#16a34a" />
          </TouchableOpacity>
        </View>
        <View style={styles.ordersList}>
          {recentOrders.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#9ca3af' }}>No recent orders.</Text>
            </View>
          ) : recentOrders.map((order) => {
            const sc = STATUS_COLOR[order.status] || STATUS_COLOR['Completed'];
            return (
              <TouchableOpacity key={order.id} style={styles.orderCard} activeOpacity={0.7}
                onPress={() => navigation.navigate('Orders')}>
                <View style={styles.orderIconBg}>
                  <Package size={18} color="#16a34a" />
                </View>
                <View style={styles.orderContent}>
                  <View style={styles.orderRowJustify}>
                    <Text style={styles.orderTitle}>{order.type}</Text>
                    <View style={[styles.orderStatusBadge, { backgroundColor: sc.bg }]}>
                      <View style={[styles.orderStatusDot, { backgroundColor: sc.dot }]} />
                      <Text style={[styles.orderStatusText, { color: sc.text }]}>{order.status}</Text>
                    </View>
                  </View>
                  <View style={styles.orderRowJustify}>
                    <Text style={styles.orderSub}>{order.id} • {order.date}</Text>
                    <View style={styles.orderCreditsBadge}>
                      <KarmaCoin size={14} />
                      <Text style={styles.orderCreditsText}>+{order.credits}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Knowledge Hub (LinkedIn Articles) */}
      <View style={[styles.section, { marginBottom: 40 }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Knowledge hub</Text>
          <TouchableOpacity style={styles.seeAllBtn} onPress={() => navigation.navigate('KnowledgeHub')}>
            <Text style={styles.seeAllText}>More articles</Text>
            <ChevronRight size={14} color="#16a34a" />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
          <TouchableOpacity style={styles.articleCard} activeOpacity={0.8} onPress={() => navigation.navigate('ArticleDetail', { id: 'cut-plastic-at-home' })}>
            <View style={[styles.articleImgPlaceholder, { backgroundColor: '#dcfce7' }]}><BookOpen size={28} color="#16a34a" /></View>
            <Text style={styles.articleTitle}>5 easy ways to cut plastic waste at home</Text>
            <Text style={styles.articleSource}>KarmaVerse editorial</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.articleCard} activeOpacity={0.8} onPress={() => navigation.navigate('ArticleDetail', { id: 'india-ewaste' })}>
            <View style={[styles.articleImgPlaceholder, { backgroundColor: '#e0f2fe' }]}><BookOpen size={28} color="#0284c7" /></View>
            <Text style={styles.articleTitle}>India's e-waste mountain — and the opportunity inside it</Text>
            <Text style={styles.articleSource}>KarmaVerse editorial</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Feature Details Modal */}
      <Modal visible={!!selectedFeature} transparent animationType="slide" onRequestClose={() => setSelectedFeature(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedFeature(null)} />
          {selectedFeature && (
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalEmoji}>{selectedFeature.emoji}</Text>
                  <Text style={styles.modalTitle}>{selectedFeature.title}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedFeature(null)} style={styles.closeBtn}>
                  <X size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDesc}>{selectedFeature.desc}</Text>

              <View style={styles.modalStepsContainer}>
                {selectedFeature.steps.map((step, index) => (
                  <View key={index} style={styles.modalStepRow}>
                    <View style={[styles.stepCircle, { backgroundColor: selectedFeature.accent + '20' }]}>
                      <Text style={{ color: selectedFeature.accent, fontWeight: '900' }}>{index + 1}</Text>
                    </View>
                    <Text style={styles.modalStepText}>{step}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.modalBenefit, { backgroundColor: selectedFeature.accent + '15', borderColor: selectedFeature.accent + '30' }]}>
                {selectedFeature.benefitIcon}
                <Text style={[styles.modalBenefitText, { color: selectedFeature.accent }]}>{selectedFeature.benefit}</Text>
              </View>

              {(selectedFeature as any).navTarget && (
                <TouchableOpacity
                  style={[styles.modalCta, { backgroundColor: selectedFeature.accent }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedFeature(null);
                    navigation.navigate((selectedFeature as any).navTarget);
                  }}
                >
                  <Text style={styles.modalCtaText}>{(selectedFeature as any).ctaLabel || 'Open'}</Text>
                  <ArrowRight size={16} color="white" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </Modal>

    </ScrollView>

    <QuizCalendarModal
      visible={showQuizCalendar}
      onClose={() => setShowQuizCalendar(false)}
      playedDates={quizHistory}
      streak={quizStreak}
    />

    <NotificationPanel
      visible={showNotifications}
      onClose={() => setShowNotifications(false)}
      notifications={notifications}
      unreadCount={unreadCount}
      onMarkRead={markRead}
      onMarkAllRead={markAllRead}
      onClearAll={clearAll}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf6' },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ef4444', paddingVertical: 10, paddingHorizontal: 16, zIndex: 99 },
  offlineText: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '700', color: 'white' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: 'white', fontWeight: 'bold' },
  greetingText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500' },
  nameText: { color: 'white', fontSize: 16, fontWeight: '700' },
  bellButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#ef4444', borderWidth: 2, borderColor: '#052e16', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  bellBadgeText: { fontSize: 10, fontWeight: '800', color: 'white' },
  creditsCard: { borderRadius: 24, padding: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  creditsHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  creditsLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', letterSpacing: 1 },
  walletLink: { flexDirection: 'row', alignItems: 'center' },
  walletLinkText: { fontSize: 12, color: '#86efac', fontWeight: '600' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  balanceText: { fontSize: 42, color: 'white', fontWeight: '800' },
  progressContainer: { gap: 6 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  progressPercent: { fontSize: 11, color: '#86efac', fontWeight: 'bold' },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  redeemBanner: { marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  redeemBannerText: { color: 'rgba(255,255,255,0.75)', fontSize: 11.5, fontWeight: '600', lineHeight: 16 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center' },
  seeAllText: { fontSize: 12, color: '#16a34a', fontWeight: '600' },
  actionsGrid: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  actionBtn: { flex: 1, padding: 12, borderRadius: 16, alignItems: 'center', gap: 8, position: 'relative' },
  actionIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 10, color: '#374151', fontWeight: '600', textAlign: 'center' },
  actionBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#16a34a', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  actionBadgeText: { color: 'white', fontSize: 8, fontWeight: '800' },
  impactGrid: { flexDirection: 'row', gap: 12 },
  impactCard: { flex: 1, padding: 16, borderRadius: 16, elevation: 1 },
  impactCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  impactIconWrapper: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  impactValue: { fontSize: 20, fontWeight: '800', color: '#111827' },
  impactLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  impactSub: { fontSize: 10, fontWeight: '500', color: '#9ca3af', marginTop: 2 },
  ordersList: { gap: 12 },
  orderCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: 'white', borderRadius: 16, elevation: 2 },
  orderIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  orderContent: { flex: 1 },
  orderRowJustify: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  orderTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  orderStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  orderStatusDot: { width: 6, height: 6, borderRadius: 3 },
  orderStatusText: { fontSize: 11, fontWeight: '600' },
  orderSub: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  orderCreditsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  orderCreditsText: { fontSize: 13, color: '#d97706', fontWeight: '700' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, borderRadius: 20, gap: 4 },
  streakText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  quizCard: { borderRadius: 24, padding: 20, elevation: 6, shadowColor: '#047857', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.3, shadowRadius: 10, borderWidth: 1, borderColor: '#10b981' },
  quizContent: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  quizIconBg: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  quizTitle: { fontSize: 18, fontWeight: '900', color: 'white', marginBottom: 4 },
  quizSub: { fontSize: 13, color: '#a7f3d0', fontWeight: '600', lineHeight: 18 },
  quizBtn: { backgroundColor: '#fbbf24', paddingVertical: 14, borderRadius: 16, alignItems: 'center', shadowColor: '#f59e0b', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  quizBtnText: { color: '#78350f', fontSize: 15, fontWeight: '900' },
  quizStreakRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
  quizStreakLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quizStreakCount: { fontSize: 18, fontWeight: '900', color: 'white' },
  quizStreakLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  quizStreakTap: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  articleCard: { width: 220, backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', elevation: 2 },
  articleImgPlaceholder: { height: 120, width: '100%', alignItems: 'center', justifyContent: 'center' },
  articleTitle: { padding: 12, fontSize: 14, fontWeight: '700', color: '#111827', paddingBottom: 4 },
  articleSource: { paddingHorizontal: 12, paddingBottom: 12, fontSize: 11, color: '#6b7280', fontWeight: '500' },
  discoverSub: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },

  // Feature Discovery Card Styles
  featureCard: { borderRadius: 24, padding: 20, height: 180, justifyContent: 'space-between', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  featureTagRow: { marginBottom: 14 },
  featureTag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  featureTagText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  featureEmoji: { fontSize: 44, marginBottom: 10 },
  featureTitle: { fontSize: 20, fontWeight: '900', color: 'white', marginBottom: 10, letterSpacing: -0.3 },
  featureDesc: { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 20, fontWeight: '500', marginBottom: 18 },
  featureActionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 'auto' },
  featureActionText: { fontSize: 11, fontWeight: '800' },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalEmoji: { fontSize: 40, marginBottom: 8 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#111827', letterSpacing: -0.5 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  modalDesc: { fontSize: 15, color: '#4b5563', lineHeight: 24, marginBottom: 24 },
  modalStepsContainer: { gap: 16, marginBottom: 32 },
  modalStepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalStepText: { fontSize: 15, fontWeight: '600', color: '#374151', flex: 1 },
  modalBenefit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 16, borderWidth: 1 },
  modalBenefitText: { fontSize: 15, fontWeight: '800' },
  modalCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 14, borderRadius: 100 },
  modalCtaText: { color: 'white', fontWeight: '900', fontSize: 15 },
});
