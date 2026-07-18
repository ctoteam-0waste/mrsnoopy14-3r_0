import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowDownLeft, ArrowUpRight, Heart, History, Clock } from 'lucide-react-native';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { profileService } from '../services/profile';
import { REDEEM_INFO_MESSAGE, showRedeemInfoNow, isRedeemLive } from '../utils/redeemInfo';

const showWithdrawInfo = () => showRedeemInfoNow();

export function WalletScreen({ navigation }: any) {
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
    const unsubscribe = navigation.addListener('focus', fetchWalletData);
    fetchWalletData();
    return unsubscribe;
  }, [navigation]);

  const formatTx = (tx: any) => {
    const isCredit = tx.type === 'CREDIT';
    const dateStr = tx.createdAt
      ? new Date(tx.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';
    return {
      id: tx._id || tx.id,
      type: (tx.description || (isCredit ? 'Credit' : 'Debit'))
        .replace(/\s*[-—]\s*(Easy|Medium|Hard)$/i, '')
        .replace(/\s*[-—]\s*\w+\s*\((easy|medium|hard)\)/i, '')
        .replace(/\s*\((easy|medium|hard)\)/i, '')
        .trim(),
      amount: tx.amount || 0,
      isCredit,
      date: dateStr,
    };
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f0fdf6' }}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Header — same as home screen: paddingTop 60, same gradient, same radius */}
        <LinearGradient colors={['#052e16', '#166534', '#15803d']} style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>My Wallet</Text>
            <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate('RedeemHistory')}>
              <History size={18} color="white" />
            </TouchableOpacity>
          </View>

          {/* Balance card */}
          <View style={styles.balanceCard}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardLabel}>TOTAL KARMACOINS XP</Text>
              <View style={styles.activeTag}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>Active</Text>
              </View>
            </View>
            <View style={styles.balanceRow}>
              <KarmaCoin size={44} glow animated />
              <Text style={styles.balanceText}>{balance.toLocaleString()}</Text>
            </View>
            <View style={styles.cardDivider} />
            <Text style={styles.cardSub}>≈ ₹{(balance * 0.1).toFixed(0)} Value Equivalent</Text>
          </View>
        </LinearGradient>

        {/* Redeem info banner */}
        <View style={styles.redeemBanner}>
          <Text style={styles.redeemBannerText}>
            {isRedeemLive() ? '🪙 10 KarmaCoins XP = ₹1 — tap Redeem to cash out anytime! ♻️✨' : REDEEM_INFO_MESSAGE}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnGreen]}
            onPress={() => (isRedeemLive() ? navigation.navigate('Redeem', { balance }) : showWithdrawInfo())}
            activeOpacity={0.8}
          >
            <ArrowDownLeft size={18} color="#16a34a" />
            <Text style={[styles.actionLabel, { color: '#16a34a' }]}>Redeem</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnAmber]} onPress={showWithdrawInfo} activeOpacity={0.8}>
            <ArrowUpRight size={18} color="#d97706" />
            <Text style={[styles.actionLabel, { color: '#d97706' }]}>Transfer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnRed]} onPress={showWithdrawInfo} activeOpacity={0.8}>
            <Heart size={18} color="#e11d48" />
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
              <Text style={{ color: '#cbd5e1', fontSize: 12, marginTop: 4 }}>Complete a pickup to earn KarmaCoins XP!</Text>
            </View>
          ) : (
            <View style={styles.txList}>
              {transactions.map(formatTx).map((tx) => (
                <View key={tx.id} style={styles.txCard}>
                  <View style={[styles.txIconBg, { backgroundColor: tx.isCredit ? '#f0fdf4' : '#fef2f2' }]}>
                    {tx.isCredit
                      ? <ArrowDownLeft size={20} color="#16a34a" />
                      : <ArrowUpRight size={20} color="#e11d48" />}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf6' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '900', color: 'white' },
  historyBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  balanceCard: {
    borderRadius: 24, padding: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    maxWidth: 800, width: '100%', alignSelf: 'center',
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  activeTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 6 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#86efac' },
  activeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  balanceText: { fontSize: 44, fontWeight: '900', color: 'white', letterSpacing: -1 },
  cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 14 },
  cardSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },

  redeemBanner: {
    marginTop: 16, marginHorizontal: 16, padding: 14, borderRadius: 16,
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    maxWidth: 800, width: '100%', alignSelf: 'center',
  },
  redeemBannerText: { color: '#92400e', fontSize: 12.5, fontWeight: '600', lineHeight: 18 },

  actionRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 100, borderWidth: 1.5, backgroundColor: 'white' },
  actionBtnGreen: { borderColor: '#86efac' },
  actionBtnAmber: { borderColor: '#fcd34d' },
  actionBtnRed: { borderColor: '#fda4af' },
  actionLabel: { fontWeight: '800', fontSize: 13 },

  historySection: { paddingHorizontal: 16, marginTop: 28, maxWidth: 800, width: '100%', alignSelf: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },

  txList: { gap: 10 },
  txCard: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  txIconBg: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txContent: { flex: 1, marginLeft: 12 },
  txType: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 3 },
  txTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  txDate: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  txAmountContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  txAmount: { fontSize: 15, fontWeight: '900' },
});
