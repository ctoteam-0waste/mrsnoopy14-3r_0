import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Image } from 'react-native';
import { Mail, MapPin, Phone } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

const MAX = 1200;

export function WebFooter() {
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  const pad = isMobile ? 16 : 40;
  const navigation = useNavigation<any>();

  const QUICK_LINKS = [
    { label: 'Flow', onPress: () => navigation.navigate('Splash', { scrollTo: 'howItWorks' }) },
    { label: 'Learn & earn', onPress: () => navigation.navigate('Splash', { scrollTo: 'learning' }) },
    { label: 'Daily quiz', onPress: () => navigation.navigate('Quiz') },
    { label: 'Knowledge hub', onPress: () => navigation.navigate('KnowledgeHub') },
    { label: 'Referral program', onPress: () => navigation.navigate('Referral') },
    { label: 'About us', onPress: () => navigation.navigate('AboutUs') },
  ];

  return (
    <View style={s.footer}>
      <View style={[s.container, { paddingHorizontal: pad }]}>
        <View style={[s.grid, isMobile && { flexDirection: 'column', gap: 28, paddingTop: 32, paddingBottom: 28 }]}>

          {/* About */}
          <View style={[s.col, isMobile && { flex: undefined }]}>
            <View style={s.logoRow}>
              <Image source={require('../../../assets/logo-nav.png')} style={{ height: 52, width: 110, resizeMode: 'contain' }} />
            </View>
            <Text style={s.aboutText}>
              India's rewarding recycling platform. Turn your waste into KarmaCoins XP — schedule free doorstep pickups and earn rewards for every kg recycled.
            </Text>
          </View>

          {/* Quick Links + Contact in a row on mobile */}
          {isMobile ? (
            <View style={{ flexDirection: 'row', gap: 24 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.colTitle}>Quick links</Text>
                {QUICK_LINKS.map(link => (
                  <TouchableOpacity key={link.label} onPress={link.onPress}>
                    <Text style={s.link}>{link.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.colTitle}>Contact us</Text>
                <View style={s.contactRow}>
                  <Mail size={13} color="#94a3b8" />
                  <Text style={[s.contactText, { fontSize: 12 }]}>info@0waste.co.in</Text>
                </View>
                <View style={s.contactRow}>
                  <Phone size={13} color="#94a3b8" />
                  <Text style={[s.contactText, { fontSize: 12 }]}>+91 70931 98828</Text>
                </View>
                <View style={s.contactRow}>
                  <MapPin size={13} color="#94a3b8" />
                  <Text style={s.contactText}>PLOT 62, Sector 8, Imt Manesar, Gurugram, Haryana 122503</Text>
                </View>
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
                <Text style={s.colTitle}>Contact us</Text>
                <View style={s.contactRow}>
                  <Mail size={14} color="#94a3b8" />
                  <Text style={s.contactText}>info@0waste.co.in</Text>
                </View>
                <View style={s.contactRow}>
                  <Phone size={14} color="#94a3b8" />
                  <Text style={s.contactText}>+91 70931 98828</Text>
                </View>
                <View style={s.contactRow}>
                  <MapPin size={14} color="#94a3b8" />
                  <Text style={s.contactText}>PLOT 62, Sector 8, Imt Manesar, Gurugram, Haryana 122503</Text>
                </View>
              </View>
            </>
          )}

          {/* Download App */}
          <View style={[s.col, isMobile && { flex: undefined }]}>
            <Text style={s.colTitle}>Get the app</Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <View style={[s.storeBtn, s.storeBtnDisabled, { flexGrow: 1 }]}>
                <Text style={s.storeBtnSub}>GET IT ON</Text>
                <Text style={s.storeBtnText}>Google Play</Text>
                <Text style={s.comingSoonInline}>Coming soon</Text>
              </View>
              <View style={[s.storeBtn, s.storeBtnDisabled, { flexGrow: 1 }]}>
                <Text style={s.storeBtnSub}>DOWNLOAD ON</Text>
                <Text style={s.storeBtnText}>App Store</Text>
                <Text style={s.comingSoonInline}>Coming soon</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom bar */}
      <View style={s.bottomBar}>
        <View style={[s.container, { paddingHorizontal: pad }, isMobile ? s.bottomContentMobile : s.bottomContent]}>
          <Text style={s.copyright}>© 2026 KarmaVer$e by 3R Zero Waste. All rights reserved.</Text>
          <View style={s.legalLinks}>
            <TouchableOpacity onPress={() => navigation.navigate('Legal', { type: 'privacy' })}>
              <Text style={s.legalLink}>Privacy policy</Text>
            </TouchableOpacity>
            <Text style={s.legalDot}>·</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Legal', { type: 'terms' })}>
              <Text style={s.legalLink}>Terms of service</Text>
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
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  logoIcon: { width: 28, height: 28, borderRadius: 7, backgroundColor: '#4ade80', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: 'white', fontSize: 16, fontWeight: '900' },
  aboutText: { color: '#94a3b8', fontSize: 13, lineHeight: 21, fontWeight: '500' },

  colTitle: { color: 'white', fontSize: 14, fontWeight: '800', marginBottom: 14 },
  link: { color: '#94a3b8', fontSize: 13, fontWeight: '500', marginBottom: 10 },

  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  contactText: { color: '#94a3b8', fontSize: 13, fontWeight: '500', flex: 1 },

  storeBtn: { minWidth: 130, backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
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
