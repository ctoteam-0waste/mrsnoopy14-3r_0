import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Leaf, Mail, Phone, MapPin } from 'lucide-react-native';

const MAX = 1200;

export function WebFooter() {
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  const pad = isMobile ? 16 : 40;

  return (
    <View style={s.footer}>
      <View style={[s.container, { paddingHorizontal: pad }]}>
        <View style={[s.grid, isMobile && { flexDirection: 'column', gap: 28, paddingTop: 32, paddingBottom: 28 }]}>

          {/* About */}
          <View style={[s.col, isMobile && { flex: undefined }]}>
            <View style={s.logoRow}>
              <View style={s.logoIcon}><Leaf size={16} color="#052e16" /></View>
              <Text style={s.logoText}>KarmaCoins XP</Text>
            </View>
            <Text style={s.aboutText}>
              India's rewarding recycling platform. Turn your waste into Karma Coins — schedule free doorstep pickups and earn rewards for every kg recycled.
            </Text>
          </View>

          {/* Quick Links + Contact in a row on mobile */}
          {isMobile ? (
            <View style={{ flexDirection: 'row', gap: 24 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.colTitle}>Quick links</Text>
                {['How it works', 'Features', 'Daily quiz', 'Knowledge hub', 'Referral program'].map(link => (
                  <Text key={link} style={s.link}>{link}</Text>
                ))}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.colTitle}>Contact us</Text>
                <View style={s.contactRow}>
                  <Mail size={13} color="#94a3b8" />
                  <Text style={[s.contactText, { fontSize: 12 }]}>support@karmacoins.in</Text>
                </View>
                <View style={s.contactRow}>
                  <Phone size={13} color="#94a3b8" />
                  <Text style={s.contactText}>+91 98765 43210</Text>
                </View>
                <View style={s.contactRow}>
                  <MapPin size={13} color="#94a3b8" />
                  <Text style={s.contactText}>Patna, Bihar, India</Text>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View style={s.col}>
                <Text style={s.colTitle}>Quick links</Text>
                {['How it works', 'Features', 'Daily quiz', 'Knowledge hub', 'Referral program'].map(link => (
                  <Text key={link} style={s.link}>{link}</Text>
                ))}
              </View>
              <View style={s.col}>
                <Text style={s.colTitle}>Contact us</Text>
                <View style={s.contactRow}>
                  <Mail size={14} color="#94a3b8" />
                  <Text style={s.contactText}>support@karmacoins.in</Text>
                </View>
                <View style={s.contactRow}>
                  <Phone size={14} color="#94a3b8" />
                  <Text style={s.contactText}>+91 98765 43210</Text>
                </View>
                <View style={s.contactRow}>
                  <MapPin size={14} color="#94a3b8" />
                  <Text style={s.contactText}>Patna, Bihar, India</Text>
                </View>
              </View>
            </>
          )}

          {/* Download App */}
          <View style={[s.col, isMobile && { flex: undefined }]}>
            <Text style={s.colTitle}>Get the app</Text>
            <View style={isMobile ? { flexDirection: 'row', gap: 10 } : {}}>
              <TouchableOpacity style={[s.storeBtn, isMobile && { flex: 1 }]}>
                <Text style={s.storeBtnIcon}>▶</Text>
                <View>
                  <Text style={s.storeBtnSub}>GET IT ON</Text>
                  <Text style={s.storeBtnText}>Google Play</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[s.storeBtn, isMobile && { flex: 1 }]}>
                <Text style={s.storeBtnIcon}>●</Text>
                <View>
                  <Text style={s.storeBtnSub}>DOWNLOAD ON</Text>
                  <Text style={s.storeBtnText}>App Store</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom bar */}
      <View style={s.bottomBar}>
        <View style={[s.container, { paddingHorizontal: pad }, isMobile ? s.bottomContentMobile : s.bottomContent]}>
          <Text style={s.copyright}>© 2026 KarmaCoins XP by 3R Zero Waste. All rights reserved.</Text>
          {!isMobile && (
            <View style={s.legalLinks}>
              <Text style={s.legalLink}>Privacy policy</Text>
              <Text style={s.legalDot}>·</Text>
              <Text style={s.legalLink}>Terms of service</Text>
            </View>
          )}
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

  storeBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  storeBtnIcon: { color: 'white', fontSize: 16 },
  storeBtnSub: { color: '#94a3b8', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  storeBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },

  bottomBar: { borderTopWidth: 1, borderTopColor: '#1e293b' },
  bottomContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18 },
  bottomContentMobile: { flexDirection: 'column', alignItems: 'center', paddingVertical: 16, gap: 4 },
  copyright: { color: '#64748b', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  legalLinks: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legalLink: { color: '#64748b', fontSize: 12, fontWeight: '500' },
  legalDot: { color: '#475569', fontSize: 12 },
});
