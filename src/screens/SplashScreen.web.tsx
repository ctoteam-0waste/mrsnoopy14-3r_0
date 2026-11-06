import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Image, Linking, NativeSyntheticEvent, NativeScrollEvent
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Truck, Gift, Shield,
  Recycle, Users, Coins, ArrowRight,
  BookOpen, Mail, MapPin, Phone,
  Sprout, Trophy, Flame, Brain, Building2,
  Target, GraduationCap,
  HeartHandshake, Home as HomeIcon, Store, Megaphone,
  Instagram, Facebook, Linkedin, Twitter, Youtube,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { MascotPopupBanner } from '../components/shared/MascotPopupBanner';
import { LaunchDayBanner } from '../components/shared/LaunchDayBanner';
import { GooglePlayLogo } from '../components/shared/StoreLogos';
import { NewsCard } from '../components/shared/NewsCard';
import { NEWSLETTERS } from '../data/newsletters';
import { NewsletterStrip } from '../components/shared/NewsletterCard';
import { NEWS } from '../data/news';
import { LaunchConfetti } from '../components/shared/LaunchConfetti';
import { CoinShower } from '../components/shared/CoinShower';
import { EarlyBirdPopup } from '../components/shared/EarlyBirdPopup';
import { isLaunchDay } from '../utils/launchDay';
import { getLocalDateStr } from '../utils/quizDate';
import { isDiwaliSeason } from '../utils/festive';
import {
  DiwaliLights, DiwaliDiyas, DiwaliEmbers, DiwaliSparkles, DiwaliMarigolds, DiwaliRangoli, DiwaliKandils,
  DiwaliCursorSparks, DiwaliShimmerText, DiwaliCleanupCard,
} from '../components/festive/Diwali';

const { width: W } = Dimensions.get('window');
const isMobile = W < 768;
const MAX = 1100;

// public/index.html paints a static copy of this hero before the JS bundle loads
// (fixes the landing-page LCP) and sets this flag. When it did, skip the fade-in and
// typewriter so the swap from the static copy to this screen is seamless.
const STATIC_HERO_SHOWN = typeof window !== 'undefined' && !!(window as any).__KV_STATIC_HERO__;

const KARMA_PHRASE = 'Rewards.';
const HEADLINE_TEXT = `Smart Sustainability,\nReal ${KARMA_PHRASE}`;
const KARMA_SPLIT = HEADLINE_TEXT.length - KARMA_PHRASE.length;

