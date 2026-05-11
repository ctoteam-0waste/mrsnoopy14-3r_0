import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { ArrowRight, Box, Calendar, CheckSquare, Leaf, Wind, Trees } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: 'intro',
    bg: ['#064e3b', '#0f766e'],
    accent: '#16a34a',
    title: 'Welcome to\nKarma Credits',
    subtitle: 'Turn your everyday waste into rewards. Recycle, earn credits, and make the planet greener.',
    buttonText: 'Next',
  },
  {
    id: 'earn',
    bg: ['#1c1917', '#292524'],
    accent: '#f59e0b',
    title: 'Earn Credits\nBy Recycling',
    subtitle: 'Schedule waste pickups or upload photos of your waste. Our AI identifies items and credits your account instantly.',
    buttonText: 'Next',
  },
  {
    id: 'impact',
    bg: ['#0f172a', '#1e293b'],
    accent: '#0ea5e9',
    title: 'Real Environmental\nImpact',
    subtitle: 'Every pickup contributes to a greener planet. Track your CO₂ savings, waste recycled, and global impact.',
    buttonText: 'Next',
  },
  {
    id: 'redeem',
    bg: ['#2e1065', '#4c1d95'],
    accent: '#8b5cf6',
    title: 'Redeem Amazing\nEco Rewards',
    subtitle: 'Use your Karma Credits to redeem eco-friendly products, plant trees, and get exclusive sustainability rewards.',
    buttonText: 'Get Started',
  }
];

export function SplashScreen({ navigation }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

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
        <View style={{ paddingTop: 40, paddingHorizontal: 10, width: '100%' }}>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineIcon, { backgroundColor: '#3f3f46' }]}><Box size={16} color="#d4d4d8" /></View>
            <View style={[styles.timelineBox, { backgroundColor: 'rgba(255,255,255,0.05)' }]}><Text style={styles.timelineText}>Separate your waste</Text></View>
            <View style={styles.timelineReward}><KarmaCoin size={16} /><Text style={styles.timelineRewardText}>+20</Text></View>
            <View style={[styles.timelineLine, { height: 40, top: 40 }]} />
          </View>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineIcon, { backgroundColor: '#3f3f46' }]}><Calendar size={16} color="#fbbf24" /></View>
            <View style={[styles.timelineBox, { backgroundColor: 'rgba(255,255,255,0.05)' }]}><Text style={styles.timelineText}>Schedule a pickup</Text></View>
            <View style={styles.timelineReward}><KarmaCoin size={16} /><Text style={styles.timelineRewardText}>+40</Text></View>
            <View style={[styles.timelineLine, { height: 40, top: 40 }]} />
          </View>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineIcon, { backgroundColor: '#22c55e' }]}><CheckSquare size={16} color="white" /></View>
            <View style={[styles.timelineBox, { backgroundColor: 'rgba(255,255,255,0.05)' }]}><Text style={styles.timelineText}>Earn Karma Credits</Text></View>
            <View style={styles.timelineReward}><KarmaCoin size={16} /><Text style={styles.timelineRewardText}>+60</Text></View>
          </View>
          <View style={{ backgroundColor: 'rgba(245,158,11,0.1)', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16, marginTop: 24, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' }}>
            <Text style={{ color: '#fbbf24', fontSize: 16, marginRight: 8 }}>⭐</Text>
            <Text style={{ color: '#fbbf24', fontWeight: '600', fontSize: 13 }}>Earn up to 500 credits in your first week!</Text>
          </View>
        </View>
      );
    }
    if (id === 'impact') {
      return (
        <View style={{ paddingTop: 40, width: '100%', gap: 16 }}>
          <View style={styles.impactCard}>
            <View style={[styles.impactIconBg, { backgroundColor: 'rgba(16,185,129,0.15)' }]}><LexIcon color="#10b981" /></View>
            <View><Text style={styles.impactTitle}>2.8B kg</Text><Text style={styles.impactDesc}>Waste recycled globally</Text></View>
          </View>
          <View style={styles.impactCard}>
            <View style={[styles.impactIconBg, { backgroundColor: 'rgba(14,165,233,0.15)' }]}><Wind color="#0ea5e9" size={24} /></View>
            <View><Text style={styles.impactTitle}>1.2B kg</Text><Text style={styles.impactDesc}>CO₂ emissions prevented</Text></View>
          </View>
          <View style={styles.impactCard}>
            <View style={[styles.impactIconBg, { backgroundColor: 'rgba(34,197,94,0.15)' }]}><Trees color="#22c55e" size={24} /></View>
            <View><Text style={styles.impactTitle}>4M+</Text><Text style={styles.impactDesc}>Trees equivalent saved</Text></View>
          </View>
          <Text style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 10 }}>🌐 Global 3R Zero Waste Network • 2026</Text>
        </View>
      );
    }
    if (id === 'redeem') {
      return (
        <View style={{ paddingTop: 40, width: '100%' }}>
          <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
             <View style={[styles.rewardCard, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
               <Leaf size={32} color="#86efac" style={{ marginBottom: 12 }} />
               <Text style={styles.rewardTitle}>Bamboo Bottle</Text>
               <View style={styles.timelineReward}><KarmaCoin size={14} /><Text style={styles.timelineRewardText}>200</Text></View>
             </View>
             <View style={[styles.rewardCard, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
               <Trees size={32} color="#a3e635" style={{ marginBottom: 12 }} />
               <Text style={styles.rewardTitle}>Plant a Tree</Text>
               <View style={styles.timelineReward}><KarmaCoin size={14} /><Text style={styles.timelineRewardText}>500</Text></View>
             </View>
             <View style={[styles.rewardCard, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
               <Box size={32} color="#60a5fa" style={{ marginBottom: 12 }} />
               <Text style={styles.rewardTitle}>Eco Tote Bag</Text>
               <View style={styles.timelineReward}><KarmaCoin size={14} /><Text style={styles.timelineRewardText}>150</Text></View>
             </View>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 14, borderRadius: 16, marginTop: 20, alignItems: 'center' }}>
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>🎁 + 200 bonus credits just for signing up!</Text>
          </View>
        </View>
      );
    }
  };

  const LexIcon = ({color}: any) => <Leaf color={color} size={24} />;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={SLIDES[currentIndex].bg as [string, string]} style={StyleSheet.absoluteFillObject} />
      
      {/* Dynamic Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => navigation.replace('Login')}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 14 }}>Skip</Text>
        </TouchableOpacity>
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
              <Text style={styles.title}>{slide.title}</Text>
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
