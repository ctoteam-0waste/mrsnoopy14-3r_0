import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, SafeAreaView, ActivityIndicator } from 'react-native';
import { ChevronLeft, Clock, CheckCircle2, XCircle, History } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { redeemService } from '../services/redeem';

export function RedeemHistoryScreen({ navigation }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setIsLoading(true);
        const data = await redeemService.getMyRequests();
        setRequests(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch redeem requests', error);
      } finally {
        setIsLoading(false);
      }
    };

    const unsubscribe = navigation.addListener('focus', fetchRequests);
    fetchRequests();
    return unsubscribe;
  }, [navigation]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return { bg: '#dcfce7', text: '#16a34a', icon: <CheckCircle2 size={14} color="#16a34a" /> };
      case 'REJECTED': return { bg: '#fee2e2', text: '#dc2626', icon: <XCircle size={14} color="#dc2626" /> };
      case 'PENDING': default: return { bg: '#fef3c7', text: '#d97706', icon: <Clock size={14} color="#d97706" /> };
    }
  };

  const formatDate = (dateStr?: string) =>
    dateStr ? new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      <View style={styles.topNotchFiller} />

      <LinearGradient colors={['#064e3b', '#15803d']} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtnInner} onPress={() => navigation.goBack()}>
              <ChevronLeft size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Redeem requests</Text>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#16a34a" />
            <Text style={{ marginTop: 12, color: '#64748b' }}>Loading your requests...</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyState}>
            <History size={56} color="#cbd5e1" />
            <Text style={styles.emptyText}>No redeem requests yet.</Text>
          </View>
        ) : (
          requests.map((req) => {
            const sc = getStatusColor(req.status);
            return (
              <View key={req._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.amountRow}>
                    <KarmaCoin size={18} />
                    <Text style={styles.coinsText}>-{req.coinsRedeemed}</Text>
                    <Text style={styles.rupeesText}>≈ ₹{req.amountInRupees}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    {sc.icon}
                    <Text style={[styles.statusText, { color: sc.text }]}>{req.status}</Text>
                  </View>
                </View>

                <Text style={styles.dateText}>Requested {formatDate(req.createdAt)}</Text>

                {req.status === 'PAID' && req.processedAt && (
                  <Text style={styles.paidText}>Paid on {formatDate(req.processedAt)}</Text>
                )}

                {req.status === 'REJECTED' && (
                  <View style={styles.rejectionBanner}>
                    <Text style={styles.rejectionText}>
                      {req.rejectionReason || 'Request rejected.'} Your coins have been refunded.
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  topNotchFiller: { position: 'absolute', top: 0, left: 0, right: 0, height: 60, backgroundColor: '#064e3b' },
  scroll: { flex: 1 },

  header: { paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  backBtnInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: 'white', textAlign: 'center' },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#94a3b8', marginTop: 12, fontWeight: '600' },

  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coinsText: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  rupeesText: { fontSize: 12, fontWeight: '700', color: '#64748b', marginLeft: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100, gap: 6 },
  statusText: { fontSize: 11, fontWeight: '800' },

  dateText: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 8 },
  paidText: { fontSize: 12, color: '#16a34a', fontWeight: '700', marginTop: 4 },

  rejectionBanner: { marginTop: 10, backgroundColor: '#fef2f2', borderRadius: 10, padding: 10 },
  rejectionText: { fontSize: 12, color: '#b91c1c', fontWeight: '600', lineHeight: 17 },
});
