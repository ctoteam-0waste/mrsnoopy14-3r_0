import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiveMap } from '../components/shared/LiveMap';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import {
  ArrowLeft, MoreHorizontal, MapPin,
  Phone, Star, Navigation, FileText
} from 'lucide-react-native';
import { bookingService } from '../services/booking';

const FALLBACK = {
  id: 'KC12345',
  status: 'COMPLETED',
  address: 'Green Park Society, Sector 16, Noida, UP 201301',
  wasteType: 'Mixed Waste',
  estWeight: '2.5 kg',
  estCoins: 45,
  agent: { name: 'Ravi Kumar', rating: 4.8, initials: 'RK', phone: '+91 98765 43210' },
  distanceKm: 0.3,
  etaMins: 3,
  agentLocation: { latitude: 28.5580, longitude: 77.3910 },
  userLocation: { latitude: 28.5355, longitude: 77.3910 },
};

export function BookingDetailsScreen({ navigation, route }: any) {
  const passed = route?.params?.booking;
  const bookingId = passed?._id || passed?.id || '';
  const [agentData, setAgentData] = useState<any>(passed?.agent || null);

  useEffect(() => {
    if (!bookingId) return;
    bookingService.getBookingById(bookingId)
      .then((full: any) => {
        if (full?.agent) setAgentData(full.agent);
      })
      .catch(() => {});
  }, [bookingId]);

  const rawId = bookingId || FALLBACK.id;
  const shortId = rawId.length > 10 ? `#${rawId.substring(0, 8).toUpperCase()}` : rawId;

  const mainCat = passed?.categories?.[0]?.subCategory || passed?.categories?.[0]?.category || FALLBACK.wasteType;
  const wasteType = passed?.categories?.length > 1 ? `${mainCat} +${passed.categories.length - 1}` : (mainCat || FALLBACK.wasteType);

  const addressText = typeof passed?.address === 'object'
    ? (passed.address?.fullAddress || FALLBACK.address)
    : (passed?.address || FALLBACK.address);

  const booking = {
    id: shortId,
    status: passed?.status || FALLBACK.status,
    address: addressText,
    wasteType,
    estCoins: passed?.totalKarmaCoins || FALLBACK.estCoins,
    agent: agentData || FALLBACK.agent,
    specialInstruction: passed?.specialInstruction || null,
    agentLocation: agentData?.location || passed?.agent?.location || FALLBACK.agentLocation,
    userLocation: passed?.address?.location?.coordinates
      ? { latitude: passed.address.location.coordinates[1], longitude: passed.address.location.coordinates[0] }
      : FALLBACK.userLocation,
  };

  const region = {
    latitude: (booking.agentLocation.latitude + booking.userLocation.latitude) / 2,
    longitude: (booking.agentLocation.longitude + booking.userLocation.longitude) / 2,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <SafeAreaView edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={20} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <TouchableOpacity style={styles.moreBtn}>
            <MoreHorizontal size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Booking ID */}
        <View style={styles.card}>
          <View style={styles.bookingTopRow}>
            <View>
              <Text style={styles.bookingIdLabel}>Booking ID</Text>
              <Text style={styles.bookingId}>{booking.id}</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{booking.status}</Text>
            </View>
          </View>

          {/* Address */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBg, { backgroundColor: '#f0fdf4' }]}>
              <MapPin size={16} color="#15803d" />
            </View>
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Pickup Address</Text>
              <Text style={styles.detailValue}>{booking.address}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Waste Type</Text>
              <Text style={styles.gridValue}>{booking.wasteType}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Est. Coins</Text>
              <View style={styles.coinsRow}>
                <Text style={styles.gridValue}>{booking.estCoins} </Text>
                <KarmaCoin size={14} />
              </View>
            </View>
          </View>

          {/* Special Instructions */}
          {booking.specialInstruction ? (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={[styles.detailIconBg, { backgroundColor: '#fefce8' }]}>
                  <FileText size={16} color="#ca8a04" />
                </View>
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Special instructions</Text>
                  <Text style={styles.detailValue}>{booking.specialInstruction}</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* Agent Details */}
        <Text style={styles.sectionTitle}>Agent Details</Text>
        <View style={styles.card}>
          {booking.agent ? (
            <View style={styles.agentRow}>
              <View style={styles.agentAvatar}>
                <Text style={styles.agentInitials}>
                  {booking.agent.name
                    ? booking.agent.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
                    : 'AP'}
                </Text>
              </View>
              <View style={styles.agentInfo}>
                <Text style={styles.agentName}>{booking.agent.name || 'Agent Partner'}</Text>
                <View style={styles.ratingRow}>
                  <Star size={13} color="#f59e0b" fill="#f59e0b" />
                  <Text style={styles.agentRating}>
                    {booking.agent.rating != null ? booking.agent.rating : (booking.agent.averageRating != null ? booking.agent.averageRating : 'NA')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => booking.agent?.phone && Linking.openURL(`tel:${booking.agent.phone}`)}
              >
                <Phone size={18} color="#15803d" />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={{ color: '#94a3b8', fontWeight: '600' }}>Agent not yet assigned</Text>
          )}
        </View>

        {/* Live Location — only shown for active/in-progress bookings */}
        {booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED' && passed?.agent?.location ? (
          <>
            <View style={styles.liveSectionHeader}>
              <Text style={styles.sectionTitle}>Live Location</Text>
              <View style={styles.updatedBadge}>
                <View style={styles.updatedDot} />
                <Text style={styles.updatedText}>Updated just now</Text>
              </View>
            </View>

            <View style={styles.mapCard}>
              <LiveMap
                style={styles.map}
                region={region}
                agentLocation={booking.agentLocation}
                userLocation={booking.userLocation}
              />
              <View style={styles.mapOverlay}>
                <View style={styles.etaChip}>
                  <Navigation size={12} color="#15803d" />
                  <Text style={styles.etaText}>Agent location shown above</Text>
                </View>
              </View>
            </View>
          </>
        ) : null}

        {/* CTA Button */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={styles.trackBtn}
            onPress={() => navigation.navigate('OrderTracking', { booking: passed })}
          >
            <Navigation size={16} color="white" />
            <Text style={styles.trackBtnText}>
              {passed?.status === 'COMPLETED' ? 'View booking progress' : 'View live tracking'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { maxWidth: 680, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#0f172a' },
  moreBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },

  card: { backgroundColor: 'white', marginHorizontal: 16, marginBottom: 12, borderRadius: 20, padding: 18, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },

  bookingTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  bookingIdLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  bookingId: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fef9c3', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ca8a04' },
  statusText: { fontSize: 10, fontWeight: '800', color: '#ca8a04' },

  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  detailIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  detailText: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 2 },
  detailValue: { fontSize: 14, color: '#0f172a', fontWeight: '600', lineHeight: 20 },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },

  detailsGrid: { flexDirection: 'row', gap: 8 },
  gridItem: { flex: 1 },
  gridLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 4 },
  gridValue: { fontSize: 15, color: '#0f172a', fontWeight: '800' },
  coinsRow: { flexDirection: 'row', alignItems: 'center' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginHorizontal: 16, marginBottom: 8 },

  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  agentAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#15803d', alignItems: 'center', justifyContent: 'center' },
  agentInitials: { color: 'white', fontSize: 18, fontWeight: '900' },
  agentInfo: { flex: 1 },
  agentName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  agentRating: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  callBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#bbf7d0', alignItems: 'center', justifyContent: 'center' },

  liveSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 8, marginTop: 4 },
  updatedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  updatedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  updatedText: { fontSize: 11, color: '#22c55e', fontWeight: '600' },

  mapCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 20, overflow: 'hidden', height: 200, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  map: { flex: 1 },
  mapOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 16, paddingVertical: 10 },
  etaChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  etaText: { fontSize: 13, color: '#0f172a', fontWeight: '600' },

  ctaContainer: { marginHorizontal: 16 },
  trackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#15803d', borderRadius: 16, paddingVertical: 16, elevation: 3, shadowColor: '#15803d', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  trackBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
});
