import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Image, Linking, Platform } from 'react-native';
import { Mail, MapPin, Phone, Instagram, Facebook, Linkedin, Twitter, Youtube } from 'lucide-react-native';
import { getToken } from '../../utils/tokenStore';
import { useNavigation } from '@react-navigation/native';
import { GooglePlayLogo, AppleLogo } from './StoreLogos';

const MAX = 1200;
const ADDRESS = 'Plot 62, Sector 8, IMT Manesar, Gurugram, Haryana 122051';
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`;
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.karmacredits.app';

const SOCIALS = [
  { key: 'instagram', Icon: Instagram, url: 'https://www.instagram.com/mykarmaverse/' },
  { key: 'facebook', Icon: Facebook, url: 'https://www.facebook.com/share/p/17GYy6Qyam/' },
  { key: 'linkedin', Icon: Linkedin, url: 'https://www.linkedin.com/showcase/136793967' },
  { key: 'twitter', Icon: Twitter, url: 'https://x.com/mykarmaverse' },
  { key: 'youtube', Icon: Youtube, url: 'https://www.youtube.com/channel/UCJjzqmfLvyFhGRwfjSGE4bw' },
];

const openExternal = (url: string) => {
  if (Platform.OS === 'web') window.open(url, '_blank', 'noopener');
  else Linking.openURL(url).catch(() => {});
};

export function WebFooter() {
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  const pad = isMobile ? 16 : 40;
  const navigation = useNavigation<any>();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    getToken().then(t => setIsLoggedIn(!!t)).catch(() => {});
  }, []);

  // Logged-in users must stay inside the authenticated app — sending them to the
  // Splash/onboarding page (KV-011) feels like a forced logout. Flow → the app
  // home, Learn & earn → the in-app Knowledge Hub. Guests keep the marketing scroll.
  const QUICK_LINKS = [
    {
      label: 'Learn & earn',
      onPress: () => isLoggedIn
        ? navigation.navigate('KnowledgeHub')
        : navigation.navigate('Splash', { scrollTo: 'learning' }),
    },
    { label: 'Daily quiz', onPress: () => navigation.navigate('Quiz') },
    { label: 'Knowledge hub', onPress: () => navigation.navigate('KnowledgeHub') },
    { label: 'Blog', onPress: () => navigation.navigate('Blog') },
    { label: 'Referral program', onPress: () => navigation.navigate('Referral') },
    { label: 'About us', onPress: () => navigation.navigate('AboutUs') },
    { label: 'News', onPress: () => navigation.navigate('News') },
  ];

  const SocialRow = () => (
    <View style={s.socialRow}>
      {SOCIALS.map(({ key, Icon, url }) => (
        <TouchableOpacity key={key} style={s.socialBtn} onPress={() => openExternal(url)} activeOpacity={0.8}>
          <Icon size={16} color="#cbd5e1" />
        </TouchableOpacity>
      ))}
    </View>
  );

  const ContactBlock = ({ small }: { small?: boolean }) => (
    <>
      <Text style={s.colTitle}>Contact us</Text>
      <View style={s.contactRow}>
        <Mail size={small ? 13 : 14} color="#94a3b8" />
        <Text style={[s.contactText, small && { fontSize: 12 }]}>info@0waste.co.in</Text>
      </View>
      <View style={s.contactRow}>
        <Phone size={small ? 13 : 14} color="#94a3b8" />
        <Text style={[s.contactText, small && { fontSize: 12 }]}>+91 70931 98828</Text>
      </View>
      <TouchableOpacity style={s.contactRow} onPress={() => openExternal(MAPS_URL)} activeOpacity={0.7}>
        <MapPin size={small ? 13 : 14} color="#94a3b8" />
        <Text style={[s.contactText, s.addressLink]}>{ADDRESS}</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={s.footer}>
      <View style={[s.container, { paddingHorizontal: pad }]}>
        <View style={[s.grid, isMobile && { flexDirection: 'column', gap: 28, paddingTop: 32, paddingBottom: 28 }]}>

          {/* About */}
          <View style={[s.col, isMobile && s.colMobile]}>
            <View style={s.logoRow}>
              <Image source={require('../../../assets/logo-nav.png')} style={{ height: 68, width: 144, resizeMode: 'contain' }} />
            </View>
            <Text style={s.aboutText}>
              India's rewarding sustainability platform. Turn your everyday materials into KarmaCoins XP — schedule free sustainable pickups and earn rewards for every kg recovered.
            </Text>
            <SocialRow />
          </View>

          {/* Quick Links + Contact */}
          {isMobile ? (
            <View style={[s.colMobile, { flexDirection: 'row', gap: 24 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.colTitle}>Quick links</Text>
                {QUICK_LINKS.map(link => (
                  <TouchableOpacity key={link.label} onPress={link.onPress}>
                    <Text style={s.link}>{link.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flex: 1 }}>
                <ContactBlock small />
              </View>
            </View>
          ) : (
            <>
              <View style={s.col}>
                <Text style={s.colTitle}>Quick links</Text>
                {QUICK_LINKS.map(link => (
                  <TouchableOpacity key={link.label} onPress={link.onPress}>
                    <Text style={s.link}>{link.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.col}>
                <ContactBlock />
              </View>
            </>
          )}

          {/* Download App */}
          <View style={[s.col, isMobile && s.colMobile]}>
            <Text style={s.colTitle}>Get the app</Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <TouchableOpacity style={[s.storeBtn, { flexGrow: 1 }]} onPress={() => openExternal(PLAY_STORE_URL)} activeOpacity={0.85}>
                <GooglePlayLogo size={24} />
                <View>
                  <Text style={s.storeBtnSub}>GET IT ON</Text>
                  <Text style={s.storeBtnText}>Google Play</Text>
                </View>
              </TouchableOpacity>
              <View style={[s.storeBtn, s.storeBtnDisabled, { flexGrow: 1 }]}>
                <AppleLogo size={24} />
                <View>
                  <Text style={s.storeBtnSub}>DOWNLOAD ON</Text>
                  <Text style={s.storeBtnText}>App Store</Text>
                  <Text style={s.comingSoonInline}>Coming soon</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom bar */}
      <View style={s.bottomBar}>
        <View style={[s.container, { paddingHorizontal: pad }, isMobile ? s.bottomContentMobile : s.bottomContent]}>
          <Text style={s.copyright}>© 2026 KarmaVer$e by 3R ZeroWaste. All rights reserved.</Text>
          <View style={s.legalLinks}>
            <TouchableOpacity onPress={() => navigation.navigate('Legal', { type: 'privacy' })}>
              <Text style={s.legalLink}>Privacy policy</Text>
            </TouchableOpacity>
            <Text style={s.legalDot}>·</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Legal', { type: 'terms' })}>
              <Text style={s.legalLink}>Terms & conditions</Text>
            </TouchableOpacity>
            <Text style={s.legalDot}>·</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Legal', { type: 'terms-of-use' })}>
              <Text style={s.legalLink}>Terms of use</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  footer: { backgroundColor: '#0f172a' },
  container: { maxWidth: MAX, width: '100%', alignSelf: 'center' },
  grid: { flexDirection: 'row', paddingTop: 50, paddingBottom: 40, gap: 40 },

  col: { flex: 1 },
  // On react-native-web `flex: 0` compiles to `flex: 0 0 0%`, which collapses a
  // column child to height 0 and makes the sections overlap. Use explicit
  // longhands so each column keeps its content height and full width on mobile.
  colMobile: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  logoIcon: { width: 28, height: 28, borderRadius: 7, backgroundColor: '#4ade80', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: 'white', fontSize: 16, fontWeight: '900' },
  aboutText: { color: '#94a3b8', fontSize: 13, lineHeight: 21, fontWeight: '500' },

  socialRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  socialBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },

  colTitle: { color: 'white', fontSize: 14, fontWeight: '800', marginBottom: 14 },
  link: { color: '#94a3b8', fontSize: 13, fontWeight: '500', marginBottom: 10 },

  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  contactText: { color: '#94a3b8', fontSize: 13, fontWeight: '500', flex: 1 },
  addressLink: { textDecorationLine: 'underline' },

  storeBtn: { minWidth: 130, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  storeBtnDisabled: { opacity: 0.5 },
  storeBtnSub: { color: '#94a3b8', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  storeBtnText: { color: 'white', fontSize: 14, fontWeight: '700', marginTop: 1 },
  comingSoonInline: { color: '#4ade80', fontSize: 10, fontWeight: '700', opacity: 0.85, marginTop: 2 },

  bottomBar: { borderTopWidth: 1, borderTopColor: '#1e293b' },
  bottomContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18 },
  bottomContentMobile: { flexDirection: 'column', alignItems: 'center', paddingVertical: 16, gap: 10 },
  copyright: { color: '#64748b', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  legalLinks: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legalLink: { color: '#64748b', fontSize: 12, fontWeight: '500' },
  legalDot: { color: '#475569', fontSize: 12 },
});
