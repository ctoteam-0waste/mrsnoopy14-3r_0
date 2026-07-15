import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { showAlert } from '../utils/alert';
import { LinearGradient } from 'expo-linear-gradient';
import { Package, Truck, CheckCircle2, ChevronRight, Clock, Star } from 'lucide-react-native';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { RatingModal } from '../components/shared/RatingModal';
import { bookingService } from '../services/booking';

export function OrdersScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'Active' | 'History'>('Active');
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Bookings rated this session — gives instant UI feedback before the next refetch
  const [ratedOrders, setRatedOrders] = useState<Set<string>>(new Set());
  const [ratingTarget, setRatingTarget] = useState<{ orderId: string; agentName: string; agentInitials: string } | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const data = await bookingService.getMyBookings();
        setOrders(data || []);
      } catch (error) {
        console.error('Failed to fetch orders', error);
      } finally {
        setIsLoading(false);
      }
    };

    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrders();
    });
    fetchOrders();
    return unsubscribe;
  }, [navigation]);

  const handleRatingSubmit = async (rating: number, comment: string) => {
    if (!ratingTarget) return;
    const orderId = ratingTarget.orderId;
    try {
      await bookingService.submitRating(orderId, rating, comment);
      setRatedOrders(prev => new Set(prev).add(orderId));
      setRatingTarget(null);
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      if (msg === 'You have already rated this booking') {
        setRatedOrders(prev => new Set(prev).add(orderId));
        setRatingTarget(null);
      } else {
        showAlert('Could not submit rating', msg || 'Please try again.');
      }
    }
  };

  const formatOrder = (order: any) => {
    let uiStatus = 'Scheduled';
    if (order.status === 'COMPLETED') uiStatus = 'Completed';
    if (order.status === 'IN_TRANSIT' || order.status === 'ACCEPTED') uiStatus = 'In Transit';
    if (order.status === 'CANCELLED') uiStatus = 'Cancelled';

    const dateObj = new Date(order.pickupDate);
    const dateStr = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    const mainCategory = order.categories?.[0]?.subCategory || order.categories?.[0]?.category || 'Mixed Waste';
    const typeLabel = order.categories?.length > 1 ? `${mainCategory} +${order.categories.length - 1}` : mainCategory;

    const rawId = order._id || order.id || '00000000';
    const shortId = `#${rawId.substring(0, 8).toUpperCase()}`;

    return {
      id: shortId,
      originalId: rawId,
      rawOrder: order,
      type: typeLabel,
      date: `${dateStr}, ${order.timeSlot}`,
      status: uiStatus,
      credits: order.totalKarmaCoins || 0,
      weight: 'Est. calculation',
      rawStatus: order.status,
      isRated: !!order.isRated
    };
  };

  const formattedOrders = orders.map(formatOrder);

  const filteredOrders = formattedOrders.filter(order => {
    if (activeTab === 'Active') return order.status === 'Scheduled' || order.status === 'In Transit';
    return order.status === 'Completed' || order.status === 'Cancelled';
  });


  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Completed': return { bg: '#dcfce7', text: '#16a34a', icon: <CheckCircle2 size={14} color="#16a34a" /> };
      case 'In Transit': return { bg: '#fef08a', text: '#ca8a04', icon: <Truck size={14} color="#ca8a04" /> };
      case 'Cancelled': return { bg: '#fee2e2', text: '#dc2626', icon: <Package size={14} color="#dc2626" /> };
      case 'Scheduled': default: return { bg: '#e0f2fe', text: '#0284c7', icon: <Clock size={14} color="#0284c7" /> };
    }
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={['#052e16', '#166534', '#15803d']} style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerSubtitle}>Track your impact</Text>
            <Text style={styles.headerTitle}>My pickups</Text>
          </View>

          {/* Custom Tab Switcher (Integrated into Header bottom) */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'Active' && styles.tabBtnActive]}
              onPress={() => setActiveTab('Active')}
            >
              <Text style={[styles.tabText, activeTab === 'Active' && styles.tabTextActive]}>Active pickups</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'History' && styles.tabBtnActive]}
              onPress={() => setActiveTab('History')}
            >
              <Text style={[styles.tabText, activeTab === 'History' && styles.tabTextActive]}>Past history</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.scrollContent}>

          {isLoading ? (
             <View style={{ marginTop: 40, alignItems: 'center' }}>
               <ActivityIndicator size="large" color="#16a34a" />
               <Text style={{ marginTop: 12, color: '#64748b' }}>Loading your pickups...</Text>
             </View>
          ) : filteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Package size={56} color="#cbd5e1" />
              <Text style={styles.emptyText}>No {activeTab.toLowerCase()} pickups found.</Text>
              {activeTab === 'Active' && (
                <TouchableOpacity style={styles.scheduleBtn} onPress={() => navigation.navigate('SchedulePickup')}>
                  <Text style={styles.scheduleBtnText}>Schedule a pickup</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredOrders.map(order => {
              const sc = getStatusColor(order.status);
              const isOrderRated = order.isRated || ratedOrders.has(order.originalId);
              return (
                <TouchableOpacity 
                  key={order.id} 
                  style={styles.orderCard} 
                  activeOpacity={0.7}
                  onPress={() => {
                    if (order.status === 'Completed' || order.status === 'Cancelled') {
                      navigation.navigate('BookingDetails', { booking: order.rawOrder });
                    } else {
                      navigation.navigate('OrderTracking', { booking: order.rawOrder });
                    }
                  }}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.orderId}>{order.id}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                      {sc.icon}
                      <Text style={[styles.statusText, { color: sc.text }]}>{order.status}</Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.iconBox}>
                      <Package size={24} color="#16a34a" />
                    </View>
                    <View style={styles.infoBox}>
                      <Text style={styles.orderType}>{order.type}</Text>
                      <Text style={styles.orderDate}>{order.date} • {order.weight}</Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.creditsBox}>
                      <Text style={styles.creditsLabel}>Est. reward</Text>
                      <View style={styles.creditsRow}>
                        <KarmaCoin size={16} />
                        <Text style={styles.creditsValue}>+{order.credits}</Text>
                      </View>
                    </View>
                    <ChevronRight size={20} color="#cbd5e1" />
                  </View>

                  {/* Rate agent button — only on completed unrated orders in History tab */}
                  {activeTab === 'History' && order.status === 'Completed' && !isOrderRated && (
                    <TouchableOpacity
                      style={styles.rateBtn}
                      activeOpacity={0.8}
                      onPress={(e) => {
                        e.stopPropagation();
                        const agent = order.rawOrder?.agent;
                        const agentName = agent?.name || 'Your Agent';
                        const agentInitials = agentName
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase();
                        setRatingTarget({ orderId: order.originalId, agentName, agentInitials });
                      }}
                    >
                      <Star size={14} color="#f59e0b" fill="#f59e0b" />
                      <Text style={styles.rateBtnText}>Rate agent</Text>
                    </TouchableOpacity>
                  )}

                  {/* Already rated badge */}
                  {activeTab === 'History' && order.status === 'Completed' && isOrderRated && (
                    <View style={styles.ratedBadge}>
                      <Star size={12} color="#16a34a" fill="#16a34a" />
                      <Text style={styles.ratedBadgeText}>Rated</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })
          )}
        </View>
      </ScrollView>

      {/* Rating Modal — triggered from History tab "Rate agent" button */}
      {ratingTarget && (
        <RatingModal
          visible={!!ratingTarget}
          agentName={ratingTarget.agentName}
          agentInitials={ratingTarget.agentInitials}
          bookingId={ratingTarget.orderId}
          onSkip={() => setRatingTarget(null)}
          onSubmit={handleRatingSubmit}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: '#f0fdf6' },
  container: { flex: 1, backgroundColor: '#f0fdf6' },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { marginBottom: 20 },
  headerSubtitle: { color: '#86efac', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: 'white', letterSpacing: 0.5 },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 100,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 100 },
  tabBtnActive: { backgroundColor: 'white', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  tabText: { color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  tabTextActive: { color: '#064e3b', fontWeight: '900' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100, gap: 16, maxWidth: 800, width: '100%', alignSelf: 'center' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { color: '#94a3b8', marginTop: 16, fontSize: 16, fontWeight: '600' },
  scheduleBtn: { marginTop: 24, backgroundColor: '#15803d', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 100, shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  scheduleBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },
  
  orderCard: { backgroundColor: 'white', borderRadius: 24, padding: 18, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 14 },
  orderId: { fontSize: 14, color: '#64748b', fontWeight: '800', letterSpacing: 0.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100, gap: 6 },
  statusText: { fontSize: 12, fontWeight: '800' },
  
  cardBody: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 16 },
  iconBox: { width: 52, height: 52, backgroundColor: '#f0fdf4', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  infoBox: { flex: 1 },
  orderType: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  orderDate: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 14, borderRadius: 16 },
  creditsBox: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  creditsLabel: { fontSize: 13, color: '#64748b', fontWeight: '700' },
  creditsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  creditsValue: { fontSize: 16, fontWeight: '900', color: '#16a34a' },
  rateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, backgroundColor: '#fffbeb', borderWidth: 1.5, borderColor: '#fcd34d', borderRadius: 12, paddingVertical: 10 },
  rateBtnText: { fontSize: 13, fontWeight: '800', color: '#d97706' },
  ratedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 12, backgroundColor: '#f0fdf4', borderRadius: 12, paddingVertical: 8 },
  ratedBadgeText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
});
