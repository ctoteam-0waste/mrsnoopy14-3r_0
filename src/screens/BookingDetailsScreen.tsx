import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import {
  ArrowLeft, MoreHorizontal, MapPin, Package,
  Weight, Coins, Phone, Star, Navigation
} from 'lucide-react-native';

const mockBooking = {
  id: 'KC12345',
  status: 'IN PROGRESS',
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

export function BookingDetailsScreen({ navigation }: any) {
  const region = {
    latitude: (mockBooking.agentLocation.latitude + mockBooking.userLocation.latitude) / 2,
    longitude: (mockBooking.agentLocation.longitude + mockBooking.userLocation.longitude) / 2,
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

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Booking ID */}
        <View style={styles.card}>
          <View style={styles.bookingTopRow}>
            <View>
              <Text style={styles.bookingIdLabel}>Booking ID</Text>
              <Text style={styles.bookingId}>{mockBooking.id}</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{mockBooking.status}</Text>
            </View>
          </View>

          {/* Address */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBg, { backgroundColor: '#f0fdf4' }]}>
              <MapPin size={16} color="#15803d" />
            </View>
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Pickup Address</Text>
              <Text style={styles.detailValue}>{mockBooking.address}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Waste Type</Text>
              <Text style={styles.gridValue}>{mockBooking.wasteType}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Est. Weight</Text>
              <Text style={styles.gridValue}>{mockBooking.estWeight}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Est. Coins</Text>
              <View style={styles.coinsRow}>
                <Text style={styles.gridValue}>{mockBooking.estCoins} </Text>
                <Text style={styles.coinEmoji}>🪙</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Agent Details */}
        <Text style={styles.sectionTitle}>Agent Details</Text>
        <View style={styles.card}>
          <View style={styles.agentRow}>
            <View style={styles.agentAvatar}>
              <Text style={styles.agentInitials}>{mockBooking.agent.initials}</Text>
            </View>
            <View style={styles.agentInfo}>
              <Text style={styles.agentName}>{mockBooking.agent.name}</Text>
              <View style={styles.ratingRow}>
                <Star size={13} color="#f59e0b" fill="#f59e0b" />
                <Text style={styles.agentRating}>{mockBooking.agent.rating}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.callBtn}>
              <Phone size={18} color="#15803d" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Location */}
        <View style={styles.liveSectionHeader}>
          <Text style={styles.sectionTitle}>Live Location</Text>
          <View style={styles.updatedBadge}>
            <View style={styles.updatedDot} />
            <Text style={styles.updatedText}>Updated just now</Text>
          </View>
        </View>

        <View style={styles.mapCard}>
          <MapView
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            region={region}
            scrollEnabled={false}
            zoomEnabled={false}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
          >
            <UrlTile
              urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maximumZ={19}
              flipY={false}
            />
            <Marker coordinate={mockBooking.agentLocation} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.agentMarker}>
                <Text style={{ fontSize: 20 }}>🚛</Text>
              </View>
            </Marker>
            <Marker coordinate={mockBooking.userLocation} anchor={{ x: 0.5, y: 1 }}>
              <View style={styles.userMarker}>
                <View style={styles.userMarkerInner} />
              </View>
            </Marker>
            <Polyline
              coordinates={[mockBooking.agentLocation, mockBooking.userLocation]}
              strokeColor="#15803d"
              strokeWidth={3}
              lineDashPattern={[8, 4]}
            />
          </MapView>
          <View style={styles.mapOverlay}>
            <View style={styles.etaChip}>
              <Navigation size={12} color="#15803d" />
              <Text style={styles.etaText}>
                {mockBooking.distanceKm} km away • {mockBooking.etaMins} mins from your location
              </Text>
            </View>
          </View>
        </View>

        {/* CTA Button */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={styles.trackBtn}
            onPress={() => navigation.navigate('OrderTracking')}
          >
            <Navigation size={16} color="white" />
            <Text style={styles.trackBtnText}>View Live Tracking</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
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
  coinEmoji: { fontSize: 14 },

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

  agentMarker: { backgroundColor: 'white', borderRadius: 16, padding: 3, elevation: 2 },
  userMarker: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(59,130,246,0.25)', alignItems: 'center', justifyContent: 'center' },
  userMarkerInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3b82f6', borderWidth: 2, borderColor: 'white' },

  ctaContainer: { marginHorizontal: 16 },
  trackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#15803d', borderRadius: 16, paddingVertical: 16, elevation: 3, shadowColor: '#15803d', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  trackBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
});
