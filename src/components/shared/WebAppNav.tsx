import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Image } from 'react-native';
import { Home, PackageCheck, Wallet, ShoppingBag, Bell, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationPanel } from './NotificationPanel';
import { Avatar } from './Avatar';
import { getStoredAvatarId, subscribeAvatar } from '../../utils/avatar';
import { navigationRef } from '../../navigation/navRef';
import { isDiwaliSeason } from '../../utils/festive';
import { DiwaliLights } from '../festive/Diwali';

// The web app's navigation: a top navbar on desktop, a bottom bar on mobile.
// Used by the tab navigator and, through WebAppShell, by the stack screens
// (Schedule pickup, Booking details, Live tracking) so they keep the same chrome.

export const NAV_HEIGHT = 64;

export const NAV_ITEMS = [
  { name: 'Dashboard', label: 'Home', Icon: Home },
  { name: 'Orders', label: 'Orders', Icon: PackageCheck },
  { name: 'Wallet', label: 'Wallet', Icon: Wallet },
  { name: 'Store', label: 'Store', Icon: ShoppingBag },
];

// react-native-web passes these straight through to CSS, so hover changes ease
// in instead of snapping. Not part of RN's ViewStyle type, hence the cast.
const HOVER_TRANSITION = {
  transitionDuration: '220ms',
  transitionProperty: 'opacity, transform, background-color',
  transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as any;

type NavProps = {
  activeName?: string;
  onNavigate: (name: string) => void;
};

// Shared hook: the currently-picked avatar id, kept live via the avatar store's
// subscription so the nav updates the moment a new avatar is chosen.
function useCurrentAvatar() {
  const [avatarId, setAvatarId] = useState<string | null>(null);
  useEffect(() => {
    getStoredAvatarId().then((id) => { if (id) setAvatarId(id); });
    return subscribeAvatar(setAvatarId);
  }, []);
  return avatarId;
}

function useNotificationPanel() {
  const [visible, setVisible] = useState(false);
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();
  const panel = (
    <NotificationPanel
      visible={visible}
      onClose={() => setVisible(false)}
      notifications={notifications}
      unreadCount={unreadCount}
      onMarkRead={markRead}
      onMarkAllRead={markAllRead}
      onClearAll={clearAll}
    />
  );
  return { panel, unreadCount, open: () => setVisible(true) };
}

const openProfile = () => navigationRef.current?.navigate('Profile');

export function AppBottomBar({ activeName, onNavigate }: NavProps) {
  const avatarId = useCurrentAvatar();
  const { panel, unreadCount, open } = useNotificationPanel();
  return (
    <>
      <View style={s.bottomBar}>
        {NAV_ITEMS.map((item) => {
          const active = activeName === item.name;
          const { Icon } = item;
          return (
            <TouchableOpacity key={item.name} style={s.bottomTab} onPress={() => onNavigate(item.name)} activeOpacity={0.7}>
              <Icon size={22} color={active ? '#4ade80' : 'rgba(255,255,255,0.4)'} strokeWidth={active ? 2.5 : 1.8} />
              <Text style={[s.bottomTabText, active && s.bottomTabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={s.bottomTab} onPress={open} activeOpacity={0.7}>
          <View style={{ position: 'relative' }}>
            <Bell size={22} color="rgba(255,255,255,0.4)" />
            {unreadCount > 0 && (
              <View style={s.bellBadgeMobile}>
                <Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
              </View>
            )}
          </View>
          <Text style={s.bottomTabText}>Alerts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.bottomTab} onPress={openProfile} activeOpacity={0.7}>
          {avatarId ? <Avatar avatarId={avatarId} size={24} /> : <User size={22} color="rgba(255,255,255,0.4)" />}
          <Text style={s.bottomTabText}>Profile</Text>
        </TouchableOpacity>
      </View>
      {panel}
    </>
  );
}

// `overlay` pins the bar over the content (the tab navigator renders it after
// its scenes); without it the bar sits in normal flow at the top of the page.
export function AppTopBar({ activeName, onNavigate, overlay }: NavProps & { overlay?: boolean }) {
  const avatarId = useCurrentAvatar();
  const { panel, unreadCount, open } = useNotificationPanel();
  return (
    <View style={[s.navOuter, overlay && s.navOverlay]}>
      <View style={s.nav}>
        <Pressable
          style={({ hovered }: any) => [s.navLeft, HOVER_TRANSITION, hovered && { opacity: 0.85 }]}
          onPress={() => onNavigate('Dashboard')}
          accessibilityRole="link"
          accessibilityLabel="KarmaVerse home"
        >
          {/* logo-nav.png is the padding-trimmed variant (aspect ~2.12:1) — logo.png
              has ~35% transparent padding baked in, which shrank the mark to ~31px. */}
          <Image source={require('../../../assets/logo-nav.png')} style={{ height: 56, width: 119, resizeMode: 'contain' }} />
        </Pressable>

        <View style={s.navTabs}>
          {NAV_ITEMS.map((item) => {
            const active = activeName === item.name;
            const { Icon } = item;
            return (
              <Pressable key={item.name} style={s.navTab} onPress={() => onNavigate(item.name)}>
                {({ hovered }: any) => {
                  const lit = hovered && !active;
                  return (
                    <>
                      {/* Glow rising from the underline. Always mounted and faded
                          via opacity so it can transition instead of popping in. */}
                      <View
                        style={[StyleSheet.absoluteFill, HOVER_TRANSITION, { opacity: lit ? 1 : 0, pointerEvents: 'none' }]}
                      >
                        <LinearGradient
                          colors={['transparent', 'rgba(74,222,128,0.16)']}
                          style={StyleSheet.absoluteFill}
                        />
                      </View>

                      <Icon
                        size={18}
                        color={active ? '#4ade80' : lit ? '#86efac' : 'rgba(255,255,255,0.45)'}
                        strokeWidth={active ? 2.5 : 1.8}
                      />
                      <Text style={[s.navTabText, lit && s.navTabTextHover, active && s.navTabTextActive]}>
                        {item.label}
                      </Text>

                      {active ? (
                        <View style={s.navTabIndicator} />
                      ) : (
                        // Grows out from the centre on hover (default transform origin).
                        <View
                          style={[s.navTabIndicatorHover, HOVER_TRANSITION, { transform: [{ scaleX: lit ? 1 : 0 }], pointerEvents: 'none' }]}
                        />
                      )}
                    </>
                  );
                }}
              </Pressable>
            );
          })}
        </View>

        <View style={s.navRight}>
          <Pressable
            style={({ hovered }: any) => [s.navIconBtn, HOVER_TRANSITION, hovered && s.navIconBtnHover]}
            onPress={open}
          >
            {({ hovered }: any) => (
              <>
                <Bell size={18} color={hovered ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)'} />
                {unreadCount > 0 && (
                  <View style={s.bellBadge}>
                    <Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
                  </View>
                )}
              </>
            )}
          </Pressable>
          <Pressable
            style={({ hovered }: any) => [s.navAvatar, avatarId && s.navAvatarImg, HOVER_TRANSITION, hovered && s.navAvatarHover]}
            onPress={openProfile}
          >
            {avatarId ? <Avatar avatarId={avatarId} size={34} /> : <User size={16} color="#052e16" />}
          </Pressable>
        </View>
      </View>
      {isDiwaliSeason() && <DiwaliLights top={NAV_HEIGHT} />}
      {panel}
    </View>
  );
}

const s = StyleSheet.create({
  // Mobile bottom bar — `fixed` pins it to the visual viewport bottom on every
  // phone (the tab bar renders after the scenes in the tree, so in normal flow
  // it ends up wherever the content ends instead of at the screen bottom).
  bottomBar: { position: 'fixed' as any, bottom: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', height: NAV_HEIGHT },
  bottomTab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  bottomTabText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600' },
  bottomTabTextActive: { color: '#4ade80' },
  bellBadgeMobile: { position: 'absolute', top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },

  // Desktop top navbar (Flipkart-style).
  navOuter: { backgroundColor: '#0f172a', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 12, zIndex: 100 },
  navOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  nav: { maxWidth: 1200, width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32, height: NAV_HEIGHT },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navTabs: { flexDirection: 'row', gap: 2, height: NAV_HEIGHT },
  navTab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, position: 'relative', height: NAV_HEIGHT, overflow: 'hidden' },
  navTabText: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: '600' },
  navTabTextHover: { color: '#86efac' },
  navTabTextActive: { color: '#4ade80', fontWeight: '800' },
  navTabIndicator: {
    position: 'absolute', bottom: 0, left: 16, right: 16, height: 3, backgroundColor: '#4ade80',
    borderTopLeftRadius: 3, borderTopRightRadius: 3,
    shadowColor: '#4ade80', shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  navTabIndicatorHover: {
    position: 'absolute', bottom: 0, left: 16, right: 16, height: 3, backgroundColor: '#4ade80',
    borderTopLeftRadius: 3, borderTopRightRadius: 3,
    shadowColor: '#4ade80', shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  navIconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', position: 'relative' },
  navIconBtnHover: {
    backgroundColor: 'rgba(74,222,128,0.16)', borderColor: 'rgba(74,222,128,0.45)',
    transform: [{ translateY: -2 }],
    shadowColor: '#4ade80', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  navAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#4ade80' },
  navAvatarImg: { backgroundColor: 'transparent', overflow: 'hidden' },
  navAvatarHover: {
    backgroundColor: '#4ade80',
    transform: [{ translateY: -2 }, { scale: 1.06 }],
    shadowColor: '#4ade80', shadowOpacity: 0.7, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
  },
  bellBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#0f172a' },
  bellBadgeText: { color: 'white', fontSize: 9, fontWeight: '900' },
});
