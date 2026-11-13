import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, CircleCheck, CircleX, Clock } from 'lucide-react-native';
import { StatusBarFiller } from '../components/shared/StatusBarFiller';
import { WebFooter } from '../components/shared/WebFooter';
import { WithdrawalProgress, useLiveWithdrawal, isRefunded, withdrawalStatusMeta, refundNote } from '../components/shared/WithdrawalProgress';
import { payoutService, withdrawalAccountLabel, withdrawalMoney, formatDateTime, formatInr, type PayoutMethod } from '../services/payout';
import { PICKUP_RATE } from '../utils/streakTiers';
import { useTheme, makeStyles } from '../theme';

const SUPPORT_EMAIL = 'info@0waste.co.in';

// One withdrawal. Opened from history, from the withdraw screen and from a push
// notification (which only carries the id).
export function WithdrawalDetailScreen({ navigation, route }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  const id: string | undefined = route?.params?.id;
  const [withdrawal, setWithdrawal, slow] = useLiveWithdrawal(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(withdrawal ? 'ready' : 'loading');
  const [methods, setMethods] = useState<PayoutMethod[]>([]);

  useEffect(() => { payoutService.listMethods().then((m) => setMethods(m || [])).catch(() => {}); }, []);

  const load = () => {
    if (!id) { setState('error'); return; }
    setState('loading');
    payoutService.getWithdrawal(id)
      .then((w) => { setWithdrawal(w); setState('ready'); })
      .catch(() => setState(withdrawal ? 'ready' : 'error'));
  };

  // Always refresh: a notification or an old history row can be out of date.
  useEffect(load, [id]);

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('RedeemHistory'));

  const renderBody = () => {
    if (!withdrawal) {
      return (
        <View style={styles.center}>
          {state === 'loading' ? <ActivityIndicator color={colors.primary} /> : (
            <>
              <Text style={styles.muted}>Could not load this withdrawal.</Text>
              <TouchableOpacity onPress={load} style={{ padding: 10 }}>
                <Text style={styles.link}>Try again</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      );
    }

    const w = withdrawal;
    const refunded = isRefunded(w.status);
    const meta = withdrawalStatusMeta(w.status);
    const note = refundNote(w);
    const rate = w.rateApplied || (w.ledger === 'pickup' ? PICKUP_RATE : 0);
    const money = withdrawalMoney(w);
    const account = withdrawalAccountLabel(w, methods);
    const rows: [string, string][] = [
      ['Coins', `${w.coinsRedeemed.toLocaleString('en-IN')} ${w.ledger === 'reward' ? 'reward' : 'pickup'} coins`],
      ...(rate ? [['Rate', `${w.streakTier ? w.streakTier + ' · ' : ''}${rate} coins = ₹1`] as [string, string]] : []),
      ...(account ? [['To', account] as [string, string]] : []),
      ...(money.fee != null ? [['Fee', formatInr(money.fee)] as [string, string]] : []),
      ...(w.status === 'PAID' && money.received != null ? [['You received', formatInr(money.received)] as [string, string]] : []),
      ['Requested', formatDateTime(w.createdAt)],
      ...(w.processedAt ? [[w.status === 'PAID' ? 'Paid on' : 'Updated', formatDateTime(w.processedAt)] as [string, string]] : []),
      ['Withdrawal ID', w._id],
    ];

    return (
      <View style={styles.body}>
        <View style={styles.center}>
          <View style={[styles.heroIcon, { backgroundColor: refunded ? colors.dangerSoft : colors.primarySoft }]}>
            {refunded ? <CircleX size={34} color={colors.danger} />
              : w.status === 'PAID' ? <CircleCheck size={34} color={colors.primary} />
              : <Clock size={34} color={colors.primary} />}
          </View>
          <Text style={styles.amount}>{formatInr(w.amountInRupees)}</Text>
          <View style={[styles.pill, { backgroundColor: meta.bg }]}>
            {meta.icon}
            <Text style={[styles.pillText, { color: meta.text }]}>{meta.label}</Text>
          </View>
        </View>

        {refunded ? (
          <View style={styles.refundCard}>
            <Text style={styles.refundText}>{note}</Text>
          </View>
        ) : (
          <>
            <WithdrawalProgress withdrawal={w} />
            {slow && <Text style={styles.note}>This is taking longer than usual. We'll notify you when the money arrives.</Text>}
          </>
        )}

        <View style={styles.card}>
          {rows.map(([label, value], i) => (
            <View key={label} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowValue} selectable={label === 'Withdrawal ID'} numberOfLines={2}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.note}>
          {w.status === 'PAID'
            ? `Money not showing in your account? Share the UTR with your bank. Still stuck? Write to ${SUPPORT_EMAIL} with your withdrawal ID.`
            : `Need help? Write to ${SUPPORT_EMAIL} with your withdrawal ID.`}
        </Text>

        <TouchableOpacity onPress={() => navigation.navigate('RedeemHistory')} style={styles.allBtn} activeOpacity={0.8}>
          <Text style={styles.link}>See all withdrawals</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      <StatusBarFiller color="#064e3b" />
      <LinearGradient colors={['#064e3b', '#15803d']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={goBack} accessibilityLabel="Back">
              <ChevronLeft size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Withdrawal</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderBody()}
        {Platform.OS === 'web' && <View style={{ marginTop: 40 }}><WebFooter /></View>}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  header: { paddingBottom: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, maxWidth: 800, width: '100%', alignSelf: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 19, fontWeight: '900', color: 'white', textAlign: 'center' },
  headerSpacer: { width: 40, height: 40 },
  scroll: { flexGrow: 1, paddingBottom: Platform.OS === 'web' ? 0 : 40 },
  body: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 24 },
  center: { alignItems: 'center', paddingTop: 8, minHeight: 80, justifyContent: 'center' },

  heroIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  amount: { fontSize: 34, fontWeight: '900', color: c.text, letterSpacing: -0.5 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 },
  pillText: { fontSize: 13, fontWeight: '800' },

  refundCard: { marginTop: 20, backgroundColor: c.dangerSoft, borderRadius: 16, padding: 16 },
  refundText: { fontSize: 14.5, color: c.text, fontWeight: '600', lineHeight: 21 },

  card: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 16, marginTop: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: c.border },
  rowLabel: { fontSize: 14, color: c.textMuted, fontWeight: '600' },
  rowValue: { flexShrink: 1, fontSize: 14, color: c.text, fontWeight: '700', textAlign: 'right' },

  note: { fontSize: 13, color: c.textFaint, marginTop: 16, lineHeight: 19, textAlign: 'center' },
  muted: { fontSize: 15, color: c.textMuted, textAlign: 'center' },
  link: { color: c.primary, fontSize: 15, fontWeight: '800' },
  allBtn: { alignSelf: 'center', paddingVertical: 12, marginTop: 4 },
}));
