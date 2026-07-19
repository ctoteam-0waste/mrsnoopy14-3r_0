import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { ArrowRight, Box, Calendar, CheckSquare, Leaf, Wind, Trees } from 'lucide-react-native';
import { SCREEN_WIDTH as width, SCREEN_HEIGHT as height } from '../utils/layout';

const SLIDES = [
  {
    id: 'intro',
    bg: ['#064e3b', '#0f766e'],
    accent: '#4ade80',
    title: '',
    subtitle: "India's first circular economy rewards platform — doorstep recycling pickups for everyone.",
    buttonText: 'Next',
  },
  {
    id: 'earn',
    bg: ['#065f46', '#047857'],
    accent: '#fbbf24',
    title: '',
    subtitle: 'Schedule pickups for plastic, paper, metal, e-waste & more. Our agent verifies items and credits KarmaCoins XP instantly.',
    buttonText: 'Next',
  },
  {
    id: 'impact',
    bg: ['#0f766e', '#0d9488'],
    accent: '#38bdf8',
    title: 'Real impact,\nreal numbers',
    subtitle: 'Every pickup you schedule adds to a growing wave of change across Delhi NCR.',
    buttonText: 'Next',
  },
  {
    id: 'redeem',
    bg: ['#166534', '#15803d'],
    accent: '#fcd34d',
    title: 'Redeem amazing\neco rewards',
    subtitle: 'Use your KarmaCoins XP to redeem eco-friendly products, plant trees, and get exclusive sustainability rewards.',
    buttonText: 'Next',
  },
  {
    id: 'welcome',
    bg: ['#064e3b', '#065f46'],
    accent: '#4ade80',
    title: 'Welcome to\nKarmaVerse',
    subtitle: "You're now part of India's fastest-growing circular economy community. Let's make every kg count.",
    buttonText: 'Get started',
  }
];

const WASTE_WORDS = [
  { word: 'plastic',    color: '#4ade80' },
  { word: 'paper',      color: '#fbbf24' },
  { word: 'metal',      color: '#60a5fa' },
  { word: 'e-waste',    color: '#f472b6' },
  { word: 'cardboard',  color: '#a78bfa' },
  { word: 'mobiles',    color: '#38bdf8' },
  { word: 'computers',  color: '#f97316' },
  { word: 'TVs',        color: '#facc15' },
  { word: 'appliances', color: '#22d3ee' },
  { word: 'batteries',  color: '#ef4444' },
  { word: 'glass',      color: '#34d399' },
];

const EARN_WORDS = [
  { word: 'recycling',       color: '#fbbf24' },
  { word: 'upcycling',       color: '#4ade80' },
  { word: 'going green',     color: '#86efac' },
  { word: 'giving back',     color: '#60a5fa' },
];

