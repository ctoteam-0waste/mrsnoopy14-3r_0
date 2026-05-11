import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowDownLeft, ArrowUpRight, Heart, History, Clock } from 'lucide-react-native';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { profileService } from '../services/profile';

export function WalletScreen() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        const [profileData, txData] = await Promise.all([
          profileService.getProfile().catch(() => ({})),
          profileService.getTransactionHistory().catch(() => []),
        ]);
        setBalance(profileData.karmaCoins || profileData.coins || 0);
        setTransactions(Array.isArray(txData) ? txData : []);
      } catch (error) {
        console.error('Wallet fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWalletData();
  }, []);

  const formatTx = (tx: any) => {
    const isCredit = tx.type === 'CREDIT';
    const dateStr = tx.createdAt
      ? new Date(tx.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '';
    return {
      id: tx._id || tx.id,
      type: tx.description || (isCredit ? 'Credit' : 'Debit'),
      amount: tx.amount || 0,
      isCredit,
      date: dateStr,
    };
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" />
      <View style={styles.topNotchFiller} />
      <SafeAreaView style={styles.container}>
        
        {/* Dynamic Header */}
        <LinearGradient colors={['#064e3b', '#15803d']} style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>My Wallet</Text>
            <TouchableOpacity style={styles.historyBtn}>
              <History size={20} color="#15803d" />
            </TouchableOpacity>
          </View>

          <View style={styles.balanceCard}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardLabel}>TOTAL KARMA CREDITS</Text>
              <View style={styles.activeTag}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>Active</Text>
              </View>
            </View>
            
            <View style={styles.balanceRow}>
              <KarmaCoin size={56} glow animated />
              <Text style={styles.balanceText}>{balance.toLocaleString()}</Text>
            </View>

            <View style={styles.cardBottomRow}>
              <Text style={styles.cardSub}>≈ ₹{(balance * 0.5).toFixed(0)} Value Equivalent</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn}>
              <ArrowDownLeft size={24} color="#16a34a" />
              <Text style={[styles.actionLabel, { color: '#16a34a' }]}>Redeem</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionBtn}>
              <ArrowUpRight size={24} color="#d97706" />
              <Text style={[styles.actionLabel, { color: '#d97706' }]}>Transfer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn}>
              <Heart size={24} color="#e11d48" />
              <Text style={[styles.actionLabel, { color: '#e11d48' }]}>Donate</Text>
            </TouchableOpacity>
          </View>

          {/* Transaction History */}
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            
            {isLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#16a34a" />
                <Text style={{ color: '#64748b', marginTop: 12 }}>Loading transactions...</Text>
              </View>
            ) : transactions.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <History size={48} color="#cbd5e1" />
                <Text style={{ color: '#94a3b8', marginTop: 12, fontWeight: '600' }}>No transactions yet.</Text>
                <Text style={{ color: '#cbd5e1', fontSize: 12, marginTop: 4 }}>Complete a pickup to earn KarmaCoins!</Text>
              </View>
            ) : (
              <View style={styles.txList}>
                {transactions.map(formatTx).map((tx) => (
                  <View key={tx.id} style={styles.txCard}>
                    <View style={[styles.txIconBg, { backgroundColor: tx.isCredit ? '#f0fdf4' : '#fef2f2' }]}>
                      {tx.isCredit ? (
                        <ArrowDownLeft size={20} color="#16a34a" />
                      ) : (
                        <ArrowUpRight size={20} color="#e11d48" />
                      )}
                    </View>
                    
                    <View style={styles.txContent}>
                      <Text style={styles.txType}>{tx.type}</Text>
                      <View style={styles.txTimeRow}>
                        <Clock size={12} color="#9ca3af" />
                        <Text style={styles.txDate}>{tx.date}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.txAmountContainer}>
                      <Text style={[styles.txAmount, { color: tx.isCredit ? '#16a34a' : '#e11d48' }]}>
                        {tx.isCredit ? '+' : '-'}{tx.amount}
                      </Text>
                      <KarmaCoin size={14} />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: '#f8fafc' },
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
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: 'white', letterSpacing: 0.5 },
  historyBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  
  balanceCard: { 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    borderRadius: 24, 
    padding: 24, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  activeTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 6 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#86efac' },
  activeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  balanceText: { fontSize: 48, fontWeight: '900', color: 'white', letterSpacing: -1 },
  cardBottomRow: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 16 },
  cardSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
  
  scrollContent: { paddingBottom: 100, paddingTop: 20 },
  actionRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginTop: 24 },
  actionBtn: { flex: 1, paddingVertical: 16, borderRadius: 20, alignItems: 'center', backgroundColor: 'white', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, flexDirection: 'column', gap: 6 },
  actionLabel: { fontWeight: '900', fontSize: 13 },
  
  historySection: { paddingHorizontal: 20, marginTop: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
  txList: { gap: 12 },
  txCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'white', borderRadius: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  txIconBg: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txContent: { flex: 1, marginLeft: 16 },
  txType: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  txTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  txDate: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  txAmountContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  txAmount: { fontSize: 16, fontWeight: '900' },
});
