import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CalendarClock } from 'lucide-react-native';
import { authService } from '../../services/auth';
import { errorCode, errorMessage, errorStatus, formatDay } from '../../services/account';
import { showAlert } from '../../utils/alert';
import { useTheme, makeStyles } from '../../theme';

// Shown when a login returns 403 ACCOUNT_PENDING_DELETION. The restore token is
// single-use, lives 15 minutes and must not outlive this popup, so it's held only
// in the caller's state, never in a route param or storage.
export function ScheduledDeletionModal({
  visible,
  deletionScheduledAt,
  restoreToken,
  onRestored,
  onClose,
}: {
  visible: boolean;
  deletionScheduledAt?: string;
  restoreToken?: string;
  onRestored: (response: any) => void;
  onClose: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [restoring, setRestoring] = useState(false);

  const restore = async () => {
    if (!restoreToken || restoring) return;
    setRestoring(true);
    try {
      const res = await authService.restoreAccount(restoreToken);
      onRestored(res);
    } catch (e) {
      const code = errorCode(e);
      onClose();
      if (code === 'RESTORE_TOKEN_INVALID') showAlert('Please sign in again', 'Please sign in again to restore your account.');
      else if (code === 'DELETION_IN_PROGRESS') showAlert('Cannot restore', "Your account is already being deleted and can't be restored.");
      else if (code === 'ALREADY_DELETED') showAlert('Account deleted', 'This account has been deleted.');
      else if (errorStatus(e) === 429) showAlert('Too many attempts', errorMessage(e));
      else showAlert('Could not restore', errorMessage(e));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <CalendarClock size={28} color={colors.danger} />
          </View>
          <Text style={styles.title}>
            Scheduled for deletion{deletionScheduledAt ? ` on ${formatDay(deletionScheduledAt)}` : ''}
          </Text>
          <Text style={styles.sub}>
            Your account is hidden and will be deleted on this date. Restore it to keep everything as it was.
          </Text>
          <TouchableOpacity style={[styles.primaryBtn, restoring && { opacity: 0.6 }]} onPress={restore} disabled={restoring} activeOpacity={0.85}>
            {restoring ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Restore</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} disabled={restoring} activeOpacity={0.8}>
            <Text style={styles.secondaryBtnText}>Keep deletion</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', paddingHorizontal: 24 },
  card: { backgroundColor: c.surface, borderRadius: 24, padding: 24, width: '100%', maxWidth: 420, alignSelf: 'center' },
  iconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: c.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 19, fontWeight: '800', color: c.text, marginBottom: 8 },
  sub: { fontSize: 14, color: c.textMuted, lineHeight: 20, marginBottom: 22 },
  primaryBtn: { height: 52, borderRadius: 14, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: 'white', fontSize: 15, fontWeight: '800' },
  secondaryBtn: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  secondaryBtnText: { color: c.textMuted, fontSize: 14.5, fontWeight: '700' },
}));
