import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, Truck, Coins, Trophy } from 'lucide-react-native';
import { useNotifications } from '../../context/NotificationContext';
import { isPushSupported, getPushPermission } from '../../utils/notifications';
import { makeStyles } from '../../theme';

// A soft "pre-permission" primer shown once, before the OS dialog. It explains the
// value first (so we don't spend the one-shot iOS prompt on a cold ask) and only
// then, on "Enable", triggers the real OS permission request via enablePush.
const PRIMER_KEY = 'notifPrimerShown';

function Perk({ icon, text }: { icon: React.ReactNode; text: string }) {
  const styles = useStyles();
  return (
    <View style={styles.perk}>
      <View style={styles.perkIcon}>{icon}</View>
      <Text style={styles.perkText}>{text}</Text>
    </View>
  );
}

// `enabled` lets the host hold the primer back while another overlay (e.g. the
// first-visit tour) is on screen — iOS can't present two modals at once.
export default function NotificationPrimerModal({ enabled = true }: { enabled?: boolean }) {
  const styles = useStyles();
  const { enablePush } = useNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    (async () => {
      if (!isPushSupported()) return; // web / Expo Go — no OS prompt to protect
      let shown: string | null = null;
      try { shown = await AsyncStorage.getItem(PRIMER_KEY); } catch {}
      if (shown) return;
      const p = await getPushPermission();
      // Only when the OS has never been asked — if already granted/denied there's
      // nothing to primer for (the dashboard banner handles the denied case).
      if (active && p.undetermined) setVisible(true);
    })();
    return () => { active = false; };
  }, [enabled]);

  const dismiss = async () => {
    setVisible(false);
    try { await AsyncStorage.setItem(PRIMER_KEY, '1'); } catch {}
  };

  const onEnable = async () => {
    await dismiss();
    await enablePush(); // fires the OS dialog, registers the token on grant
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient colors={['#166534', '#15803d']} style={styles.iconWrap}>
            <Bell size={30} color="#ffffff" />
          </LinearGradient>

          <Text style={styles.title}>Stay in the loop</Text>
          <Text style={styles.sub}>Turn on notifications so you never miss what matters.</Text>

          <View style={styles.perks}>
            <Perk icon={<Truck size={18} color="#16a34a" />} text="Know the moment your pickup partner is on the way" />
            <Perk icon={<Coins size={18} color="#d97706" />} text="Get notified when coins land in your wallet" />
            <Perk icon={<Trophy size={18} color="#7c3aed" />} text="Never miss your daily quiz or streak" />
          </View>

          <TouchableOpacity style={styles.enableBtn} onPress={onEnable} activeOpacity={0.9}>
            <Text style={styles.enableText}>Enable notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.laterBtn} onPress={dismiss} activeOpacity={0.7}>
            <Text style={styles.laterText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  overlay: { flex: 1, backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, backgroundColor: c.surface, borderRadius: 24, padding: 24, alignItems: 'center', ...(Platform.OS === 'web' ? {} : { shadowColor: '#052e16', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 }) },
  iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '900', color: c.text, marginBottom: 6 },
  sub: { fontSize: 14, color: c.textMuted, fontWeight: '500', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  perks: { width: '100%', gap: 14, marginBottom: 24 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  perkIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  perkText: { flex: 1, fontSize: 13.5, color: c.text, fontWeight: '600', lineHeight: 18 },
  enableBtn: { width: '100%', backgroundColor: '#15803d', paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  enableText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  laterBtn: { paddingVertical: 12, marginTop: 4 },
  laterText: { color: c.textFaint, fontSize: 14, fontWeight: '600' },
}));