export function SplashScreen({ navigation }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const [wordIndex, setWordIndex] = useState(0);
  const wordOpacity = useRef(new Animated.Value(1)).current;
  const wordTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(wordOpacity, { toValue: 0, duration: 250, useNativeDriver: false }),
        Animated.timing(wordTranslateY, { toValue: -8, duration: 250, useNativeDriver: false }),
      ]).start(() => {
        setWordIndex(i => (i + 1) % WASTE_WORDS.length);
        wordTranslateY.setValue(8);
        Animated.parallel([
          Animated.timing(wordOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
          Animated.timing(wordTranslateY, { toValue: 0, duration: 250, useNativeDriver: false }),
        ]).start();
      });
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const [earnWordIndex, setEarnWordIndex] = useState(0);
  const earnWordOpacity = useRef(new Animated.Value(1)).current;
  const earnWordTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(earnWordOpacity, { toValue: 0, duration: 250, useNativeDriver: false }),
        Animated.timing(earnWordTranslateY, { toValue: -8, duration: 250, useNativeDriver: false }),
      ]).start(() => {
        setEarnWordIndex(i => (i + 1) % EARN_WORDS.length);
        earnWordTranslateY.setValue(8);
        Animated.parallel([
          Animated.timing(earnWordOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
          Animated.timing(earnWordTranslateY, { toValue: 0, duration: 250, useNativeDriver: false }),
        ]).start();
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (currentIndex + 1) * width, animated: true });
    } else {
      navigation.replace('Login');
    }
  };

  const LexIcon = ({color}: any) => <Leaf color={color} size={24} />;

  const renderVisual = (id: string) => {
    if (id === 'intro') {
      return (
        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <KarmaCoin size={140} glow animated />
          <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, marginTop: 40, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#4ade80', marginRight: 6, alignItems: 'center', justifyContent: 'center' }}><Text style={{fontSize: 6, fontWeight: '900', color: '#000'}}>3R</Text></View>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Powered by <Text style={{ color: 'white', fontWeight: 'bold' }}>3R Zero Waste</Text></Text>
          </View>
        </View>
      );
    }
    if (id === 'earn') {
      return (
        <View style={{ paddingHorizontal: 10, width: '100%' }}>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineIcon, { backgroundColor: '#3f3f46' }]}><Calendar size={16} color="#fbbf24" /></View>
            <View style={[styles.timelineBox, { backgroundColor: 'rgba(255,255,255,0.05)' }]}><Text style={styles.timelineText}>Schedule a free doorstep pickup</Text></View>
            <View style={[styles.timelineLine, { height: 40, top: 40 }]} />
          </View>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineIcon, { backgroundColor: '#3f3f46' }]}><Box size={16} color="#60a5fa" /></View>
            <View style={[styles.timelineBox, { backgroundColor: 'rgba(255,255,255,0.05)' }]}><Text style={styles.timelineText}>Agent collects & verifies items</Text></View>
            <View style={[styles.timelineLine, { height: 40, top: 40 }]} />
          </View>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineIcon, { backgroundColor: '#22c55e' }]}><CheckSquare size={16} color="white" /></View>
            <View style={[styles.timelineBox, { backgroundColor: 'rgba(255,255,255,0.05)' }]}><Text style={styles.timelineText}>Earn KarmaCoins XP instantly</Text></View>
          </View>
          <View style={{ backgroundColor: 'rgba(74,222,128,0.1)', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16, marginTop: 24, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)' }}>
            <KarmaCoin size={18} />
            <Text style={{ flex: 1, flexShrink: 1, color: '#4ade80', fontWeight: '700', fontSize: 13, marginLeft: 10, textAlign: 'left' }}>Earn KarmaCoins XP on every pickup</Text>
          </View>
        </View>
      );
    }
    if (id === 'impact') {
      return (
        <View style={{ paddingTop: 40, width: '100%', gap: 16 }}>
          <View style={styles.impactCard}>
            <View style={[styles.impactIconBg, { backgroundColor: 'rgba(16,185,129,0.15)' }]}><LexIcon color="#10b981" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.impactTitle}>1.855 Lakhs+</Text>
              <Text style={styles.impactDesc}>Citizens provided awareness</Text>
            </View>
          </View>
          <View style={styles.impactCard}>
            <View style={[styles.impactIconBg, { backgroundColor: 'rgba(14,165,233,0.15)' }]}><Wind color="#0ea5e9" size={24} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.impactTitle}>100% free</Text>
              <Text style={styles.impactDesc}>Doorstep pickup service for all</Text>
            </View>
          </View>
          <View style={styles.impactCard}>
            <View style={[styles.impactIconBg, { backgroundColor: 'rgba(34,197,94,0.15)' }]}><Trees color="#22c55e" size={24} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.impactTitle}>Growing daily</Text>
              <Text style={styles.impactDesc}>Circular economy network across Delhi NCR</Text>
            </View>
          </View>
          <Text style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 10 }}>3R Zero Waste • Haryana, India • 2026</Text>
        </View>
      );
    }
    if (id === 'redeem') {
      return (
        <View style={{ width: '100%' }}>
          <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
             <View style={[styles.rewardCard, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
               <Box size={32} color="#60a5fa" style={{ marginBottom: 12 }} />
               <Text style={styles.rewardTitle}>Eco Tote Bag</Text>
               <View style={styles.timelineReward}><KarmaCoin size={14} /><Text style={styles.timelineRewardText}>1,500</Text></View>
             </View>
             <View style={[styles.rewardCard, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
               <Leaf size={32} color="#86efac" style={{ marginBottom: 12 }} />
               <Text style={styles.rewardTitle}>Bamboo Bottle</Text>
               <View style={styles.timelineReward}><KarmaCoin size={14} /><Text style={styles.timelineRewardText}>2,000</Text></View>
             </View>
             <View style={[styles.rewardCard, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
               <Trees size={32} color="#a3e635" style={{ marginBottom: 12 }} />
               <Text style={styles.rewardTitle}>Plant a Tree</Text>
               <View style={styles.timelineReward}><KarmaCoin size={14} /><Text style={styles.timelineRewardText}>5,000</Text></View>
             </View>
          </View>
          <View style={{ backgroundColor: 'rgba(74,222,128,0.08)', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)' }}>
            <Text style={{ fontSize: 20 }}>🤝</Text>
            <Text style={{ color: '#4ade80', fontWeight: '700', fontSize: 13, flex: 1 }}>Refer a friend — both get 1,000 KarmaCoins XP instantly!</Text>
          </View>
        </View>
      );
    }
    if (id === 'welcome') {
      return (
        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, gap: 24 }}>
          <KarmaCoin size={120} glow animated />
          <View style={{ alignItems: 'center', gap: 8 }}>
            <View style={{ backgroundColor: 'rgba(74,222,128,0.15)', paddingVertical: 6, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)' }}>
              <Text style={{ color: '#4ade80', fontWeight: '800', fontSize: 12, letterSpacing: 1.5 }}>3R ZERO WASTE</Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '500' }}>Haryana, India • Est. 2024</Text>
          </View>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={SLIDES[currentIndex].bg as [string, string]} style={StyleSheet.absoluteFillObject} />
      
      {/* Dynamic Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }} />
        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={() => navigation.replace('Login')}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 14 }}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            <View style={styles.visualContainer}>
              {renderVisual(slide.id)}
            </View>
            
            <View style={styles.contentContainer}>
              {slide.id === 'intro' ? (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.title}>Turn your</Text>
                  <Animated.Text style={[styles.title, {
                    color: WASTE_WORDS[wordIndex].color,
                    opacity: wordOpacity,
                    transform: [{ translateY: wordTranslateY }],
                  }]}>
                    {WASTE_WORDS[wordIndex].word}
                  </Animated.Text>
                  <Text style={styles.title}>into KarmaCoins XP</Text>
                </View>
              ) : slide.id === 'earn' ? (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.title}>Earn KarmaCoins XP</Text>
                  <Text style={styles.title}>by</Text>
                  <Animated.Text style={[styles.title, {
                    color: EARN_WORDS[earnWordIndex].color,
                    opacity: earnWordOpacity,
                    transform: [{ translateY: earnWordTranslateY }],
                  }]}>
                    {EARN_WORDS[earnWordIndex].word}
                  </Animated.Text>
                </View>
              ) : (
                <Text style={styles.title}>{slide.title}</Text>
              )}
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
              
              <View style={styles.pagination}>
                {SLIDES.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: i === currentIndex ? slide.accent : 'rgba(255,255,255,0.2)',
                        width: i === currentIndex ? 24 : 6,
                      }
                    ]}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: slide.accent }]}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>{slide.buttonText}</Text>
                <ArrowRight size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#064e3b',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  visualContainer: {
    flex: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    lineHeight: 38,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
    marginBottom: 32,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  button: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  // Sub-components styling
  timelineItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, position: 'relative' },
  timelineLine: { position: 'absolute', width: 2, backgroundColor: 'rgba(255,255,255,0.1)', left: 15, zIndex: -1 },
  timelineIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  timelineBox: { flex: 1, marginLeft: 16, padding: 16, borderRadius: 12 },
  timelineText: { color: 'white', fontWeight: 'bold' },
  timelineReward: { flexDirection: 'row', alignItems: 'center', marginLeft: 12, gap: 4 },
  timelineRewardText: { color: '#f59e0b', fontWeight: 'bold' },
  impactCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  impactIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  impactTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  impactDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  rewardCard: { flex: 1, paddingVertical: 20, paddingHorizontal: 10, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  rewardTitle: { color: 'white', fontSize: 11, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, height: 32 },
});
