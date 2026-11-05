import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal } from 'react-native';
import { X } from 'lucide-react-native';
import { registerAlertHandler, AlertPayload } from '../../utils/alert';
import { useTheme, makeStyles } from '../../theme';

// react-dom is only present on web (react-native-web renders through it). Used to
// portal the alert into document.body so it's a top-level sibling of any RNW
// <Modal> portal — a fixed overlay left inside #root gets trapped in a stacking
// context and still renders behind modals, so its z-index alone isn't enough.
let createPortal: ((node: React.ReactNode, container: Element) => any) | null = null;
if (Platform.OS === 'web') {
  try { createPortal = require('react-dom').createPortal; } catch (_) { /* no-op */ }
}

// Renders showAlert() calls as an in-app modal (instead of the OS Alert.alert /
// browser window.alert) so every alert gets a branded card with a close (X)
// button. Mounted once at the app root; used on BOTH web and native.
export function AlertHost() {
  const s = useStyles();
  const { colors } = useTheme();
  const [payload, setPayload] = useState<AlertPayload | null>(null);

  useEffect(() => {
    registerAlertHandler((p) => setPayload(p));
    return () => registerAlertHandler(null);
  }, []);

  const close = () => setPayload(null);
  if (!payload) return null;

  const buttons = payload.buttons && payload.buttons.length ? payload.buttons : [{ text: 'OK' }];
  // Three pills don't fit side by side on a phone, so they stack; two share the row.
  const stacked = buttons.length > 2;
  const paired = buttons.length === 2;

  const card = (
    <View style={s.card}>
      <View style={s.header}>
        <Text style={s.title}>{payload.title}</Text>
        <TouchableOpacity onPress={close} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={20} color={colors.textFaint} />
        </TouchableOpacity>
      </View>
      {!!payload.message && <Text style={s.message}>{payload.message}</Text>}
      <View style={[s.btnRow, stacked && s.btnColumn]}>
        {buttons.map((b, i) => {
          const danger = b.style === 'destructive';
          const cancel = b.style === 'cancel';
          return (
            <TouchableOpacity
              key={i}
              style={[s.btn, paired && s.btnHalf, stacked && s.btnFull, cancel && s.btnCancel, danger && s.btnDanger]}
              onPress={() => { close(); b.onPress?.(); }}
              activeOpacity={0.85}
            >
              <Text style={[s.btnText, cancel && s.btnTextCancel, danger && s.btnTextDanger]}>{b.text}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // Web: a fixed, max-z-index overlay portalled to <body> so it escapes any
  // RNW <Modal> stacking context and always renders on top.
  if (Platform.OS === 'web') {
    const overlay = <View style={s.overlay}><View style={s.backdrop}>{card}</View></View>;
    return (createPortal && typeof document !== 'undefined')
      ? createPortal(overlay, document.body)
      : overlay;
  }

  // Native: a transparent RN Modal renders above everything (including other modals).
  return (
    <Modal visible transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={s.backdrop}>{card}</View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  // position:fixed + max z-index keeps the alert above every RNW <Modal> on the page (web only).
  overlay: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 2147483647 },
  backdrop: { flex: 1, backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: c.surface, borderRadius: 20, padding: 22, width: '100%', maxWidth: 420, shadowColor: c.shadow, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.22, shadowRadius: 32, elevation: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: c.text },
  message: { fontSize: 14, color: c.textMuted, fontWeight: '500', lineHeight: 21, marginBottom: 18 },
  btnRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 8 },
  btnColumn: { flexDirection: 'column', alignItems: 'stretch', gap: 10 },
  // A single button is an auto-width pill, centred in the row.
  btn: { backgroundColor: '#16a34a', borderRadius: 14, paddingHorizontal: 40, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  btnHalf: { flex: 1, paddingHorizontal: 12 },
  btnFull: { paddingHorizontal: 12 },
  btnCancel: { backgroundColor: c.surfaceAlt },
  btnDanger: { backgroundColor: '#dc2626' },
  btnText: { color: 'white', fontSize: 14, fontWeight: '800' },
  btnTextCancel: { color: c.textMuted },
  btnTextDanger: { color: 'white' },
}));
