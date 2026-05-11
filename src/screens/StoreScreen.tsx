import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShoppingBag, Sparkles, Leaf, ArrowRight } from 'lucide-react-native';

export function StoreScreen({ navigation }: any) {
  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" />
      <View style={styles.topNotchFiller} />
      
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <LinearGradient colors={['#064e3b', '#15803d']} style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerSubtitle}>SPEND YOUR REWARDS</Text>
              <Text style={styles.headerTitle}>Karma Store</Text>
            </View>
            <View style={styles.headerIconBox}>
              <ShoppingBag size={24} color="#fff" />
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Sparkles size={48} color="#15803d" />
            <View style={styles.floatingLeaf}>
              <Leaf size={24} color="#84cc16" />
            </View>
          </View>

          <Text style={styles.comingSoonText}>Coming Soon!</Text>
          <Text style={styles.descText}>
            We're curating a premium collection of zero-waste, eco-friendly products. Soon you'll be able to spend your Karma Coins here on sustainable goodies!
          </Text>

          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.actionBtnText}>Keep Recycling to Earn Coins</Text>
            <ArrowRight size={20} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: '#f4f4f5' }, 
  topNotchFiller: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, backgroundColor: '#064e3b' },
  container: { flex: 1 },
  header: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: '900', letterSpacing: 0.5 },
  headerSubtitle: { color: '#86efac', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  headerIconBox: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 32, shadowColor: '#16a34a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  floatingLeaf: { position: 'absolute', top: -10, right: -10, backgroundColor: 'white', padding: 8, borderRadius: 20, elevation: 5 },
  comingSoonText: { fontSize: 32, fontWeight: '900', color: '#0f172a', marginBottom: 16 },
  descText: { fontSize: 15, color: '#64748b', textAlign: 'center', fontWeight: '500', lineHeight: 24, marginBottom: 40 },
  
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#15803d', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 20, gap: 12, shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  actionBtnText: { color: 'white', fontWeight: '900', fontSize: 15 },
});
