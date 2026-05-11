import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Share, StatusBar } from 'react-native';
import { ChevronLeft, Share2, Copy, Network, ArrowDownRight, Users, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { KarmaCoin } from '../components/shared/KarmaCoin';

export function ReferralScreen({ navigation }: any) {

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Join me on Karma Credits and let us recycle together! Use my invite code KARMA-X9V2 to get 50 bonus credits. https://karmacredits.app',
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" />
      {/* This absolute view covers the iPhone physical notch/status bar area in purple */}
      <View style={styles.topNotchFiller} />
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

          {/* Purple Hero Section */}
          <LinearGradient colors={['#7e22ce', '#db2777']} style={styles.heroSection}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <ChevronLeft size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Network</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.heroContent}>
              <Network size={48} color="white" style={styles.heroIcon} />
              <Text style={styles.heroTitle}>Invite & Earn Passively</Text>
              <Text style={styles.heroSub}>Get 10% of the Karma Credits every time your friends recycle. Forever.</Text>

              {/* Code Box */}
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>YOUR INVITE CODE</Text>
                <View style={styles.codeRow}>
                  <Text style={styles.codeValue}>KARMA-X9V2</Text>
                  <TouchableOpacity style={styles.copyBtn}>
                    <Copy size={20} color="#db2777" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Share CTA */}
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <Share2 size={20} color="white" />
                <Text style={styles.shareBtnText}>Share via WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Passive Income Summary Widget */}
          <View style={styles.statsWidget}>
            <Text style={styles.statsTitle}>Your Passive Income</Text>
            <View style={styles.statsRow}>
              <View style={styles.statsDataBox}>
                <Text style={styles.statsDataLabel}>Network Size</Text>
                <View style={styles.statsDataNumRow}>
                  <Users size={16} color="#0284c7" />
                  <Text style={styles.statsDataNum}>14</Text>
                </View>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsDataBox}>
                <Text style={styles.statsDataLabel}>Credits Earned</Text>
                <View style={styles.statsDataNumRow}>
                  <KarmaCoin size={18} />
                  <Text style={[styles.statsDataNum, { color: '#d97706' }]}>+840</Text>
                </View>
              </View>
            </View>
          </View>

          {/* The MLM Tree UI */}
          <View style={styles.treeSection}>
            <Text style={styles.sectionTitle}>Your Network Tree</Text>

            {/* Level 1 Wrapper */}
            <View style={styles.tierGroup}>
              <View style={styles.tierHeader}>
                <View style={styles.tierBadgeL1}><Text style={styles.tierBadgeTextL1}>L1</Text></View>
                <Text style={styles.tierTitle}>Direct Referrals (10% Cut)</Text>
              </View>

              {/* User Amit */}
              <View style={styles.userCard}>
                <View style={styles.userAvatar}><Text style={styles.avatarTxt}>A</Text></View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>Amit Sharma</Text>
                  <Text style={styles.userDesc}>Joined 12 Mar • Active</Text>
                </View>
                <View style={styles.yieldBox}>
                  <KarmaCoin size={14} />
                  <Text style={styles.yieldText}>+120</Text>
                </View>
              </View>

              {/* Level 2 Indent (Amit's referall) */}
              <View style={styles.level2Indent}>
                <ArrowDownRight size={20} color="#cbd5e1" style={styles.connectorIcon} />
                <View style={styles.userCardL2}>
                  <View style={styles.tierBadgeL2}><Text style={styles.tierBadgeTextL2}>L2</Text></View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>Rohit V.</Text>
                    <Text style={styles.userDesc}>indirect (2% Cut)</Text>
                  </View>
                  <View style={styles.yieldBox}>
                    <KarmaCoin size={14} />
                    <Text style={styles.yieldText}>+14</Text>
                  </View>
                </View>
              </View>

              {/* User Priya */}
              <View style={styles.userCard}>
                <View style={[styles.userAvatar, { backgroundColor: '#fdf4ff' }]}><Text style={[styles.avatarTxt, { color: '#c026d3' }]}>P</Text></View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>Priya Das</Text>
                  <Text style={styles.userDesc}>Joined 20 Mar • Active</Text>
                </View>
                <View style={styles.yieldBox}>
                  <KarmaCoin size={14} />
                  <Text style={styles.yieldText}>+45</Text>
                </View>
              </View>

            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: '#f8fafc' },
  topNotchFiller: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, backgroundColor: '#7e22ce' },
  container: { flex: 1 },
  heroSection: { borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingTop: 10, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '800' },

  heroContent: { paddingHorizontal: 24, marginTop: 32, alignItems: 'center' },
  heroIcon: { marginBottom: 16 },
  heroTitle: { color: 'white', fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: 14, textAlign: 'center', lineHeight: 22, fontWeight: '500', marginBottom: 24 },

  codeBox: { width: '100%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', marginBottom: 24 },
  codeLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeValue: { color: 'white', fontSize: 32, fontWeight: '900', letterSpacing: 2 },
  copyBtn: { backgroundColor: 'white', width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  shareBtn: { flexDirection: 'row', backgroundColor: '#25D366', width: '100%', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 12, elevation: 8, shadowColor: '#25D366', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  shareBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },

  statsWidget: { marginHorizontal: 20, marginTop: -30, backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16 },
  statsTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statsDataBox: { flex: 1 },
  statsDataLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 6 },
  statsDataNumRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statsDataNum: { fontSize: 24, fontWeight: '800', color: '#16a34a' },
  statsDivider: { width: 1, height: 40, backgroundColor: '#e2e8f0', marginHorizontal: 20 },

  treeSection: { paddingHorizontal: 20, marginTop: 40 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 24 },

  tierGroup: { marginBottom: 24 },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  tierBadgeL1: { backgroundColor: '#fdf2f8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tierBadgeTextL1: { color: '#db2777', fontWeight: '800', fontSize: 12 },
  tierTitle: { fontSize: 14, fontWeight: '700', color: '#334155' },

  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 1 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  avatarTxt: { fontSize: 18, fontWeight: '800', color: '#0284c7' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  userDesc: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  yieldBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
  yieldText: { fontSize: 14, fontWeight: '800', color: '#d97706' },

  level2Indent: { flexDirection: 'row', marginLeft: 22, marginTop: -4, marginBottom: 12 },
  connectorIcon: { marginTop: 12, marginRight: 8 },
  userCardL2: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  tierBadgeL2: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 12 },
  tierBadgeTextL2: { color: '#64748b', fontWeight: '800', fontSize: 10 },
});
