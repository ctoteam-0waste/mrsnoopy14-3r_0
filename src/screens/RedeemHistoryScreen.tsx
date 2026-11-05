import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, History, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { payoutService, methodLabel, formatInr } from '../services/payout';
import { withdrawalStatusMeta, refundNote } from '../components/shared/WithdrawalProgress';
import { WebFooter } from '../components/shared/WebFooter';
import { useTheme, makeStyles } from '../theme';
import { StatusBarFiller } from '../components/shared/StatusBarFiller';

export function RedeemHistoryScreen({ navigation }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setIsLoading(true);
        const data = await payoutService.getMyWithdrawals();
        setRequests(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch redeem requests', error);
      } finally {
        setIsLoading(false);
      }
    };

    const unsubscribe = navigation.addListener('focus', fetchRequests);
    fetchRequests();
    return unsubscribe;
  }, [navigation]);

  const formatDate = (dateStr?: string) =>
    dateStr ? new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  // "Pickup · 10:1" or "Reward · Diamond (20:1)" — from the fields captured at submit time.
  const ledgerLabel = (req: any): string | null => {
    if (!req.ledger) return null;
    if (req.ledger === 'pickup') return `Pickup · ${req.rateApplied || 10}:1`;
    return `Reward · ${req.streakTier ? req.streakTier + ' ' : ''}${req.rateApplied}:1`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      <StatusBarFiller color="#064e3b" />

      <LinearGradient colors={['#064e3b', '#15803d']} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtnInner} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('App')}>
              <ChevronLeft size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Withdrawals</Text>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={{ flexGrow: 1, paddingBottom: Platform.OS === 'web' ? 0 : 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {isLoading ? (
            <View style={{ marginTop: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ marginTop: 12, color: colors.textMuted }}>Loading your withdrawals...</Text>
            </View>
          ) : requests.length === 0 ? (
            <View style={styles.emptyState}>
              <History size={56} color={colors.textFaint} />
              <Text style={styles.emptyText}>No withdrawals yet.</Text>
            </View>
          ) : (
            requests.map((req) => {
              const sc = withdrawalStatusMeta(req.status);
              const note = refundNote(req);
              return (
                <TouchableOpacity
                  key={req._id}
                  style={styles.card}
                  onPress={() => navigation.navigate('Withdrawal', { id: req._id, withdrawal: req })}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.amountRow}>
                      <KarmaCoin size={18} />
                      <Text style={styles.coinsText}>-{Number(req.coinsRedeemed || 0).toLocaleString('en-IN')}</Text>
                      <Text style={styles.rupeesText}>{formatInr(Number(req.amountInRupees) || 0)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                      {sc.icon}
                      <Text style={[styles.statusText, { color: sc.text }]}>{sc.label}</Text>
                    </View>
                  </View>

                  {ledgerLabel(req) && (
                    <View style={styles.ledgerBadge}>
                      <Text style={styles.ledgerBadgeText}>{ledgerLabel(req)}</Text>
                    </View>
                  )}

                  {!!req.payoutMethod && <Text style={styles.accountText}>To {methodLabel(req.payoutMethod)}</Text>}

                  <Text style={styles.dateText}>Requested {formatDate(req.createdAt)}</Text>

                  {req.status === 'PAID' && req.processedAt && (
                    <Text style={styles.paidText}>Paid on {formatDate(req.processedAt)}</Text>
                  )}

                  {req.status === 'PAID' && !!req.utr && (
                    <Text style={styles.utrText} selectable>UTR {req.utr}</Text>
                  )}

                  {!!note && (
                    <View style={styles.rejectionBanner}>
                      <Text style={styles.rejectionText}>{note}</Text>
                    </View>
                  )}
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsText}>View details</Text>
                    <ChevronRight size={16} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
        {Platform.OS === 'web' && <WebFooter />}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  scroll: { flex: 1 },

  header: { paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  backBtnInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: 'white', textAlign: 'center' },

  list: { flexGrow: 1, padding: 16, maxWidth: 800, width: '100%', alignSelf: 'center' },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, alignSelf: 'flex-end' },
  detailsText: { fontSize: 13, color: c.primary, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: c.textFaint, marginTop: 12, fontWeight: '600' },

  card: { backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border, elevation: 2, shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coinsText: { fontSize: 16, fontWeight: '900', color: c.text },
  rupeesText: { fontSize: 12, fontWeight: '700', color: c.textMuted, marginLeft: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100, gap: 6 },
  statusText: { fontSize: 11, fontWeight: '800' },

  ledgerBadge: { alignSelf: 'flex-start', backgroundColor: c.surfaceAlt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8 },
  ledgerBadgeText: { fontSize: 11, fontWeight: '800', color: c.textMuted },

  dateText: { fontSize: 12, color: c.textFaint, fontWeight: '500', marginTop: 8 },
  paidText: { fontSize: 12, color: c.primary, fontWeight: '700', marginTop: 4 },
  accountText: { fontSize: 13, color: c.text, fontWeight: '700', marginTop: 8 },
  utrText: { fontSize: 12, color: c.textMuted, fontWeight: '700', marginTop: 4, letterSpacing: 0.3 },

  rejectionBanner: { marginTop: 10, backgroundColor: '#fef2f2', borderRadius: 10, padding: 10 },
  rejectionText: { fontSize: 12, color: '#b91c1c', fontWeight: '600', lineHeight: 17 },
}));
