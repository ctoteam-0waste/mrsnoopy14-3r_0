import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Check, Copy, Clock, CheckCircle2, XCircle, Loader, Undo2 } from 'lucide-react-native';
import { payoutService, Withdrawal, formatInr } from '../../services/payout';
import { useTheme, makeStyles } from '../../theme';

const POLL_MS = 4000;
const GIVE_UP_MS = 120_000;

export const isSettled = (status: string) => ['PAID', 'FAILED', 'REVERSED', 'REJECTED'].includes(status);
export const isRefunded = (status: string) => ['FAILED', 'REVERSED', 'REJECTED'].includes(status);

export function withdrawalStatusMeta(status: string) {
  switch (status) {
    case 'PAID': return { label: 'Paid', bg: '#dcfce7', text: '#16a34a', icon: <CheckCircle2 size={14} color="#16a34a" /> };
    case 'PROCESSING': return { label: 'Processing', bg: '#e0f2fe', text: '#0369a1', icon: <Loader size={14} color="#0369a1" /> };
    case 'FAILED': return { label: 'Failed', bg: '#fee2e2', text: '#dc2626', icon: <XCircle size={14} color="#dc2626" /> };
    case 'REVERSED': return { label: 'Reversed', bg: '#fee2e2', text: '#dc2626', icon: <Undo2 size={14} color="#dc2626" /> };
    case 'REJECTED': return { label: 'Rejected', bg: '#fee2e2', text: '#dc2626', icon: <XCircle size={14} color="#dc2626" /> };
    default: return { label: 'Started', bg: '#fef3c7', text: '#d97706', icon: <Clock size={14} color="#d97706" /> };
  }
}

export function refundNote(w: { status: string; failureReason?: string; rejectionReason?: string }) {
  switch (w.status) {
    case 'FAILED': return `${w.failureReason || 'The bank could not complete this transfer.'} Your coins have been refunded.`;
    case 'REVERSED': return `${w.failureReason || 'The bank sent this money back.'} Your coins have been refunded.`;
    case 'REJECTED': return `${w.rejectionReason || 'Request rejected.'} Your coins have been refunded.`;
    default: return null;
  }
}

// Keeps a withdrawal fresh until the bank settles it. `slow` turns on after two
// minutes so the screen can say "we'll notify you" instead of spinning forever.
export function useLiveWithdrawal(initial: Withdrawal | null) {
  const [withdrawal, setWithdrawal] = useState<Withdrawal | null>(initial);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!withdrawal?._id || isSettled(withdrawal.status)) return;
    setSlow(false);
    const started = Date.now();
    let alive = true;
    const t = setInterval(async () => {
      if (Date.now() - started > GIVE_UP_MS) { setSlow(true); clearInterval(t); return; }
      try {
        const w = await payoutService.getWithdrawal(withdrawal._id);
        if (!alive) return;
        setWithdrawal(w);
        if (isSettled(w.status)) clearInterval(t);
      } catch {}
    }, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [withdrawal?._id]);

  return [withdrawal, setWithdrawal, slow] as const;
}

export function WithdrawalProgress({ withdrawal }: { withdrawal: Withdrawal }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const w = withdrawal;

  const steps = [
    { key: 'PENDING', label: 'Withdrawal started' },
    { key: 'PROCESSING', label: 'Sending to your bank' },
    { key: 'PAID', label: `${formatInr(w.amountInRupees)} credited` },
  ];
  const reached = w.status === 'PAID' ? 3 : w.status === 'PROCESSING' ? 2 : 1;

  // Native has no clipboard module in this build; the UTR text is selectable there.
  const canCopy = Platform.OS === 'web' && typeof navigator !== 'undefined' && !!navigator.clipboard;
  const copy = () => {
    if (!w.utr || !canCopy) return;
    navigator.clipboard.writeText(w.utr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <View style={styles.card}>
      {steps.map((s, i) => {
        const done = i < reached;
        const active = i === reached;
        return (
          <View key={s.key} style={styles.stepRow}>
            <View style={[styles.stepDot, (done || active) && styles.stepDotDone]}>
              {done ? <Check size={13} color="#fff" /> : active ? <ActivityIndicator size="small" color="#fff" /> : null}
            </View>
            <Text style={[styles.stepText, !done && !active && { color: colors.textFaint }]}>{s.label}</Text>
          </View>
        );
      })}
      {!!w.utr && (
        <View style={styles.utrRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.utrLabel}>Bank reference (UTR)</Text>
            <Text style={styles.utrValue} selectable>{w.utr}</Text>
          </View>
          {canCopy && (
            <TouchableOpacity onPress={copy} style={styles.copyBtn} accessibilityLabel="Copy UTR">
              {copied ? <Check size={16} color={colors.primary} /> : <Copy size={16} color={colors.primary} />}
              <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 16, paddingVertical: 6, marginTop: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' },
  stepDotDone: { backgroundColor: c.primary },
  stepText: { fontSize: 15, fontWeight: '700', color: c.text },
  utrRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10, paddingBottom: 6, marginTop: 4 },
  utrLabel: { fontSize: 12.5, color: c.textMuted, fontWeight: '600' },
  utrValue: { fontSize: 15, color: c.text, fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: c.primarySoft },
  copyText: { color: c.primary, fontSize: 13, fontWeight: '800' },
}));
