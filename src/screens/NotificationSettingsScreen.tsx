import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Bell, Mail, MessageSquare, Check } from 'lucide-react-native';
import { StatusBarFiller } from '../components/shared/StatusBarFiller';
import { accountService, errorMessage, errorStatus, NotificationChannel, NotificationKind, NotificationPrefs } from '../services/account';
import { showAlert } from '../utils/alert';
import { useTheme, makeStyles } from '../theme';

const CHANNELS: { key: NotificationChannel; title: string; Icon: any }[] = [
  { key: 'push', title: 'Push', Icon: Bell },
  { key: 'email', title: 'Email', Icon: Mail },
  { key: 'sms', title: 'SMS', Icon: MessageSquare },
];

const KINDS: { key: NotificationKind; title: string; sub: string }[] = [
  { key: 'offers', title: 'Offers', sub: 'Rewards, campaigns, referral nudges and new features' },
  { key: 'updates', title: 'Updates', sub: 'Quiz and streak reminders, impact report, newsletter and tier upgrades' },
];

export function NotificationSettingsScreen({ navigation }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setState('loading');
    try {
      setPrefs(await accountService.getNotificationPrefs());
      setState('ready');
    } catch (e) {
      if (errorStatus(e) !== 401) setState('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Flip right away, send only that switch, re-render from the server's answer,
  // and roll back if it fails.
  const toggle = async (channel: NotificationChannel, kind: NotificationKind, value: boolean) => {
    if (!prefs) return;
    const before = prefs;
    setPrefs({ ...prefs, [channel]: { ...prefs[channel], [kind]: value } });
    try {
      setPrefs(await accountService.updateNotificationPrefs({ [channel]: { [kind]: value } }));
    } catch (e) {
      setPrefs(before);
      if (errorStatus(e) !== 401) showAlert('Could not save', errorMessage(e));
    }
  };

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Profile'));

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
            <Text style={styles.headerTitle}>Notifications</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          {state === 'loading' || !prefs ? (
            <View style={styles.center}>
              {state === 'error' ? (
                <>
                  <Text style={styles.muted}>Could not load your preferences.</Text>
                  <TouchableOpacity onPress={load} style={{ paddingVertical: 8 }}>
                    <Text style={styles.link}>Try again</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <ActivityIndicator color={colors.primary} />
              )}
            </View>
          ) : (
            <>
              {CHANNELS.map(({ key: channel, title, Icon }) => (
                <View key={channel} style={{ marginBottom: 20 }}>
                  <View style={styles.sectionHead}>
                    <Icon size={16} color={colors.textMuted} />
                    <Text style={styles.sectionTitle}>{title}</Text>
                  </View>
                  <View style={styles.card}>
                    {KINDS.map(({ key: kind, title: kTitle, sub }, i) => (
                      <View key={kind} style={[styles.row, i > 0 && styles.rowBorder]}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text style={styles.rowTitle}>{kTitle}</Text>
                          <Text style={styles.rowSub}>{sub}</Text>
                        </View>
                        <Switch
                          value={!!prefs[channel]?.[kind]}
                          onValueChange={(v) => toggle(channel, kind, v)}
                          trackColor={{ false: colors.borderStrong, true: colors.primary }}
                          thumbColor="#ffffff"
                          {...({ activeThumbColor: '#ffffff' } as any)}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              <Text style={styles.muted}>
                OTPs, booking updates, withdrawal updates, account messages and policy notices are always sent.
              </Text>
              <View style={styles.savedRow}>
                <Check size={15} color={colors.primary} />
                <Text style={styles.savedText}>Saved and applied everywhere</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  header: { paddingBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, maxWidth: 800, width: '100%', alignSelf: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 19, fontWeight: '900', color: 'white', textAlign: 'center' },
  body: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 24 },
  center: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: c.textMuted },
  card: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: c.border },
  rowTitle: { fontSize: 15, fontWeight: '700', color: c.text },
  rowSub: { fontSize: 12.5, color: c.textMuted, marginTop: 3, lineHeight: 17 },
  muted: { fontSize: 13, color: c.textMuted, lineHeight: 19 },
  link: { color: c.primary, fontSize: 14, fontWeight: '700' },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  savedText: { fontSize: 13, color: c.primary, fontWeight: '700' },
}));
