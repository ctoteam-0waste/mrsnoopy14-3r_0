import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Image, Linking, NativeSyntheticEvent, NativeScrollEvent
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Truck, Gamepad2, Gift, Star, Shield, ChevronRight,
  Recycle, Users, Coins, ArrowRight, Smartphone, CheckCircle2,
  Package, Clock, BookOpen, Zap, Mail, MapPin, FileText, Cpu
} from 'lucide-react-native';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { MascotPopupBanner } from '../components/shared/MascotPopupBanner';

const { width: W } = Dimensions.get('window');
const isMobile = W < 768;
const MAX = 1100;

export function SplashScreen({ navigation, route }: any) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef({ howItWorks: 0, features: 0, rewards: 0 });
  const [nearFooter, setNearFooter] = useState(false);

  const scrollToSection = (key: 'howItWorks' | 'features' | 'rewards') => {
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

  // Arriving from a Quick Links entry point (e.g. WebFooter) with a target section —
  // wait a tick for onLayout to populate sectionY before scrolling to it.
  useEffect(() => {
    const target = route?.params?.scrollTo as 'howItWorks' | 'features' | 'rewards' | undefined;
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
                <Text style={s.navTabText}>How it works</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => scrollToSection('features')}>
                <Text style={s.navTabText}>Features</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => scrollToSection('rewards')}>
                <Text style={s.navTabText}>Rewards</Text>
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
          <View style={[s.heroCircle, { top: -80, right: -60, width: 300, height: 300, opacity: 0.08 }]} />
          <View style={[s.heroCircle, { bottom: -40, left: -80, width: 250, height: 250, opacity: 0.06 }]} />

          <Animated.View style={[s.heroContent, isMobile && { paddingHorizontal: 20 }, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
            {/* Badge */}
            <View style={s.heroBadge}>
              <View style={s.heroBadgeDot} />
              <Text style={s.heroBadgeText}>Free doorstep pickup across India</Text>
            </View>

            <Text style={[s.heroTitle, isMobile && { fontSize: 36 }]}>
              Turn your Plastic, Paper, Metal,{'\n'}E-waste & more into KarmaCoins XP.
            </Text>
            <Text style={[s.heroSub, isMobile && { fontSize: 16 }]}>
              India's first circular economy rewards platform — schedule free doorstep pickups for plastic, paper, metal, e-waste & more. Earn real rewards for every kg you recycle.
            </Text>

            <View style={s.poweredByBadge}>
              <View style={s.poweredByDot}><Text style={s.poweredByDotText}>3R</Text></View>
              <Text style={s.poweredByText}>Powered by <Text style={{ color: 'white', fontWeight: '800' }}>3R Zero Waste</Text></Text>
            </View>

            {/* CTA */}
            <View style={[s.heroCTA, isMobile && { flexDirection: 'column', gap: 12 }]}>
              <TouchableOpacity style={s.ctaPrimary} onPress={() => navigation.navigate('Login')}>
                <Text style={s.ctaPrimaryText}>Get started free</Text>
                <ArrowRight size={18} color="#052e16" />
              </TouchableOpacity>
              <TouchableOpacity style={s.ctaSecondary} activeOpacity={1}>
                <Smartphone size={16} color="#4ade80" />
                <Text style={s.ctaSecondaryText}>Download app</Text>
                <Text style={s.ctaSecondaryBadge}>Coming soon</Text>
              </TouchableOpacity>
            </View>

            {/* Trust badges */}
            <View style={[s.trustRow, isMobile && { flexDirection: 'column', gap: 12 }]}>
              <View style={s.trustItem}>
                <Users size={16} color="#4ade80" />
                <Text style={s.trustText}>1.85 Lakh+ citizens reached</Text>
              </View>
              <View style={s.trustItem}>
                <Package size={16} color="#4ade80" />
                <Text style={s.trustText}>100% free pickup service</Text>
              </View>
              <View style={s.trustItem}>
                <Coins size={16} color="#4ade80" />
                <Text style={s.trustText}>Earn KarmaCoins XP on every pickup</Text>
              </View>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* ── 3R ZERO WASTE / 4-BIN SYSTEM ── */}
        <View style={[s.section, { paddingVertical: 40, backgroundColor: '#f8fafc' }]}>
          <View style={[s.container, isMobile && { paddingHorizontal: 20 }]}>
            <Text style={s.sectionLabel}>3R ZERO WASTE · THE 4-BIN SYSTEM</Text>
            <Text style={[s.sectionTitle, { fontSize: 24, marginBottom: 28 }, isMobile && { fontSize: 22 }]}>
              Segregate into 4 bins — plastic, paper, metal & e-waste
            </Text>
            <View style={[s.binsRow, isMobile && { flexWrap: 'wrap' }]}>
              {[
                { icon: Recycle, color: '#16a34a', bg: '#f0fdf4', label: 'Plastic' },
                { icon: FileText, color: '#0891b2', bg: '#ecfeff', label: 'Paper' },
                { icon: Package, color: '#d97706', bg: '#fffbeb', label: 'Metal' },
                { icon: Cpu, color: '#7c3aed', bg: '#f5f3ff', label: 'E-waste' },
              ].map((bin, i) => (
                <View key={i} style={[s.binCard, isMobile && { width: '47%' }]}>
                  <View style={[s.binIconBg, { backgroundColor: bin.bg }]}>
                    <bin.icon size={26} color={bin.color} />
                  </View>
                  <Text style={s.binLabel}>{bin.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── HOW IT WORKS ── */}
        <View style={s.section} onLayout={(e) => { sectionY.current.howItWorks = e.nativeEvent.layout.y; }}>
          <View style={[s.container, isMobile && { paddingHorizontal: 20 }]}>
            <Text style={s.sectionLabel}>HOW IT WORKS</Text>
            <Text style={[s.sectionTitle, isMobile && { fontSize: 28 }]}>Start recycling in 3 simple steps</Text>

            <View style={[s.stepsRow, isMobile && { flexDirection: 'column' }]}>
              {[
                { num: '1', icon: Truck, color: '#16a34a', bg: '#f0fdf4', title: 'Schedule a free pickup', desc: 'Choose your waste type, pick a date & time slot. Our verified agent comes to your door.' },
                { num: '2', icon: Shield, color: '#0891b2', bg: '#ecfeff', title: 'Agent collects & verifies', desc: 'Agent weighs items on the spot, verifies waste type, and completes the collection safely.' },
                { num: '3', icon: Coins, color: '#d97706', bg: '#fffbeb', title: 'Earn KarmaCoins XP instantly', desc: 'Coins are credited to your wallet immediately after verification. Redeem anytime.' },
              ].map((step, i) => (
                <View key={i} style={s.stepCard}>
                  <View style={[s.stepIconBg, { backgroundColor: step.bg }]}>
                    <step.icon size={28} color={step.color} />
                  </View>
                  <View style={s.stepNum}><Text style={s.stepNumText}>{step.num}</Text></View>
                  <Text style={s.stepTitle}>{step.title}</Text>
                  <Text style={s.stepDesc}>{step.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── FEATURES ── */}
        <View style={[s.section, { backgroundColor: '#f8fafc' }]} onLayout={(e) => { sectionY.current.features = e.nativeEvent.layout.y; }}>
          <View style={[s.container, isMobile && { paddingHorizontal: 20 }]}>
            <Text style={s.sectionLabel}>FEATURES</Text>
            <Text style={[s.sectionTitle, isMobile && { fontSize: 28 }]}>Everything you need to go green</Text>

            <View style={[s.featGrid, isMobile && { flexDirection: 'column' }]}>
              {[
                { icon: Truck, color: '#16a34a', title: 'Free doorstep pickup', desc: 'Schedule anytime, our agents come to you' },
                { icon: Gamepad2, color: '#7c3aed', title: 'Daily eco-quiz', desc: 'Test your green IQ. Earn KarmaCoins XP daily.' },
                { icon: Recycle, color: '#0891b2', title: '8 waste categories', desc: 'Plastic, paper, metal, e-waste, textile & more' },
                { icon: Gift, color: '#e11d48', title: 'Real rewards', desc: 'Redeem coins for products or donate to causes' },
                { icon: Users, color: '#ea580c', title: 'Refer & earn', desc: 'Both you and your friend get 1,000 KarmaCoins XP instantly' },
                { icon: Zap, color: '#d97706', title: 'Instant credit', desc: 'Coins credited immediately after verification' },
              ].map((feat, i) => (
                <View key={i} style={[s.featCard, isMobile && { width: '100%' }]}>
                  <View style={[s.featIconBg, { backgroundColor: feat.color + '15' }]}>
                    <feat.icon size={22} color={feat.color} />
                  </View>
                  <Text style={s.featTitle}>{feat.title}</Text>
                  <Text style={s.featDesc}>{feat.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── COIN BANNER ── */}
        <LinearGradient colors={['#052e16', '#15803d']} style={s.coinBanner} onLayout={(e) => { sectionY.current.rewards = e.nativeEvent.layout.y; }}>
          <View style={[s.container, s.coinContent, isMobile && { flexDirection: 'column', paddingHorizontal: 20 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.sectionLabel, { color: '#4ade80' }]}>REWARDS</Text>
              <Text style={[s.coinTitle, isMobile && { fontSize: 28 }]}>Be part of India's circular economy</Text>
              <Text style={s.coinSub}>Turn your household waste into KarmaCoins XP — schedule a free pickup and start making a real difference today.</Text>
              <TouchableOpacity style={s.coinBtn} onPress={() => navigation.navigate('Login')}>
                <Text style={s.coinBtnText}>Create free account</Text>
                <ArrowRight size={18} color="#052e16" />
              </TouchableOpacity>
            </View>
            <View style={s.coinVisual}>
              <KarmaCoin size={80} glow animated />
            </View>
          </View>
        </LinearGradient>

        {/* ── FOOTER ── */}
        <View style={s.footer}>
          <View style={[s.container, s.footerContent, isMobile && { flexDirection: 'column', gap: 28, paddingHorizontal: 20 }]}>
            <View style={[s.footerBrand, isMobile && { width: '100%' }]}>
              <View style={s.footerLogoRow}>
                <Image source={require('../../assets/logo.png')} resizeMode="contain" style={s.footerLogoImg} />
              </View>
              <Text style={s.footerDesc}>
                3R Zero Waste® was founded to do waste management differently — turning India's growing waste into value through the circular economy. KarmaVerse is its doorstep recycling rewards app.
              </Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://0waste.co.in/')}>
                <Text style={[s.footerLink, { marginTop: 10, color: '#4ade80', fontWeight: '700' }]}>0waste.co.in ↗</Text>
              </TouchableOpacity>
            </View>

            <View style={[s.footerLinksRow, isMobile && { flexDirection: 'column', gap: 24 }]}>
              <View style={s.footerLinks}>
                <Text style={s.footerLinkTitle}>Product</Text>
                <TouchableOpacity onPress={() => scrollToSection('howItWorks')}>
                  <Text style={s.footerLink}>How it works</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => scrollToSection('features')}>
                  <Text style={s.footerLink}>Features</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => scrollToSection('rewards')}>
                  <Text style={s.footerLink}>Rewards</Text>
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
                  <Text style={[s.footerLink, { flex: 1 }]}>Plot 62, Sector 8 Rd, IMT Manesar, Gurugram, Haryana 122503</Text>
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
  navTabs: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  navTabText: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '700' },

  // Hero
  hero: { paddingBottom: 60, minHeight: 500 },
  heroCircle: { position: 'absolute', borderRadius: 999, backgroundColor: 'white' },
  heroContent: { maxWidth: MAX, width: '100%', alignSelf: 'center', paddingHorizontal: 32, paddingTop: 60 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 24 },
  heroBadgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' },
  heroBadgeText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  heroTitle: { fontSize: 52, fontWeight: '900', color: 'white', letterSpacing: -1.5, lineHeight: 62, marginBottom: 20 },
  heroSub: { fontSize: 18, color: 'rgba(255,255,255,0.7)', fontWeight: '500', lineHeight: 28, maxWidth: 600, marginBottom: 36 },
  heroCTA: { flexDirection: 'row', gap: 16, marginBottom: 40 },
  ctaPrimary: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#4ade80', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 16 },
  ctaPrimaryText: { color: '#052e16', fontWeight: '900', fontSize: 16 },
  ctaSecondary: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 16 },
  ctaSecondaryText: { color: '#4ade80', fontWeight: '700', fontSize: 15 },
  ctaSecondaryBadge: { color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: 11 },
  trustRow: { flexDirection: 'row', gap: 28 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
  poweredByBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  poweredByDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#4ade80', alignItems: 'center', justifyContent: 'center' },
  poweredByDotText: { fontSize: 8, fontWeight: '900', color: '#052e16' },
  poweredByText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },

  // Sections
  section: { paddingVertical: 60 },
  container: { maxWidth: MAX, width: '100%', alignSelf: 'center', paddingHorizontal: 32 },
  sectionLabel: { fontSize: 12, fontWeight: '900', color: '#16a34a', letterSpacing: 2, marginBottom: 10 },
  sectionTitle: { fontSize: 36, fontWeight: '900', color: '#0f172a', letterSpacing: -1, marginBottom: 40, lineHeight: 44 },

  // 4-bin waste category cards
  binsRow: { flexDirection: 'row', gap: 16 },
  binCard: { flex: 1, backgroundColor: 'white', borderRadius: 18, paddingVertical: 22, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  binIconBg: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  binLabel: { fontSize: 14, fontWeight: '800', color: '#0f172a' },

  // Steps
  stepsRow: { flexDirection: 'row', gap: 20 },
  stepCard: { flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 28, borderWidth: 1, borderColor: '#f1f5f9', position: 'relative' },
  stepIconBg: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  stepNum: { position: 'absolute', top: 20, right: 20, width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 13, fontWeight: '900', color: '#94a3b8' },
  stepTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  stepDesc: { fontSize: 14, color: '#64748b', fontWeight: '500', lineHeight: 22 },

  // Features
  featGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  featCard: { width: '31%', backgroundColor: 'white', borderRadius: 18, padding: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  featIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  featTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  featDesc: { fontSize: 13, color: '#64748b', fontWeight: '500', lineHeight: 20 },

  // Coin banner
  coinBanner: { paddingVertical: 50 },
  coinContent: { flexDirection: 'row', alignItems: 'center', gap: 40 },
  coinTitle: { fontSize: 36, fontWeight: '900', color: 'white', letterSpacing: -1, marginBottom: 14, lineHeight: 44 },
  coinSub: { fontSize: 16, color: 'rgba(255,255,255,0.7)', fontWeight: '500', lineHeight: 26, marginBottom: 28, maxWidth: 500 },
  coinBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#4ade80', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 16, alignSelf: 'flex-start' },
  coinBtnText: { color: '#052e16', fontWeight: '900', fontSize: 16 },
  coinVisual: { alignItems: 'center', justifyContent: 'center' },

  // Footer
  footer: { backgroundColor: '#0f172a', paddingTop: 50 },
  footerContent: { flexDirection: 'row', gap: 32, paddingBottom: 40 },
  footerBrand: { flex: 1.2 },
  footerLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  footerLogoImg: { width: 150, height: 100 },
  footerDesc: { color: '#94a3b8', fontSize: 14, fontWeight: '500', lineHeight: 22, maxWidth: 320 },
  footerLinksRow: { flex: 2, flexDirection: 'row', justifyContent: 'space-between' },
  footerLinks: { gap: 12, flex: 1 },
  footerLinkTitle: { color: 'white', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  footerLink: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
  footerContactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  footerBottom: { borderTopWidth: 1, borderTopColor: '#1e293b', paddingVertical: 20 },
  footerCopy: { color: '#64748b', fontSize: 12, fontWeight: '500' },
});