// Card used across every grid: fades + slides up the first time it scrolls into
// view (IntersectionObserver, web-only — falls back to already-visible if
// unsupported), and lifts on hover. `delay` staggers siblings in the same grid
// so cards cascade in one after another instead of popping in together.
function Card({ children, style, delay = 0 }: { children: React.ReactNode; style?: any; delay?: number }) {
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<any>(null);
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || !ref.current) { setInView(true); return; }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    Animated.timing(reveal, { toValue: 1, duration: 550, delay, useNativeDriver: true }).start();
  }, [inView]);

  return (
    <Animated.View
      ref={ref}
      // @ts-ignore — web-only pointer events, harmless no-op on native
      onMouseEnter={() => setHovered(true)}
      // @ts-ignore
      onMouseLeave={() => setHovered(false)}
      style={[
        style,
        { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }] },
        hovered && s.hoverLift,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function SplashScreen({ navigation, route }: any) {
  const fadeIn = useRef(new Animated.Value(STATIC_HERO_SHOWN ? 1 : 0)).current;
  const slideUp = useRef(new Animated.Value(STATIC_HERO_SHOWN ? 0 : 40)).current;
  const cursorBlink = useRef(new Animated.Value(1)).current;
  const coinsPulse = useRef(new Animated.Value(0)).current;
  const floatA = useRef(new Animated.Value(0)).current;
  const floatB = useRef(new Animated.Value(0)).current;
  const ctaPulse = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const [typedHeadline, setTypedHeadline] = useState(STATIC_HERO_SHOWN ? HEADLINE_TEXT : '');
  const sectionY = useRef({ howItWorks: 0, learning: 0, rewards: 0 });
  const [nearFooter, setNearFooter] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showEarlyBirdPopup, setShowEarlyBirdPopup] = useState(false);
  const [showHeroConfetti, setShowHeroConfetti] = useState(false);
  const [showRewardsCoinShower, setShowRewardsCoinShower] = useState(false);
  const rewardsSectionRef = useRef<any>(null);
  const diwali = isDiwaliSeason();

  // Launch-day confetti — once per day per browser, guest visitors included.
  useEffect(() => {
    if (!isLaunchDay()) return;
    (async () => {
      const todayStr = getLocalDateStr();
      const key = 'launchDayConfettiSeen_default';
      const lastSeen = await AsyncStorage.getItem(key);
      if (lastSeen !== todayStr) {
        setShowConfetti(true);
        await AsyncStorage.setItem(key, todayStr);
      }
    })();
  }, []);

  // Early Bird signup promo — shown once ever per browser (not daily; a
  // recurring signup pitch would get old fast for repeat visitors).
  useEffect(() => {
    (async () => {
      const seen = await AsyncStorage.getItem('earlyBirdPromoSeen');
      if (!seen) setShowEarlyBirdPopup(true);
    })();
  }, []);

  const dismissEarlyBirdPopup = () => {
    setShowEarlyBirdPopup(false);
    AsyncStorage.setItem('earlyBirdPromoSeen', 'true');
  };

  // Coin shower once, the first time the Rewards section scrolls into view.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || !rewardsSectionRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShowRewardsCoinShower(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(rewardsSectionRef.current);
    return () => obs.disconnect();
  }, []);

  const scrollToSection = (key: 'howItWorks' | 'learning' | 'rewards') => {
    scrollRef.current?.scrollTo({ y: sectionY.current[key], animated: true });
  };

  // Mascot widget floats fixed bottom-right; fade it out once the footer's
  // contact block scrolls into that same corner so it never covers real content.
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    setNearFooter(distanceFromBottom < 480);
  };

  useEffect(() => {
    if (STATIC_HERO_SHOWN) return;
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

  }, []);

  // Blinking cursor for the headline typewriter.
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorBlink, { toValue: 0, duration: 450, useNativeDriver: true }),
        Animated.timing(cursorBlink, { toValue: 1, duration: 450, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Gentle color pulse on "Rewards." once the typewriter reveals it.
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(coinsPulse, { toValue: 1, duration: 1400, useNativeDriver: false }),
        Animated.timing(coinsPulse, { toValue: 0, duration: 1400, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const coinsColor = coinsPulse.interpolate({ inputRange: [0, 1], outputRange: ['#4ade80', '#fbbf24'] });

  // Slow independent drift on the two hero decorative circles — different
  // durations so they never move in sync, reads as ambient rather than mechanical.
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatA, { toValue: 1, duration: 4200, useNativeDriver: true }),
        Animated.timing(floatA, { toValue: 0, duration: 4200, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatB, { toValue: 1, duration: 3400, useNativeDriver: true }),
        Animated.timing(floatB, { toValue: 0, duration: 3400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Breathing glow on the primary CTAs — draws the eye without being distracting.
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(ctaPulse, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const ctaScale = ctaPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });

  // Typewriter: types out the headline once on mount, character by character.
  // Confetti bursts right as "Smart Sustainability, Real Rewards." finishes typing.
  useEffect(() => {
    if (STATIC_HERO_SHOWN) { setShowHeroConfetti(true); return; }
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTypedHeadline(HEADLINE_TEXT.slice(0, i));
      if (i >= HEADLINE_TEXT.length) {
        clearInterval(interval);
        setShowHeroConfetti(true);
      }
    }, 35);
    return () => clearInterval(interval);
  }, []);

  // Arriving from a Quick Links entry point (e.g. WebFooter) with a target section —
  // wait a tick for onLayout to populate sectionY before scrolling to it.
  useEffect(() => {
    const target = route?.params?.scrollTo as 'howItWorks' | 'learning' | 'rewards' | undefined;
    if (!target) return;
    const t = setTimeout(() => scrollToSection(target), 300);
    return () => clearTimeout(t);
  }, [route?.params?.scrollTo]);

  return (
    <View style={s.root}>
      <MascotPopupBanner suppressed={nearFooter} />

      {/* ── NAV BAR ── */}
      <View style={s.navBar}>
        <View style={[s.navInner, isMobile && { paddingHorizontal: 20 }]}>
          <TouchableOpacity
            onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
            activeOpacity={0.8}
            style={s.navLogoRow}
          >
            {/* Icon and wordmark are separate crops of the same source logo, laid
                out the same way as the original artwork (icon left, wordmark on
                top, tagline underneath) — the tagline is real text here instead
                of the tiny raster copy, so it stays crisp at navbar scale. */}
            <Image source={require('../../assets/logo-icon.webp')} resizeMode="contain" style={[s.navIconImg, isMobile && { width: 48, height: 50 }]} />
            <View>
              {/* Solid crisp text instead of the hollow/outlined wordmark image
                  (the raster "Karma" was outline-only and read faintly on dark). */}
              <Text style={[s.navWordText, isMobile && { fontSize: 22 }]}>
                <Text style={{ color: '#ffffff' }}>Karma</Text>
                <Text style={{ color: '#4ade80' }}>Ver$e</Text>
              </Text>
              {!isMobile && (
                <Text style={s.navTagline}>
                  <Text style={{ color: '#86efac' }}>EARN</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.35)' }}>  •  </Text>
                  <Text style={{ color: '#86efac' }}>IMPACT</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.35)' }}>  •  </Text>
                  <Text style={{ color: '#fbbf24' }}>ELEVATE</Text>
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {!isMobile && (
            <View style={s.navTabs}>
              <TouchableOpacity onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}>
                <Text style={s.navTabText}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => scrollToSection('howItWorks')}>
                <Text style={s.navTabText}>Flow</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => scrollToSection('rewards')}>
                <Text style={s.navTabText}>Rewards</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => scrollToSection('learning')}>
                <Text style={s.navTabText}>Learn</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('News')}>
                <Text style={s.navTabText}>News</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}>
                <Text style={s.navTabText}>Contact</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Launch Day celebration strip (auto-hides after today) */}
      {isLaunchDay() && (
        <View style={{ paddingHorizontal: isMobile ? 16 : 32, paddingTop: 12, backgroundColor: '#052e16' }}>
          <View style={{ maxWidth: MAX, width: '100%', alignSelf: 'center' }}>
            <LaunchDayBanner />
          </View>
        </View>
      )}

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} style={{ flex: 1 }} onScroll={handleScroll} scrollEventThrottle={32}>

        {/* ── HERO ── */}
        <LinearGradient colors={['#052e16', '#064e3b', '#0f766e']} style={s.hero}>
          {/* Decorative circles */}
          <Animated.View style={[s.heroCircle, { top: -80, right: -60, width: 300, height: 300, opacity: 0.08, transform: [{ translateY: floatA.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }) }] }]} />
          <Animated.View style={[s.heroCircle, { bottom: -40, left: -80, width: 250, height: 250, opacity: 0.06, transform: [{ translateY: floatB.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) }] }]} />
          {diwali && (
            <>
              <DiwaliSparkles count={isMobile ? 6 : 14} from={isMobile ? 0 : 55} />
              {!isMobile && <DiwaliRangoli wide={W >= 1180} />}
              <DiwaliLights />
              {W >= 380 && <DiwaliKandils wide={W >= 1180} />}
              {W >= 1200 && <DiwaliMarigolds />}
              <DiwaliEmbers count={isMobile ? 8 : 16} />
              <DiwaliDiyas count={isMobile ? 5 : 9} />
            </>
          )}

          <Animated.View style={[s.heroContent, isMobile && { paddingHorizontal: 20 }, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
            {/* Badge */}
            <View style={s.heroBadge}>
              <View style={[s.heroBadgeDot, diwali && { backgroundColor: '#fbbf24' }]} />
              <Text style={s.heroBadgeText}>{diwali ? <DiwaliShimmerText text="Happy Diwali from KarmaVer$e" /> : 'AI-Powered Sustainability Platform'}</Text>
            </View>

            {/* The headline types out character by character. A full-text, invisible
                ghost reserves its final height so the tagline/CTA below never shift as
                it types (fixes the hero CLS / layout shift). */}
            <View style={s.heroTitleWrap}>
              <Text style={[s.heroTitle, isMobile && { fontSize: 34 }, s.heroTitleGhost]}>
                {HEADLINE_TEXT}
              </Text>
              <Text style={[s.heroTitle, isMobile && { fontSize: 34 }, s.heroTitleLive]} aria-hidden>
                {typedHeadline.length <= KARMA_SPLIT ? typedHeadline : HEADLINE_TEXT.slice(0, KARMA_SPLIT)}
                {typedHeadline.length > KARMA_SPLIT && (
                  <Animated.Text style={{ color: coinsColor }}>{typedHeadline.slice(KARMA_SPLIT)}</Animated.Text>
                )}
                <Animated.Text style={[s.heroCursor, { opacity: cursorBlink }]}>|</Animated.Text>
              </Text>
            </View>

            <Text style={[s.heroTagline, isMobile && { fontSize: 18 }]}>“Kar Bhala Toh Ho Bhala.” 🌱</Text>

            <Text style={[s.heroSub, isMobile && { fontSize: 16 }]}>
              KarmaVer$e rewards every sustainable action — schedule green pickups,
              sharpen your green knowledge with our AI-powered eco-quiz, and turn it all into
              KarmaCoins with real, measurable impact.
            </Text>

            <View style={s.poweredByBadge}>
              <View style={s.poweredByDot}><Text style={s.poweredByDotText}>3R</Text></View>
              <Text style={s.poweredByText}>Powered by <Text style={{ color: 'white', fontWeight: '800' }}>3RZeroWaste</Text></Text>
            </View>

            {/* CTA */}
            <View style={[s.heroCTA, isMobile && { flexDirection: 'column', gap: 12 }]}>
              <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
                <TouchableOpacity style={s.ctaPrimary} onPress={() => navigation.navigate('Login')}>
                  <Text style={s.ctaPrimaryText}>Start your journey</Text>
                  <ArrowRight size={18} color="#052e16" />
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity style={s.ctaSecondary} onPress={() => scrollToSection('rewards')}>
                <Gift size={16} color="#4ade80" />
                <Text style={s.ctaSecondaryText}>Explore rewards</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#000000', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' }}
                onPress={() => { const u = 'https://play.google.com/store/apps/details?id=com.karmacredits.app'; if (typeof window !== 'undefined') window.open(u, '_blank', 'noopener'); else Linking.openURL(u); }}
                activeOpacity={0.85}
              >
                <GooglePlayLogo size={24} />
                <View>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 9, fontWeight: '700', letterSpacing: 1.2 }}>GET IT ON</Text>
                  <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '800' }}>Google Play</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Highlights: Act → Earn → Redeem */}
            <View style={[s.heroHighlightsRow, isMobile && { flexDirection: 'column' }]}>
              {[
                { icon: Sprout, title: 'Sustainable actions', desc: 'Complete meaningful eco-friendly activities every day' },
                { icon: Coins, title: 'Earn KarmaCoins', desc: 'Receive rewards for every verified sustainable contribution' },
                { icon: Gift, title: 'Redeem rewards', desc: 'Exchange KarmaCoins for products, discounts & experiences' },
              ].map((h, i) => (
                <View key={i} style={s.heroHighlightCard}>
                  <View style={s.heroHighlightIconBg}><h.icon size={18} color="#4ade80" /></View>
                  <Text style={s.heroHighlightTitle}>{h.title}</Text>
                  <Text style={s.heroHighlightDesc}>{h.desc}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
          {diwali && !isMobile && <DiwaliCursorSparks />}
        </LinearGradient>

        {diwali && (
          <View style={{ backgroundColor: '#f8fafc', paddingTop: isMobile ? 32 : 48 }}>
            <View style={[s.container, isMobile && { paddingHorizontal: 20 }]}>
              <DiwaliCleanupCard onPress={() => navigation.navigate('Login')} isMobile={isMobile} />
            </View>
          </View>
        )}

        {/* ── ECOSYSTEM ── */}
        <View style={[s.section, { backgroundColor: '#f8fafc' }]}>
          <View style={[s.container, isMobile && { paddingHorizontal: 20 }]}>
            <Text style={s.sectionLabel}>ECOSYSTEM</Text>
            <Text style={[s.sectionTitle, { marginBottom: 16 }, isMobile && { fontSize: 28 }]}>One platform connecting every sustainability stakeholder</Text>
            <Text style={[s.sectionIntro, isMobile && { fontSize: 15 }]}>
              KarmaVer$e connects citizens, housing societies, schools, corporates, NGOs, recyclers,
              pickup partners, and sustainable brands — creating one unified ecosystem where every
              sustainable action generates value.
            </Text>

            <View style={[s.featGrid, { marginTop: 36 }]}>
              {[
                { icon: Users, color: '#16a34a', label: 'Citizens' },
                { icon: HomeIcon, color: '#0891b2', label: 'Housing societies' },
                { icon: GraduationCap, color: '#d97706', label: 'Schools' },
                { icon: Building2, color: '#2563eb', label: 'Corporates' },
                { icon: HeartHandshake, color: '#e11d48', label: 'NGOs' },
                { icon: Recycle, color: '#059669', label: 'Recyclers' },
                { icon: Truck, color: '#7c3aed', label: 'Pickup partners' },
                { icon: Store, color: '#ea580c', label: 'Sustainable brands' },
              ].map((eco, i) => (
                <Card key={i} delay={i * 50} style={[s.ecoCard, { width: isMobile ? '47%' : '22%', flexGrow: 1 }]}>
                  <View style={[s.featIconBg, { backgroundColor: eco.color + '15' }]}>
                    <eco.icon size={24} color={eco.color} />
                  </View>
                  <Text style={s.ecoLabel}>{eco.label}</Text>
                </Card>
              ))}
            </View>
          </View>
        </View>

        {/* ── HOW IT WORKS ── */}
        <View style={s.section} onLayout={(e) => { sectionY.current.howItWorks = e.nativeEvent.layout.y; }}>
          <View style={[s.container, isMobile && { paddingHorizontal: 20 }]}>
            <Text style={s.sectionLabel}>FLOW</Text>
            <Text style={[s.sectionTitle, isMobile && { fontSize: 28 }]}>Sustainable actions, AI-enabled rewards</Text>

            <View style={[s.stepsRow, isMobile && { flexDirection: 'column' }]}>
              {[
                { num: '1', icon: Target, color: '#16a34a', bg: '#f0fdf4', title: 'Choose sustainable actions', desc: 'Schedule a pickup, play the eco-quiz, or complete a challenge' },
                { num: '2', icon: Shield, color: '#0891b2', bg: '#ecfeff', title: 'Complete actions & verify', desc: 'Your action is checked and verified for authenticity' },
                { num: '3', icon: Coins, color: '#d97706', bg: '#fffbeb', title: 'Earn KarmaCoins', desc: 'Coins are credited to your wallet instantly' },
                { num: '4', icon: Gift, color: '#e11d48', bg: '#fff1f2', title: 'Redeem rewards', desc: 'Trade coins for products, discounts, or real-world impact' },
              ].map((step, i) => (
                <Card key={i} delay={i * 80} style={[s.stepCard, { width: isMobile ? '100%' : '23%', flex: undefined }]}>
                  <View style={[s.stepIconBg, { backgroundColor: step.bg }]}>
                    <step.icon size={26} color={step.color} />
                  </View>
                  <View style={s.stepNum}><Text style={s.stepNumText}>{step.num}</Text></View>
                  <Text style={s.stepTitle}>{step.title}</Text>
                  <Text style={s.stepDesc}>{step.desc}</Text>
                </Card>
              ))}
            </View>
          </View>
        </View>

        {/* ── REWARDS ── */}
        <View ref={rewardsSectionRef} style={s.section} onLayout={(e) => { sectionY.current.rewards = e.nativeEvent.layout.y; }}>
          {showRewardsCoinShower && <CoinShower onDone={() => setShowRewardsCoinShower(false)} />}
          <View style={[s.container, isMobile && { paddingHorizontal: 20 }]}>
            <Text style={s.sectionLabel}>REWARDS</Text>
            <Text style={[s.sectionTitle, isMobile && { fontSize: 28 }]}>Turn good karma into great rewards</Text>

            <View style={[s.rewardsVisualRow, isMobile && { flexDirection: 'column', gap: 20 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.sectionIntro, isMobile && { fontSize: 15 }]}>
                  A growing marketplace of eco and lifestyle rewards — because doing good should
                  feel good too.
                </Text>
              </View>
              <KarmaCoin size={64} glow animated />
            </View>

            <View style={[s.featGrid, { marginTop: 28 }, isMobile && { flexDirection: 'column' }]}>
              {[
                { img: require('../../assets/rewards/green-store.webp'), title: 'Green Store', desc: 'Sustainable goods that give back to the planet' },
                { img: require('../../assets/rewards/gift-cards.webp'), title: 'Eco Gift Cards', desc: 'Green vouchers from your favourite brands' },
                { img: require('../../assets/rewards/savings.webp'), title: 'Conscious Savings', desc: 'Save on the everyday things you already buy' },
                { img: require('../../assets/rewards/experiences.webp'), title: 'Eco Experiences', desc: 'Unlock green experiences money can\'t buy' },
                { img: require('../../assets/rewards/partners.webp'), title: 'Impact Partners', desc: 'Curated offers from our sustainable partners' },
                { img: require('../../assets/rewards/plant-tree.webp'), title: 'Plant a Tree', desc: 'Convert coins into real trees, real impact' },
              ].map((r, i) => (
                <Card key={i} delay={i * 70} style={[s.rewardCard, { width: isMobile ? '100%' : '31%' }]}>
                  <Image source={r.img} resizeMode="cover" style={s.rewardImg} />
                  <View style={s.rewardBody}>
                    <Text style={s.featTitle}>{r.title}</Text>
                    <Text style={s.featDesc}>{r.desc}</Text>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        </View>

        {/* ── LEARNING & ENGAGEMENT ── */}
        <View style={[s.section, { backgroundColor: '#f8fafc' }]} onLayout={(e) => { sectionY.current.learning = e.nativeEvent.layout.y; }}>
          <View style={[s.container, isMobile && { paddingHorizontal: 20 }]}>
            <Text style={s.sectionLabel}>LEARNING & ENGAGEMENT</Text>
            <Text style={[s.sectionTitle, { marginBottom: 16 }, isMobile && { fontSize: 28 }]}>Learn. Act. Earn.</Text>
            <Text style={[s.sectionIntro, isMobile && { fontSize: 15 }]}>
              Refer friends, play the daily eco-quiz, join community campaigns, take on challenges,
              and explore our learning modules and knowledge hub. Every step turns into real-world impact.
            </Text>

            <View style={[s.featGrid, { marginTop: 36 }, isMobile && { flexDirection: 'column' }]}>
              {[
                { icon: Gift, color: '#e11d48', title: 'Refer & Earn', desc: 'Invite friends — you both earn 1,000 bonus KarmaCoins XP' },
                { icon: Brain, color: '#7c3aed', title: 'Daily Eco Quiz', desc: 'AI-generated daily quiz — never a repeat' },
                { icon: Megaphone, color: '#16a34a', title: 'Sustainability Community Campaigns', desc: 'Join drives that turn learning into action' },
                { icon: Trophy, color: '#d97706', title: 'Interactive Challenges', desc: 'Compete, climb the board, stay motivated' },
                { icon: BookOpen, color: '#0891b2', title: 'Learning Modules', desc: 'Bite-sized lessons on real sustainability topics' },
                { icon: Sprout, color: '#059669', title: 'Sustainability Knowledge', desc: 'Deep-dive guides to live greener every day' },
                { icon: GraduationCap, color: '#2563eb', title: 'Knowledge Hub', desc: 'Curated articles, tips, and eco stories' },
              ].map((l, i) => (
                <Card key={i} delay={i * 60} style={[s.featCard, { width: isMobile ? '100%' : '22%' }]}>
                  <View style={[s.featIconBg, { backgroundColor: l.color + '15' }]}>
                    <l.icon size={26} color={l.color} />
                  </View>
                  <Text style={s.featTitle}>{l.title}</Text>
                  <Text style={s.featDesc}>{l.desc}</Text>
                </Card>
              ))}
            </View>
          </View>
        </View>

        {/* ── LATEST NEWS ── */}
        {NEWS.length > 0 && (
          <View style={s.section}>
            <View style={[s.container, isMobile && { paddingHorizontal: 20 }]}>
              <View style={[s.newsHeadRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.sectionLabel}>LATEST NEWS</Text>
                  <Text style={[s.sectionTitle, { marginBottom: 0 }, isMobile && { fontSize: 28 }]}>KarmaVer$e in the news</Text>
                </View>
                <TouchableOpacity style={s.newsAllBtn} onPress={() => navigation.navigate('News')} activeOpacity={0.85}>
                  <Text style={s.newsAllText}>View all news</Text>
                  <ArrowRight size={16} color="#16a34a" />
                </TouchableOpacity>
              </View>
              <View style={[s.featGrid, { marginTop: 32 }, isMobile && { flexDirection: 'column' }]}>
                {NEWS.slice(0, 3).map((item, i) => (
                  <Card key={item.id} delay={i * 70} style={isMobile ? { width: '100%' } : { flex: 1 }}>
                    <NewsCard item={item} style={{ flex: 1 }} />
                  </Card>
                ))}
              </View>
              {NEWSLETTERS.length > 0 && <NewsletterStrip item={NEWSLETTERS[0]} />}
            </View>
          </View>
        )}

        {/* ── FOOTER ── */}
        <View style={s.footer}>
          <View style={[s.container, s.footerContent, isMobile && { flexDirection: 'column', gap: 28, paddingHorizontal: 20 }]}>
            <View style={[s.footerBrand, isMobile && { width: '100%' }]}>
              <View style={s.footerLogoRow}>
                <Image source={require('../../assets/logo-nav.png')} resizeMode="contain" style={s.footerLogoImg} />
              </View>
              <Text style={s.footerDesc}>
                3RZeroWaste® was founded to do waste management differently — turning India's growing waste into value through the circular economy. KarmaVerse is its sustainability rewards ecosystem.
              </Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://0waste.co.in/')}>
                <Text style={[s.footerLink, { marginTop: 10, color: '#4ade80', fontWeight: '700' }]}>0waste.co.in ↗</Text>
              </TouchableOpacity>
              <View style={s.footerSocialRow}>
                {[
                  { Icon: Instagram, url: 'https://www.instagram.com/mykarmaverse/' },
                  { Icon: Facebook, url: 'https://www.facebook.com/share/p/17GYy6Qyam/' },
                  { Icon: Linkedin, url: 'https://www.linkedin.com/showcase/136793967' },
                  { Icon: Twitter, url: 'https://x.com/mykarmaverse' },
                  { Icon: Youtube, url: 'https://www.youtube.com/channel/UCJjzqmfLvyFhGRwfjSGE4bw' },
                ].map(({ Icon, url }, i) => (
                  <TouchableOpacity key={i} style={s.footerSocialBtn} onPress={() => Linking.openURL(url)} activeOpacity={0.8}>
                    <Icon size={16} color="#cbd5e1" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[s.footerLinksRow, isMobile && { flexDirection: 'column', gap: 24 }]}>
              <View style={s.footerLinks}>
                <Text style={s.footerLinkTitle}>Product</Text>
                <TouchableOpacity onPress={() => scrollToSection('howItWorks')}>
                  <Text style={s.footerLink}>Flow</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => scrollToSection('rewards')}>
                  <Text style={s.footerLink}>Rewards</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => scrollToSection('learning')}>
                  <Text style={s.footerLink}>Learn & earn</Text>
                </TouchableOpacity>
              </View>

              <View style={s.footerLinks}>
                <Text style={s.footerLinkTitle}>Company</Text>
                <TouchableOpacity onPress={() => navigation.navigate('AboutUs')}>
                  <Text style={s.footerLink}>About us</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('News')}>
                  <Text style={s.footerLink}>News</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Legal', { type: 'privacy' })}>
                  <Text style={s.footerLink}>Privacy policy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Legal', { type: 'terms' })}>
                  <Text style={s.footerLink}>Terms & conditions</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Legal', { type: 'terms-of-use' })}>
                  <Text style={s.footerLink}>Terms of use</Text>
                </TouchableOpacity>
              </View>

              <View style={s.footerLinks}>
                <Text style={s.footerLinkTitle}>Contact us</Text>
                <TouchableOpacity style={s.footerContactRow} onPress={() => Linking.openURL('mailto:info@0waste.co.in')}>
                  <Mail size={14} color="#4ade80" />
                  <Text style={s.footerLink}>info@0waste.co.in</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.footerContactRow} onPress={() => Linking.openURL('tel:+917093198828')}>
                  <Phone size={14} color="#4ade80" />
                  <Text style={s.footerLink}>+91 70931 98828</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.footerContactRow}
                  onPress={() => Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Plot 62, Sector 8, IMT Manesar, Gurugram, Haryana 122051'))}
                >
                  <MapPin size={14} color="#4ade80" style={{ marginTop: 2 }} />
                  <Text style={[s.footerLink, { flex: 1, textDecorationLine: 'underline' }]}>Plot 62, Sector 8, IMT Manesar, Gurugram, Haryana 122051</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={[s.container, s.footerBottom, isMobile && { paddingHorizontal: 20 }]}>
            <Text style={s.footerCopy}>© 2026 KarmaVer$e by 3RZeroWaste. All rights reserved.</Text>
          </View>
        </View>

      </ScrollView>

      {showConfetti && <LaunchConfetti onDone={() => setShowConfetti(false)} />}
      {showHeroConfetti && <LaunchConfetti onDone={() => setShowHeroConfetti(false)} />}
      {showEarlyBirdPopup && (
        <EarlyBirdPopup
          onClose={dismissEarlyBirdPopup}
          onGetStarted={() => { dismissEarlyBirdPopup(); navigation.navigate('Login'); }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  // overflow hidden guarantees no horizontal page-scroll at any viewport — decorative
  // bleed (negative-offset circles) or a slightly-too-wide row can't push the page
  // sideways. Vertical scroll lives inside the ScrollView, so it's unaffected; the
  // fixed mascot widget and modal portals aren't clipped by an ancestor's overflow.
  root: { flex: 1, backgroundColor: '#ffffff', overflow: 'hidden' },

  hoverLift: {
    transform: [{ translateY: -3 }],
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 6,
  },

  // Nav bar — dark background matches the logo lockup, which is a white/light
  // wordmark on a transparent background and disappears on light surfaces.
  navBar: {
    backgroundColor: '#052e16', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', zIndex: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  navInner: { maxWidth: MAX, width: '100%', alignSelf: 'center', paddingHorizontal: 32, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navIconImg: { width: 70, height: 73 },
  navWordText: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, lineHeight: 32 },
  navTagline: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.9, marginTop: 3 },
  navTabs: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  navTabText: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '700' },

  // Hero
  hero: { paddingBottom: 60, minHeight: 500, overflow: 'hidden' },
  heroCircle: { position: 'absolute', borderRadius: 999, backgroundColor: 'white' },
  heroContent: { maxWidth: MAX, width: '100%', alignSelf: 'center', paddingHorizontal: 32, paddingTop: 60 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 24 },
  heroBadgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' },
  heroBadgeText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '700' },
  heroTitle: { fontSize: 50, fontWeight: '900', color: 'white', letterSpacing: -1.5, lineHeight: 60, marginBottom: 12 },
  // Headline layout-shift guard: the ghost (full text) holds the height in-flow,
  // the live (typing) text overlays it absolutely so nothing below moves.
  heroTitleWrap: { position: 'relative', marginBottom: 12 },
  heroTitleGhost: { opacity: 0, marginBottom: 0 },
  heroTitleLive: { position: 'absolute', top: 0, left: 0, right: 0, marginBottom: 0 },
  heroTagline: { fontSize: 22, fontWeight: '700', fontStyle: 'italic', color: '#4ade80', marginBottom: 18 },
  heroCursor: { color: '#4ade80', fontWeight: '400' },
  heroSub: { fontSize: 18, color: 'rgba(255,255,255,0.7)', fontWeight: '500', lineHeight: 28, maxWidth: 620, marginBottom: 32 },
  heroCTA: { flexDirection: 'row', gap: 16, marginTop: 28, marginBottom: 44 },
  ctaPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#4ade80', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 16,
    shadowColor: '#4ade80', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6,
  },
  ctaPrimaryText: { color: '#052e16', fontWeight: '900', fontSize: 16 },
  ctaSecondary: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 16 },
  ctaSecondaryText: { color: '#4ade80', fontWeight: '700', fontSize: 15 },
  poweredByBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  poweredByDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#4ade80', alignItems: 'center', justifyContent: 'center' },
  poweredByDotText: { fontSize: 8, fontWeight: '900', color: '#052e16' },
  poweredByText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },

  // Hero highlights (Act → Earn → Redeem)
  heroHighlightsRow: { flexDirection: 'row', gap: 16 },
  heroHighlightCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16, padding: 18,
  },
  heroHighlightIconBg: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(74,222,128,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  heroHighlightTitle: { color: 'white', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  heroHighlightDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 12.5, fontWeight: '500', lineHeight: 18 },

  // Sections
  section: { paddingVertical: 60 },
  container: { maxWidth: MAX, width: '100%', alignSelf: 'center', paddingHorizontal: 32 },
  sectionLabel: { fontSize: 12, fontWeight: '900', color: '#16a34a', letterSpacing: 2, marginBottom: 10 },
  sectionTitle: { fontSize: 36, fontWeight: '900', color: '#0f172a', letterSpacing: -1, marginBottom: 40, lineHeight: 44 },
  sectionIntro: { fontSize: 16, color: '#475569', fontWeight: '500', lineHeight: 26, maxWidth: 680 },

  // Steps
  stepsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  stepCard: { flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 26, borderWidth: 1, borderColor: '#e2e8f0', position: 'relative', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 3 },
  stepIconBg: { width: 54, height: 54, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  stepNum: { position: 'absolute', top: 20, right: 20, width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 13, fontWeight: '900', color: '#94a3b8' },
  stepTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 7 },
  stepDesc: { fontSize: 14.5, color: '#64748b', fontWeight: '500', lineHeight: 22 },

  // Generic card grid — reused for Rewards and Learning
  featGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  featCard: { backgroundColor: 'white', borderRadius: 18, padding: 26, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 3 },
  rewardCard: { backgroundColor: 'white', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 3 },
  rewardImg: { width: '100%', height: 140 },
  rewardBody: { padding: 22 },
  featIconBg: { width: 54, height: 54, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  featTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 7 },
  featDesc: { fontSize: 14.5, color: '#64748b', fontWeight: '500', lineHeight: 22 },

  // Ecosystem chips (icon + label only)
  ecoCard: { backgroundColor: 'white', borderRadius: 16, padding: 22, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'flex-start', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 3 },
  ecoLabel: { fontSize: 16, fontWeight: '800', color: '#0f172a' },

  // Latest news
  newsHeadRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 },
  newsAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#bbf7d0', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 },
  newsAllText: { color: '#16a34a', fontSize: 14, fontWeight: '800' },

  // Rewards
  rewardsVisualRow: { flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 8 },

  // Footer
  footer: { backgroundColor: '#0f172a', paddingTop: 50 },
  footerContent: { flexDirection: 'row', gap: 32, paddingBottom: 40 },
  footerBrand: { flex: 1.2 },
  footerLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  footerLogoImg: { width: 220, height: 104 },
  footerSocialRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  footerSocialBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  footerDesc: { color: '#94a3b8', fontSize: 14, fontWeight: '500', lineHeight: 22, maxWidth: 320 },
  footerLinksRow: { flex: 2, flexDirection: 'row', justifyContent: 'space-between' },
  footerLinks: { gap: 12, flex: 1 },
  footerLinkTitle: { color: 'white', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  footerLink: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
  footerContactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  footerBottom: { borderTopWidth: 1, borderTopColor: '#1e293b', paddingVertical: 20 },
  footerCopy: { color: '#64748b', fontSize: 12, fontWeight: '500' },
});
