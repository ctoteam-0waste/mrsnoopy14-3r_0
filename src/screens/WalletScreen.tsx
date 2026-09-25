import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Platform, Modal } from 'react-native';
import { useTheme, makeStyles } from '../theme';
import { WebFooter } from '../components/shared/WebFooter';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowDownLeft, ArrowUpRight, Heart, History, Clock, Flame, Snowflake, Recycle, Gift, Award, X, ChevronRight } from 'lucide-react-native';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { profileService } from '../services/profile';
import { streakService, StreakStatus } from '../services/streak';
import { showRedeemInfoNow, isRedeemLive } from '../utils/redeemInfo';
import { showAlert } from '../utils/alert';
import { PICKUP_RATE, STREAK_FREEZE_COST, STREAK_TIERS, tierByName, rupeesFor, formatRupees, LedgerType } from '../utils/streakTiers';

const showWithdrawInfo = () => showRedeemInfoNow();

// Per-source icon for the transaction list. Historical rows have no `source`.
function txSourceIcon(source?: string, isCredit?: boolean) {
  switch (source) {
    case 'PICKUP': return <Recycle size={20} color="#16a34a" />;
    case 'QUIZ': return <Award size={20} color="#7c3aed" />;
    case 'REFERRAL': case 'WELCOME_BONUS': return <Gift size={20} color="#d97706" />;
    case 'STREAK_FREEZE': return <Snowflake size={20} color="#0ea5e9" />;
    case 'TRANSFER': return isCredit ? <ArrowDownLeft size={20} color="#16a34a" /> : <ArrowUpRight size={20} color="#d97706" />;
    default: return isCredit ? <ArrowDownLeft size={20} color="#16a34a" /> : <ArrowUpRight size={20} color="#e11d48" />;
  }
}

