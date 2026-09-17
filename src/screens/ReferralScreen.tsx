import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, ActivityIndicator, StatusBar, Platform, Modal, Linking } from 'react-native';
import { showAlert } from '../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Share2, Copy, Users, Gift, CheckCircle2, Clock, X, MessageCircle, Linkedin, Facebook, Twitter, Instagram, Mail, Link2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { referralService } from '../services/referral';

export function ReferralScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Link straight to the login/signup page with ?ref= prefilled. Must point at a real
  // route: /login is in the router, /register is NOT (it resolved to NotFound, so the
  // code never reached the signup form). The Login screen reads ?ref= and validates on
  // load, and deepLink.capturePendingDeepLink() also stashes the code before the router
  // rewrites the URL. Origin-aware so the testing site shares its own URL, production
  // shares karmaverse.earth.
  const frontendOrigin = (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin)
    ? window.location.origin
    : 'https://karmaverse.earth';
  const shareUrl = referralCode ? `${frontendOrigin}/login?ref=${referralCode}` : `${frontendOrigin}/`;
  const shareMsg = `Join KarmaVer$e and we both earn 1,000 KarmaCoins XP! 🌱 Use my referral code ${referralCode}`;

  const copyLink = () => {
    const text = `${shareMsg} ${shareUrl}`;
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    if (nav?.clipboard?.writeText) nav.clipboard.writeText(text);
    else Share.share({ message: text }).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const SHARE_TARGETS = [
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: '#25D366', url: `https://wa.me/?text=${encodeURIComponent(shareMsg + ' ' + shareUrl)}` },
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0A66C2', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}` },
    { key: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877F2', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
    { key: 'x', label: 'X', icon: Twitter, color: '#0f172a', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMsg)}&url=${encodeURIComponent(shareUrl)}` },
    { key: 'email', label: 'Email', icon: Mail, color: '#ea4335', url: `mailto:?subject=${encodeURIComponent('Join KarmaVer$e')}&body=${encodeURIComponent(shareMsg + '\n\n' + shareUrl)}` },
    { key: 'instagram', label: 'Instagram', icon: Instagram, color: '#E4405F', url: '' },
    { key: 'copy', label: 'Copy link', icon: Link2, color: '#16a34a', url: '' },
  ];

  const openTarget = (t: typeof SHARE_TARGETS[number]) => {
    setShareOpen(false);
    if (t.key === 'copy') { copyLink(); showAlert('Link copied', 'Your referral link is copied — paste it anywhere!'); return; }
    if (t.key === 'instagram') { copyLink(); showAlert('Link copied', 'Instagram has no direct share — paste the copied link in your story or DM'); return; }
    if (Platform.OS === 'web') { (window as any).open(t.url, '_blank'); }
    else Linking.openURL(t.url).catch(() => {});
  };

  useEffect(() => {
    const load = async () => {
      try {
        // getMyCode guarantees a code is generated if user doesn't have one
        const [codeData, statsData] = await Promise.all([
          referralService.getMyCode().catch(() => null),
          referralService.getStats().catch(() => null),
        ]);
        const code = codeData?.referralCode || statsData?.referralCode || '';
        setReferralCode(code);
        setTotalReferrals(statsData?.totalReferrals || codeData?.totalReferrals || 0);
        setTotalEarned(statsData?.totalEarned || codeData?.totalEarned || 0);
        setReferrals(statsData?.referrals || []);
      } catch {
        showAlert('Error', 'Could not load referral data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCopy = async () => {
    if (!referralCode) return;
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    if (nav?.clipboard?.writeText) {
      nav.clipboard.writeText(referralCode).catch(() => {});
    } else {
      try { await Share.share({ message: referralCode }); } catch (_) {}
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!referralCode) return;
    // Mobile browsers + native: use the OS share sheet. Desktop web: open our
    // own menu with direct links to each app (WhatsApp, LinkedIn, FB, X, etc).
    if (Platform.OS === 'web') {
      const nav: any = typeof navigator !== 'undefined' ? navigator : null;
      if (nav?.share) {
        try { await nav.share({ title: 'KarmaVer$e', text: shareMsg, url: shareUrl }); return; } catch (_) { /* fall through */ }
      }
      setShareOpen(true);
      return;
    }
    try {
      await Share.share({ message: `${shareMsg}\n${shareUrl}` });
    } catch (_) {}
  };

  // Backend sends "Unknown" when the referred user's name isn't set yet
  const displayName = (name?: string) =>
    !name || name.toLowerCase() === 'unknown' ? 'New user' : name;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" />
      <View style={styles.topNotchFiller} />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollBg} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

          {/* ── Hero ── */}
          <LinearGradient colors={['#7e22ce', '#db2777']} style={styles.heroSection}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('App')}>
                <ChevronLeft size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Refer & earn</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.heroContent}>
              <Gift size={48} color="white" style={styles.heroIcon} />
              <Text style={styles.heroTitle}>Invite friends, get rewarded</Text>
              <Text style={styles.heroSub}>
                Share your code. When a friend joins, you both get 1,000 KarmaCoins XP.
              </Text>

              {loading ? (
                <ActivityIndicator size="large" color="white" style={{ marginVertical: 32 }} />
              ) : (
                <>
                  <View style={styles.codeBox}>
                    <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
                    <View style={styles.codeRow}>
                      <Text style={styles.codeValue} selectable numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                        {referralCode || '—'}
                      </Text>
                      <TouchableOpacity
                        style={[styles.copyBtn, copied && { backgroundColor: '#dcfce7' }]}
                        onPress={handleCopy}
                        activeOpacity={0.8}
                        disabled={!referralCode}
                      >
                        {copied
                          ? <CheckCircle2 size={20} color="#16a34a" />
                          : <Copy size={20} color="#db2777" />}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85} disabled={!referralCode}>
                    <Share2 size={20} color="white" />
                    <Text style={styles.shareBtnText}>Share your code</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </LinearGradient>

          {/* ── Stats Card ── */}
          <View style={styles.statsWidget}>
            <View style={styles.statsRow}>
              <View style={styles.statsDataBox}>
                <Text style={styles.statsDataLabel}>Friends referred</Text>
                <View style={styles.statsDataNumRow}>
                  <Users size={16} color="#7c3aed" />
                  <Text style={[styles.statsDataNum, { color: '#7c3aed' }]}>{totalReferrals}</Text>
                </View>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsDataBox}>
                <Text style={styles.statsDataLabel}>Coins earned</Text>
                <View style={styles.statsDataNumRow}>
                  <KarmaCoin size={18} />
                  <Text style={[styles.statsDataNum, { color: '#d97706' }]}>+{totalEarned.toLocaleString()}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Referral History ── */}
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Your referrals</Text>

            {loading ? (
              <ActivityIndicator color="#7c3aed" style={{ marginTop: 20 }} />
            ) : referrals.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={40} color="#e2e8f0" />
                <Text style={styles.emptyTitle}>No referrals yet</Text>
                <Text style={styles.emptyText}>Share your code — when a friend joins, both of you earn coins.</Text>
                <TouchableOpacity style={styles.emptyShareBtn} onPress={handleShare} disabled={!referralCode}>
                  <Share2 size={16} color="white" />
                  <Text style={styles.emptyShareText}>Share now</Text>
                </TouchableOpacity>
              </View>
            ) : (
              referrals.map((ref: any, i: number) => (
                <View key={i} style={styles.referralCard}>
                  <View style={styles.referralAvatar}>
                    <Text style={styles.referralAvatarText}>{displayName(ref.referredUserName).charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.referralName}>{displayName(ref.referredUserName)}</Text>
                      {ref.referralNumber && (
                        <View style={styles.referralNumBadge}>
                          <Text style={styles.referralNumText}>#{ref.referralNumber}</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Clock size={12} color="#94a3b8" />
                      <Text style={styles.referralDate}>{formatDate(ref.createdAt)}</Text>
                    </View>
                  </View>
                  <View style={styles.referralCoins}>
                    <KarmaCoin size={14} />
                    <Text style={styles.referralCoinsText}>+{(ref.coinsEarned || 1000).toLocaleString()}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Share menu (desktop web / no native share) */}
      <Modal visible={shareOpen} transparent animationType="fade" onRequestClose={() => setShareOpen(false)}>
        <TouchableOpacity style={styles.shareBackdrop} activeOpacity={1} onPress={() => setShareOpen(false)}>
          <TouchableOpacity style={styles.shareSheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.shareHeader}>
              <Text style={styles.shareTitle}>Share your code</Text>
              <TouchableOpacity onPress={() => setShareOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.shareGrid}>
              {SHARE_TARGETS.map((t) => (
                <TouchableOpacity key={t.key} style={styles.shareOption} onPress={() => openTarget(t)} activeOpacity={0.8}>
                  <View style={[styles.shareOptionIcon, { backgroundColor: t.color }]}>
                    <t.icon size={22} color="#fff" />
                  </View>
                  <Text style={styles.shareOptionLabel}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  shareBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  shareSheet: { backgroundColor: 'white', borderRadius: 24, padding: 22, width: '100%', maxWidth: 420, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 12 },
  shareHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  shareTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  shareGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  shareOption: { width: 84, alignItems: 'center', paddingVertical: 10, gap: 8 },
  shareOptionIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  shareOptionLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },

  rootContainer: { flex: 1, backgroundColor: '#7e22ce' },
  scrollBg: { flex: 1, backgroundColor: '#f8fafc' },
  topNotchFiller: { position: 'absolute', top: 0, left: 0, right: 0, height: 60, backgroundColor: '#7e22ce' },
  container: { flex: 1, maxWidth: 900, width: '100%', alignSelf: 'center' },

  heroSection: { borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingTop: 10, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '800' },

  heroContent: { paddingHorizontal: 24, marginTop: 32, alignItems: 'center' },
  heroIcon: { marginBottom: 16 },
  heroTitle: { color: 'white', fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, textAlign: 'center', lineHeight: 22, fontWeight: '500', marginBottom: 28 },

  codeBox: { width: '100%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', marginBottom: 16 },
  codeLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeValue: { color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: 1, flex: 1 },
  copyBtn: { backgroundColor: 'white', width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  shareBtn: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', width: '100%', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  shareBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },

  statsWidget: { marginHorizontal: 20, marginTop: -30, backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statsDataBox: { flex: 1 },
  statsDataLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 6 },
  statsDataNumRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statsDataNum: { fontSize: 28, fontWeight: '900' },
  statsDivider: { width: 1, height: 40, backgroundColor: '#e2e8f0', marginHorizontal: 20 },

  historySection: { paddingHorizontal: 20, marginTop: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 16 },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#374151' },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  emptyShareBtn: { flexDirection: 'row', backgroundColor: '#7c3aed', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, alignItems: 'center', gap: 8, marginTop: 8 },
  emptyShareText: { color: 'white', fontWeight: '800', fontSize: 14 },

  referralCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  referralAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fdf4ff', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  referralAvatarText: { fontSize: 18, fontWeight: '900', color: '#7c3aed' },
  referralName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  referralNumBadge: { backgroundColor: '#fdf4ff', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  referralNumText: { fontSize: 11, fontWeight: '800', color: '#7c3aed' },
  referralDate: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  referralCoins: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
  referralCoinsText: { fontSize: 14, fontWeight: '800', color: '#d97706' },
});
