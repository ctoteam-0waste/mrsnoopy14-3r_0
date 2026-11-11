import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  StyleSheet, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Trash2, Truck, MapPin, Coins, CheckCircle2, Clock, XCircle, Brain, Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppNotification, useNotifications } from '../../context/NotificationContext';
import { routeNotification } from '../../utils/notificationRoute';
import { SCREEN_WIDTH } from '../../utils/layout';
import { useTheme, makeStyles } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

const PANEL_WIDTH = Math.min(SCREEN_WIDTH * 0.9, 420);

const TYPE_CONFIG: Record<string, {
  icon: (size: number, color: string) => React.ReactNode;
  color: string;
  gradientBg: [string, string];
  label: string;
}> = {
  BOOKING_ACCEPTED: {
    icon: (s, c) => <Truck size={s} color={c} />,
    color: '#15803d', gradientBg: ['#f0fdf4', '#dcfce7'], label: 'Booking',
  },
  AGENT_REACHED: {
    icon: (s, c) => <MapPin size={s} color={c} />,
    color: '#0369a1', gradientBg: ['#eff6ff', '#dbeafe'], label: 'Booking',
  },
  BOOKING_PICKED_UP: {
    icon: (s, c) => <Coins size={s} color={c} />,
    color: '#d97706', gradientBg: ['#fffbeb', '#fef3c7'], label: 'Wallet',
  },
  BOOKING_COMPLETED: {
    icon: (s, c) => <CheckCircle2 size={s} color={c} />,
    color: '#15803d', gradientBg: ['#f0fdf4', '#dcfce7'], label: 'Booking',
  },
  BOOKING_IN_POOL: {
    icon: (s, c) => <Clock size={s} color={c} />,
    color: '#b45309', gradientBg: ['#fefce8', '#fef9c3'], label: 'Booking',
  },
  BOOKING_CANCEL_SUCCESS: {
    icon: (s, c) => <XCircle size={s} color={c} />,
    color: '#dc2626', gradientBg: ['#fff1f2', '#ffe4e6'], label: 'Booking',
  },
  QUIZ_COMPLETED: {
    icon: (s, c) => <Brain size={s} color={c} />,
    color: '#7c3aed', gradientBg: ['#faf5ff', '#ede9fe'], label: 'Quiz',
  },
};

const DEFAULT_CFG = {
  icon: (s: number, c: string) => <Bell size={s} color={c} />,
  color: '#475569', gradientBg: ['#f8fafc', '#f1f5f9'] as [string, string], label: 'Activity',
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotifCard({ notif, onOpen }: { notif: AppNotification; onOpen: (n: AppNotification) => void }) {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  const cfg = TYPE_CONFIG[notif.type] || DEFAULT_CFG;

  // The type gradients are light tints that only read under dark text. In dark mode
  // the text is light, so an unread card uses a subtle dark tint of the type colour
  // instead — keeping the title/body readable while still hinting at the type.
  const cardBg: [string, string] = notif.read
    ? [colors.surface, colors.surface]
    : isDark
      ? [`${cfg.color}26`, colors.surface]
      : cfg.gradientBg;

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={() => onOpen(notif)}>
    <LinearGradient
      colors={cardBg}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Icon circle */}
      <View style={[styles.iconCircle, { backgroundColor: `${cfg.color}18` }]}>
        {cfg.icon(22, cfg.color)}
      </View>

      {/* Content */}
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardTitle, notif.read && styles.cardTitleRead]} numberOfLines={1}>
            {notif.title}
          </Text>
          {!notif.read && <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />}
        </View>
        <Text style={styles.cardMsg} numberOfLines={2}>{notif.message}</Text>
        <View style={styles.cardBottomRow}>
          <View style={[styles.tagPill, { backgroundColor: `${cfg.color}15` }]}>
            <Text style={[styles.tagText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Text style={styles.cardTime}>{relativeTime(notif.timestamp)}</Text>
        </View>
      </View>
    </LinearGradient>
    </TouchableOpacity>
  );
}

export function NotificationPanel({ visible, onClose, notifications, unreadCount, onMarkRead, onMarkAllRead, onClearAll }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { refreshNotifications } = useNotifications();

  // Opening the bell reads the latest list from the backend (other devices may
  // have added, read or cleared items).
  useEffect(() => { if (visible) refreshNotifications(); }, [visible, refreshNotifications]);

  // Tapping a card deep-links to the right screen (same router as a push tap),
  // marks it read, and closes the panel.
  const handleOpen = (n: AppNotification) => {
    onMarkRead(n.id);
    routeNotification({ type: n.type, bookingId: n.bookingId });
    onClose();
  };

  const slideAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: PANEL_WIDTH, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setModalVisible(false));
    }
  }, [visible]);

  return (
    <Modal visible={modalVisible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}>

        {/* Header */}
        <LinearGradient colors={['#052e16', '#166534']} style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color="white" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>{unreadCount} new</Text>
              </View>
            )}
          </View>
          {unreadCount > 0
            ? <TouchableOpacity onPress={onMarkAllRead} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.readAllText}>Read all</Text>
              </TouchableOpacity>
            : <View style={{ width: 52 }} />
          }
        </LinearGradient>

        {/* Body */}
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Bell size={32} color={colors.textFaint} />
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySub}>Booking updates and quiz activity{'\n'}will appear here</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: insets.bottom + 20 }}
          >
            {notifications.map(n => <NotifCard key={n.id} notif={n} onOpen={handleOpen} />)}

            <TouchableOpacity style={styles.clearBtn} onPress={onClearAll}>
              <Trash2 size={14} color={colors.textFaint} />
              <Text style={styles.clearBtnText}>Clear all notifications</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

      </Animated.View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: c.overlay },

  panel: {
    position: 'absolute', top: 0, right: 0, bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: c.bg,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 18, paddingHorizontal: 16, gap: 8,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: 'white' },
  newBadge: {
    backgroundColor: '#fbbf24', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  newBadgeText: { fontSize: 11, fontWeight: '800', color: '#78350f' },
  readAllText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textDecorationLine: 'underline' },

  // Notification card
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderRadius: 18, padding: 14, gap: 12,
    borderWidth: 1, borderColor: c.border,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: c.text, flex: 1 },
  cardTitleRead: { fontWeight: '600', color: c.textMuted },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6, flexShrink: 0 },
  cardMsg: { fontSize: 13, color: c.textMuted, lineHeight: 19, marginBottom: 10 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tagPill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTime: { fontSize: 11, color: c.textFaint, fontWeight: '600' },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2, borderColor: c.border,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: c.text, marginBottom: 8 },
  emptySub: { fontSize: 13, color: c.textFaint, textAlign: 'center', lineHeight: 20 },

  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: 14,
    borderWidth: 1, borderColor: c.border,
    backgroundColor: c.surface,
  },
  clearBtnText: { fontSize: 12, fontWeight: '600', color: c.textFaint },
}));