export function WalletScreen({ navigation }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [pickupCoins, setPickupCoins] = useState(0);
  const [rewardCoins, setRewardCoins] = useState(0);
  // lifetime = totalCoinsEarned — never decreases on redeem
  const [lifetime, setLifetime] = useState(0);
  const [streak, setStreak] = useState<StreakStatus | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [freezing, setFreezing] = useState(false);
  const [ledgerPickerVisible, setLedgerPickerVisible] = useState(false);
  const [tierModalVisible, setTierModalVisible] = useState(false);

  const fetchWalletData = async () => {
    try {
      const [profileData, txData, streakData]: [any, any, StreakStatus | null] = await Promise.all([
        profileService.getProfile().catch(() => ({})),
        profileService.getTransactionHistory().catch(() => []),
        streakService.getStatus().catch(() => null),
      ]);
      const reward = profileData.rewardCoins ?? profileData.coins ?? profileData.balance ?? 0;
      setPickupCoins(profileData.pickupCoins ?? 0);
      setRewardCoins(reward);
      setLifetime(profileData.totalCoinsEarned ?? (profileData.pickupCoins ?? 0) + reward);
      setStreak(streakData);
      setTransactions(Array.isArray(txData) ? txData : []);
    } catch (error) {
      console.error('Wallet fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchWalletData);
    fetchWalletData();
    return unsubscribe;
  }, [navigation]);

  const rewardRate = streak?.rewardRate ?? 100;
  const tierMeta = tierByName(streak?.tier);

  const handleFreeze = async () => {
    if (freezing) return;
    if (rewardCoins < STREAK_FREEZE_COST) {
      showAlert('Not enough reward coins', `A streak freeze costs ${STREAK_FREEZE_COST.toLocaleString()} reward coins.`);
      return;
    }
    setFreezing(true);
    try {
      await streakService.purchaseFreeze();
      showAlert('Streak saved!', 'Your streak is protected. Keep it going with a pickup, quiz, or referral today.');
      await fetchWalletData();
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      showAlert('Could not freeze streak', msg || 'Please try again.');
    } finally {
      setFreezing(false);
    }
  };

  const goRedeem = (ledger: LedgerType) => {
    setLedgerPickerVisible(false);
    navigation.navigate('Redeem', {
      ledger,
      balance: ledger === 'pickup' ? pickupCoins : rewardCoins,
      rewardRate,
      tier: streak?.tier,
    });
  };

  const onRedeemPress = () => {
    if (!isRedeemLive()) return showWithdrawInfo();
    setLedgerPickerVisible(true);
  };

  const formatTx = (tx: any) => {
    const isCredit = tx.type === 'CREDIT';
    const dateStr = tx.createdAt
      ? new Date(tx.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';
    return {
      id: tx._id || tx.id,
      source: tx.source as string | undefined,
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 0 : 100 }} showsVerticalScrollIndicator={false}>

        {/* Header — same as home screen: paddingTop 60, same gradient, same radius */}
        <LinearGradient colors={['#052e16', '#166534', '#15803d']} style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>My wallet</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.streakBadge} onPress={() => setTierModalVisible(true)} activeOpacity={0.8}>
                <Flame size={15} color="#fb923c" />
                <Text style={styles.streakBadgeText}>{streak?.currentStreak ?? 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate('RedeemHistory')}>
                <History size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Balance card */}
          <View style={styles.balanceCard}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardLabel}>Total earned</Text>
              <TouchableOpacity style={styles.tierPill} onPress={() => setTierModalVisible(true)} activeOpacity={0.8}>
                <View style={[styles.activeDot, { backgroundColor: tierMeta.color }]} />
                <Text style={styles.activeText}>{tierMeta.name} · {rewardRate}:1</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.balanceRow}>
              <KarmaCoin size={44} glow animated />
              <View>
                <Text style={styles.balanceText}>{lifetime.toLocaleString()}</Text>
                <Text style={styles.unitTag} numberOfLines={1}>KarmaCoins XP</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Two wallets */}
            <View style={styles.walletsRow}>
              <View style={styles.walletCol}>
                <View style={styles.walletLabelRow}>
                  <Recycle size={13} color="#86efac" />
                  <Text style={styles.walletLabel}>Pickup coins</Text>
                </View>
                <View style={styles.walletValueRow}>
                  <KarmaCoin size={16} />
                  <Text style={styles.walletValue}>{pickupCoins.toLocaleString()}</Text>
                </View>
                <Text style={styles.walletSub}>Always {PICKUP_RATE}:1 · {formatRupees(rupeesFor(pickupCoins, PICKUP_RATE))}</Text>
              </View>
              <View style={styles.walletDivider} />
              <View style={styles.walletCol}>
                <View style={styles.walletLabelRow}>
                  <Gift size={13} color="#fcd34d" />
                  <Text style={styles.walletLabel}>Reward coins</Text>
                </View>
                <View style={styles.walletValueRow}>
                  <KarmaCoin size={16} />
                  <Text style={styles.walletValue}>{rewardCoins.toLocaleString()}</Text>
                </View>
                <Text style={styles.walletSub}>{tierMeta.name} {rewardRate}:1 · {formatRupees(rupeesFor(rewardCoins, rewardRate))}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* At-risk / freeze banner — only when a missed day is freeze-eligible */}
        {streak?.freezeAvailable && (
          <View style={styles.atRiskBanner}>
            <Snowflake size={20} color="#0ea5e9" />
            <View style={{ flex: 1 }}>
              <Text style={styles.atRiskTitle}>Your streak is at risk!</Text>
              <Text style={styles.atRiskText}>
                {streak.atRiskForDate ? `You missed ${streak.atRiskForDate}. ` : ''}
                Freeze it today for {STREAK_FREEZE_COST.toLocaleString()} reward coins or it resets to Bronze.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.freezeBtn, (freezing || rewardCoins < STREAK_FREEZE_COST) && styles.freezeBtnDisabled]}
              onPress={handleFreeze}
              disabled={freezing || rewardCoins < STREAK_FREEZE_COST}
              activeOpacity={0.85}
            >
              {freezing ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.freezeBtnText}>Freeze</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGreen]} onPress={onRedeemPress} activeOpacity={0.8}>
            <ArrowDownLeft size={18} color="#16a34a" />
            <Text style={[styles.actionLabel, { color: '#16a34a' }]}>Redeem</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnAmber]}
            onPress={() => navigation.navigate('Transfer', { pickupCoins, rewardCoins, rewardRate, tier: streak?.tier })}
            activeOpacity={0.8}
          >
            <ArrowUpRight size={18} color="#d97706" />
            <Text style={[styles.actionLabel, { color: '#d97706' }]}>Transfer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnRed]}
            onPress={() => navigation.navigate('Donation', { balance: pickupCoins + rewardCoins })}
            activeOpacity={0.8}
          >
            <Heart size={18} color="#e11d48" />
            <Text style={[styles.actionLabel, { color: '#e11d48' }]}>Donate</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent transactions</Text>

          {isLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.textMuted, marginTop: 12 }}>Loading transactions...</Text>
            </View>
          ) : transactions.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <History size={48} color={colors.textFaint} />
              <Text style={{ color: colors.textFaint, marginTop: 12, fontWeight: '600' }}>No transactions yet.</Text>
              <Text style={{ color: colors.textFaint, fontSize: 12, marginTop: 4 }}>Complete a pickup to earn KarmaCoins XP!</Text>
            </View>
          ) : (
            <View style={styles.txList}>
              {transactions.map(formatTx).map((tx) => (
                <View key={tx.id} style={styles.txCard}>
                  <View style={[styles.txIconBg, { backgroundColor: tx.isCredit ? colors.primarySoft : colors.dangerSoft }]}>
                    {txSourceIcon(tx.source, tx.isCredit)}
                  </View>
                  <View style={styles.txContent}>
                    <Text style={styles.txType}>{tx.type}</Text>
                    <View style={styles.txTimeRow}>
                      <Clock size={12} color={colors.textFaint} />
                      <Text style={styles.txDate}>{tx.date}</Text>
                    </View>
                  </View>
                  <View style={styles.txAmountContainer}>
                    <Text style={[styles.txAmount, { color: tx.isCredit ? colors.primary : colors.danger }]}>
                      {tx.isCredit ? '+' : '-'}{tx.amount}
                    </Text>
                    <KarmaCoin size={14} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {Platform.OS === 'web' && <WebFooter />}
      </ScrollView>

      {/* Ledger picker — which wallet to redeem from */}
      <Modal visible={ledgerPickerVisible} transparent animationType="fade" onRequestClose={() => setLedgerPickerVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLedgerPickerVisible(false)}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Which coins to redeem?</Text>

            <TouchableOpacity style={styles.ledgerOption} onPress={() => goRedeem('pickup')} activeOpacity={0.85} disabled={pickupCoins < 10}>
              <View style={[styles.ledgerIcon, { backgroundColor: colors.primarySoft }]}><Recycle size={22} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ledgerName}>Pickup coins</Text>
                <Text style={styles.ledgerMeta}>{pickupCoins.toLocaleString()} · fixed {PICKUP_RATE}:1 · {formatRupees(rupeesFor(pickupCoins, PICKUP_RATE))}</Text>
              </View>
              <ChevronRight size={20} color={colors.textFaint} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.ledgerOption} onPress={() => goRedeem('reward')} activeOpacity={0.85} disabled={rewardCoins < 10}>
              <View style={[styles.ledgerIcon, { backgroundColor: colors.surfaceAlt }]}><Gift size={22} color="#d97706" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ledgerName}>Reward coins</Text>
                <Text style={styles.ledgerMeta}>{rewardCoins.toLocaleString()} · {tierMeta.name} {rewardRate}:1 · {formatRupees(rupeesFor(rewardCoins, rewardRate))}</Text>
              </View>
              <ChevronRight size={20} color={colors.textFaint} />
            </TouchableOpacity>

            <Text style={styles.sheetHint}>Pickup coins always redeem at the best rate. Reward coins improve as your streak grows.</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Tier ladder explainer */}
      <Modal visible={tierModalVisible} transparent animationType="fade" onRequestClose={() => setTierModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTierModalVisible(false)}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1}>
            <View style={styles.sheetTitleRow}>
              <Text style={styles.sheetTitle}>Streak rewards</Text>
              <TouchableOpacity onPress={() => setTierModalVisible(false)}><X size={22} color={colors.textMuted} /></TouchableOpacity>
            </View>
            <Text style={styles.sheetHint}>
              Do a pickup, quiz, or referral any day to keep your streak. The longer it runs, the more your
              <Text style={{ fontWeight: '800' }}> reward coins</Text> are worth. Pickup coins are always {PICKUP_RATE}:1.
            </Text>
            <View style={{ marginTop: 14 }}>
              {STREAK_TIERS.map((t) => {
                const active = t.name === tierMeta.name;
                return (
                  <View key={t.name} style={[styles.tierRow, active && { backgroundColor: t.bg, borderColor: t.color }]}>
                    <View style={[styles.tierDot, { backgroundColor: t.color }]} />
                    <Text style={[styles.tierName, active && { color: t.color }]}>{t.name}</Text>
                    <Text style={styles.tierDays}>{t.days}</Text>
                    <Text style={[styles.tierRate, active && { color: t.color }]}>{t.rate}:1</Text>
                  </View>
                );
              })}
            </View>
            {streak && (
              <Text style={styles.tierFooter}>
                You're on a {streak.currentStreak}-day streak · best {streak.longestStreak} days.
              </Text>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },

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
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, height: 40, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  streakBadgeText: { color: 'white', fontWeight: '900', fontSize: 15 },

  balanceCard: {
    borderRadius: 24, padding: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    maxWidth: 800, width: '100%', alignSelf: 'center',
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  unitTag: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 0.3, marginTop: -2, flexShrink: 0 },
  tierPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 6 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#86efac' },
  activeText: { color: 'white', fontSize: 11, fontWeight: '800' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  balanceText: { fontSize: 44, fontWeight: '900', color: 'white', letterSpacing: -1 },
  cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 16 },

  walletsRow: { flexDirection: 'row', alignItems: 'stretch' },
  walletCol: { flex: 1 },
  walletDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 14 },
  walletLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  walletLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
  walletValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  walletValue: { color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  walletSub: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600', marginTop: 4 },

  atRiskBanner: {
    marginTop: 16, marginHorizontal: 16, padding: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd',
    maxWidth: 800, width: '100%', alignSelf: 'center',
  },
  atRiskTitle: { color: '#0369a1', fontSize: 13, fontWeight: '900', marginBottom: 2 },
  atRiskText: { color: '#0c4a6e', fontSize: 12, fontWeight: '600', lineHeight: 17 },
  freezeBtn: { backgroundColor: '#0ea5e9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, minWidth: 76, alignItems: 'center' },
  freezeBtnDisabled: { backgroundColor: '#94a3b8' },
  freezeBtnText: { color: 'white', fontWeight: '800', fontSize: 13 },

  actionRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 100, borderWidth: 1.5, backgroundColor: c.surface },
  actionBtnGreen: { borderColor: '#86efac' },
  actionBtnAmber: { borderColor: '#fcd34d' },
  actionBtnRed: { borderColor: '#fda4af' },
  actionLabel: { fontWeight: '800', fontSize: 13 },

  historySection: { paddingHorizontal: 16, marginTop: 28, marginBottom: 32, maxWidth: 800, width: '100%', alignSelf: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: c.text, marginBottom: 16 },

  txList: { gap: 10 },
  txCard: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, elevation: 2, shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  txIconBg: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txContent: { flex: 1, marginLeft: 12 },
  txType: { fontSize: 14, fontWeight: '800', color: c.text, marginBottom: 3 },
  txTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  txDate: { fontSize: 11, color: c.textMuted, fontWeight: '500' },
  txAmountContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  txAmount: { fontSize: 15, fontWeight: '900' },

  // Modals (ledger picker + tier ladder)
  // Web: centered dialog. Mobile: bottom sheet.
  modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end', alignItems: 'center', padding: Platform.OS === 'web' ? 20 : 0 },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    padding: 22, paddingBottom: Platform.OS === 'web' ? 22 : 34,
    maxWidth: 560, width: '100%', alignSelf: 'center',
  },
  sheetHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.border, alignSelf: 'center', marginBottom: 16 },
  sheetTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: c.text, marginBottom: 4 },
  sheetHint: { fontSize: 12.5, color: c.textMuted, fontWeight: '600', lineHeight: 18, marginTop: 6 },

  ledgerOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt, marginTop: 12 },
  ledgerIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ledgerName: { fontSize: 15, fontWeight: '800', color: c.text, marginBottom: 2 },
  ledgerMeta: { fontSize: 12, color: c.textMuted, fontWeight: '600' },

  tierRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'transparent', gap: 10 },
  tierDot: { width: 9, height: 9, borderRadius: 5 },
  tierName: { fontSize: 14, fontWeight: '800', color: c.text, width: 78 },
  tierDays: { fontSize: 12, color: c.textFaint, fontWeight: '600', flex: 1 },
  tierRate: { fontSize: 14, fontWeight: '900', color: c.text },
  tierFooter: { fontSize: 12.5, color: c.primary, fontWeight: '700', marginTop: 14, textAlign: 'center' },
}));
