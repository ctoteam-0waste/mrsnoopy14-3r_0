import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Image, Linking, NativeSyntheticEvent, NativeScrollEvent
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Truck, Gift, Shield,
  Recycle, Users, Coins, ArrowRight,
  BookOpen, Mail, MapPin,
  Sprout, Trophy, Flame, Brain, Handshake, Building2,
  Target, Percent, GraduationCap, Leaf,
  HeartHandshake, Sparkles, Home as HomeIcon, Store, Megaphone,
} from 'lucide-react-native';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { MascotPopupBanner } from '../components/shared/MascotPopupBanner';

const { width: W } = Dimensions.get('window');
const isMobile = W < 768;
const MAX = 1100;

const KARMA_PHRASE = 'Rewards.';
const HEADLINE_TEXT = `Turning Sustainable Gestures\ninto ${KARMA_PHRASE}`;
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
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const cursorBlink = useRef(new Animated.Value(1)).current;
  const coinsPulse = useRef(new Animated.Value(0)).current;
  const floatA = useRef(new Animated.Value(0)).current;
  const floatB = useRef(new Animated.Value(0)).current;
  const ctaPulse = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const [typedHeadline, setTypedHeadline] = useState('');
  const sectionY = useRef({ howItWorks: 0, learning: 0, rewards: 0 });
  const [nearFooter, setNearFooter] = useState(false);

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
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTypedHeadline(HEADLINE_TEXT.slice(0, i));
      if (i >= HEADLINE_TEXT.length) clearInterval(interval);
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
            <Image source={require('../../assets/logo-icon.png')} resizeMode="contain" style={[s.navIconImg, isMobile && { width: 40, height: 42 }]} />
            <View>
              <Image source={require('../../assets/logo-wordmark.png')} resizeMode="contain" style={[s.navWordmarkImg, isMobile && { width: 108, height: 20 }]} />
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
              <TouchableOpacity onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}>
                <Text style={s.navTabText}>Contact</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} style={{ flex: 1 }} onScroll={handleScroll} scrollEventThrottle={32}>

        {/* ── HERO ── */}
        <LinearGradient colors={['#052e16', '#064e3b', '#0f766e']} style={s.hero}>
          {/* Decorative circles */}
          <Animated.View style={[s.heroCircle, { top: -80, right: -60, width: 300, height: 300, opacity: 0.08, transform: [{ translateY: floatA.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }) }] }]} />
          <Animated.View style={[s.heroCircle, { bottom: -40, left: -80, width: 250, height: 250, opacity: 0.06, transform: [{ translateY: floatB.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) }] }]} />

          <Animated.View style={[s.heroContent, isMobile && { paddingHorizontal: 20 }, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
            {/* Badge */}
            <View style={s.heroBadge}>
              <View style={s.heroBadgeDot} />
              <Text style={s.heroBadgeText}>India's Sustainability Rewards Ecosystem</Text>
            </View>

            <Text style={[s.heroTitle, isMobile && { fontSize: 34 }]}>
              {typedHeadline.length <= KARMA_SPLIT ? typedHeadline : HEADLINE_TEXT.slice(0, KARMA_SPLIT)}
              {typedHeadline.length > KARMA_SPLIT && (
                <Animated.Text style={{ color: coinsColor }}>{typedHeadline.slice(KARMA_SPLIT)}</Animated.Text>
              )}
              <Animated.Text style={[s.heroCursor, { opacity: cursorBlink }]}>|</Animated.Text>
            </Text>
            <Text style={[s.heroSub, isMobile && { fontSize: 16 }]}>
              Every sustainable action deserves recognition. KarmaVer$e transforms your everyday
              eco-friendly choices into KarmaCoins that unlock real rewards 🎁 while creating
              measurable environmental impact.
            </Text>

            <View style={s.poweredByBadge}>
              <View style={s.poweredByDot}><Text style={s.poweredByDotText}>3R</Text></View>
              <Text style={s.poweredByText}>Powered by <Text style={{ color: 'white', fontWeight: '800' }}>3R Zero Waste</Text></Text>
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
            </View>

            {/* Highlights: Act → Earn → Redeem */}
            <View style={[s.heroHighlightsRow, isMobile && { flexDirection: 'column' }]}>
              {[
                { icon: Sprout, title: 'Sustainable actions', desc: 'Complete meaningful eco-friendly activities every day.' },
                { icon: Coins, title: 'Earn KarmaCoins', desc: 'Receive rewards for every verified sustainable contribution.' },
                { icon: Gift, title: 'Redeem rewards', desc: 'Exchange KarmaCoins for products, discounts & experiences.' },
              ].map((h, i) => (
                <View key={i} style={s.heroHighlightCard}>
                  <View style={s.heroHighlightIconBg}><h.icon size={18} color="#4ade80" /></View>
                  <Text style={s.heroHighlightTitle}>{h.title}</Text>
                  <Text style={s.heroHighlightDesc}>{h.desc}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </LinearGradient>

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
                    <eco.icon size={20} color={eco.color} />
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
            <Text style={[s.sectionTitle, isMobile && { fontSize: 28 }]}>Simple actions. Meaningful rewards.</Text>

            <View style={[s.stepsRow, isMobile && { flexDirection: 'column' }]}>
              {[
                { num: '1', icon: Target, color: '#16a34a', bg: '#f0fdf4', title: 'Choose sustainable actions', desc: 'Schedule a pickup, play the eco-quiz, or complete a challenge.' },
                { num: '2', icon: Shield, color: '#0891b2', bg: '#ecfeff', title: 'Complete & verify', desc: 'Your action is checked and verified for authenticity.' },
                { num: '3', icon: Coins, color: '#d97706', bg: '#fffbeb', title: 'Earn KarmaCoins', desc: 'Coins are credited to your wallet instantly.' },
                { num: '4', icon: Gift, color: '#e11d48', bg: '#fff1f2', title: 'Redeem rewards', desc: 'Trade coins for products, discounts, or real-world impact.' },
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
        <View style={s.section} onLayout={(e) => { sectionY.current.rewards = e.nativeEvent.layout.y; }}>
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
                { icon: Leaf, color: '#16a34a', title: 'Eco products', desc: 'Sustainable goods for everyday life.' },
                { icon: Gift, color: '#e11d48', title: 'Gift cards', desc: 'Vouchers from your favourite brands.' },
                { icon: Percent, color: '#0891b2', title: 'Shopping discounts', desc: 'Save on the things you already buy.' },
                { icon: Sparkles, color: '#d97706', title: 'Exclusive experiences', desc: 'Unlock experiences money can\'t buy.' },
                { icon: Handshake, color: '#7c3aed', title: 'Partner rewards', desc: 'Curated offers from our brand partners.' },
                { icon: Sprout, color: '#059669', title: 'Tree plantation', desc: 'Turn coins into real trees planted.' },
              ].map((r, i) => (
                <Card key={i} delay={i * 70} style={[s.featCard, { width: isMobile ? '100%' : '31%' }]}>
                  <View style={[s.featIconBg, { backgroundColor: r.color + '15' }]}>
                    <r.icon size={22} color={r.color} />
                  </View>
                  <Text style={s.featTitle}>{r.title}</Text>
                  <Text style={s.featDesc}>{r.desc}</Text>
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
              Build sustainable habits through interactive challenges, learning modules, eco-quizzes,
              daily missions, and community campaigns. Every lesson can become real-world impact.
            </Text>

            <View style={[s.featGrid, { marginTop: 36 }, isMobile && { flexDirection: 'column' }]}>
              {[
                { icon: Trophy, color: '#d97706', title: 'Interactive challenges', desc: 'Compete, climb the board, stay motivated.' },
                { icon: BookOpen, color: '#0891b2', title: 'Learning modules', desc: 'Bite-sized lessons on real sustainability topics.' },
                { icon: Brain, color: '#7c3aed', title: 'Eco-quizzes', desc: 'AI-generated daily quizzes — never a repeat.' },
                { icon: Flame, color: '#e11d48', title: 'Daily missions', desc: 'Build a streak. Make sustainability a habit.' },
                { icon: Megaphone, color: '#16a34a', title: 'Community campaigns', desc: 'Join drives that turn learning into action.' },
              ].map((l, i) => (
                <Card key={i} delay={i * 60} style={[s.featCard, { width: isMobile ? '100%' : '22%' }]}>
                  <View style={[s.featIconBg, { backgroundColor: l.color + '15' }]}>
                    <l.icon size={22} color={l.color} />
                  </View>
                  <Text style={s.featTitle}>{l.title}</Text>
                  <Text style={s.featDesc}>{l.desc}</Text>
                </Card>
              ))}
            </View>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={s.footer}>
          <View style={[s.container, s.footerContent, isMobile && { flexDirection: 'column', gap: 28, paddingHorizontal: 20 }]}>
            <View style={[s.footerBrand, isMobile && { width: '100%' }]}>
              <View style={s.footerLogoRow}>
                <Image source={require('../../assets/logo-nav.png')} resizeMode="contain" style={s.footerLogoImg} />
              </View>
              <Text style={s.footerDesc}>
                3R Zero Waste® was founded to do waste management differently — turning India's growing waste into value through the circular economy. KarmaVerse is its sustainability rewards ecosystem.
              </Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://0waste.co.in/')}>
                <Text style={[s.footerLink, { marginTop: 10, color: '#4ade80', fontWeight: '700' }]}>0waste.co.in ↗</Text>
              </TouchableOpacity>
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
                <TouchableOpacity onPress={() => navigation.navigate('Legal', { type: 'privacy' })}>
                  <Text style={s.footerLink}>Privacy policy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Legal', { type: 'terms' })}>
                  <Text style={s.footerLink}>Terms of service</Text>
                </TouchableOpacity>
              </View>

              <View style={s.footerLinks}>
                <Text style={s.footerLinkTitle}>Contact us</Text>
                <TouchableOpacity style={s.footerContactRow} onPress={() => Linking.openURL('mailto:cto.team@0waste.co.in')}>
                  <Mail size={14} color="#4ade80" />
                  <Text style={s.footerLink}>cto.team@0waste.co.in</Text>
                </TouchableOpacity>
                <View style={s.footerContactRow}>
                  <MapPin size={14} color="#4ade80" style={{ marginTop: 2 }} />
                  <Text style={[s.footerLink, { flex: 1 }]}>Plot 62, Sector 8, IMT Manesar, Gurugram, Haryana 122503</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={[s.container, s.footerBottom, isMobile && { paddingHorizontal: 20 }]}>
            <Text style={s.footerCopy}>© 2026 KarmaVer$e by 3R Zero Waste. All rights reserved.</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },

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
  navIconImg: { width: 62, height: 65 },
  navWordmarkImg: { width: 92, height: 17 },
  navTagline: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.8, marginTop: 2 },
  navTabs: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  navTabText: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '700' },

  // Hero
  hero: { paddingBottom: 60, minHeight: 500 },
  heroCircle: { position: 'absolute', borderRadius: 999, backgroundColor: 'white' },
  heroContent: { maxWidth: MAX, width: '100%', alignSelf: 'center', paddingHorizontal: 32, paddingTop: 60 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 24 },
  heroBadgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' },
  heroBadgeText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  heroTitle: { fontSize: 50, fontWeight: '900', color: 'white', letterSpacing: -1.5, lineHeight: 60, marginBottom: 20 },
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
  stepCard: { flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 28, borderWidth: 1, borderColor: '#f1f5f9', position: 'relative' },
  stepIconBg: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  stepNum: { position: 'absolute', top: 20, right: 20, width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 13, fontWeight: '900', color: '#94a3b8' },
  stepTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  stepDesc: { fontSize: 14, color: '#64748b', fontWeight: '500', lineHeight: 22 },

  // Generic card grid — reused for Rewards and Learning
  featGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  featCard: { backgroundColor: 'white', borderRadius: 18, padding: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  featIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  featTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  featDesc: { fontSize: 13, color: '#64748b', fontWeight: '500', lineHeight: 20 },

  // Ecosystem chips (icon + label only)
  ecoCard: { backgroundColor: 'white', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'flex-start' },
  ecoLabel: { fontSize: 14, fontWeight: '800', color: '#0f172a' },

  // Rewards
  rewardsVisualRow: { flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 8 },

  // Footer
  footer: { backgroundColor: '#0f172a', paddingTop: 50 },
  footerContent: { flexDirection: 'row', gap: 32, paddingBottom: 40 },
  footerBrand: { flex: 1.2 },
  footerLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  footerLogoImg: { width: 170, height: 80 },
  footerDesc: { color: '#94a3b8', fontSize: 14, fontWeight: '500', lineHeight: 22, maxWidth: 320 },
  footerLinksRow: { flex: 2, flexDirection: 'row', justifyContent: 'space-between' },
  footerLinks: { gap: 12, flex: 1 },
  footerLinkTitle: { color: 'white', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  footerLink: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
  footerContactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  footerBottom: { borderTopWidth: 1, borderTopColor: '#1e293b', paddingVertical: 20 },
  footerCopy: { color: '#64748b', fontSize: 12, fontWeight: '500' },
});
