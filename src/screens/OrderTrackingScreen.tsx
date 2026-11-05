import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Animated, Dimensions, StatusBar, ActivityIndicator, Linking, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Phone, HelpCircle, Star,
  CheckCircle2, Circle, XCircle
} from 'lucide-react-native';
import { bookingService } from '../services/booking';
import { showAlert } from '../utils/alert';
import { useUserSocket } from '../context/UserSocketContext';
import { trackPickupCompleted } from '../utils/analytics';
import { RatingModal } from '../components/shared/RatingModal';
import { TrackingMap } from '../components/shared/TrackingMap';
import { useTheme, makeStyles } from '../theme';

const { height } = Dimensions.get('window');

// Status ordering — used to calculate which steps are done
const STATUS_ORDER = ['ORDER_PLACED', 'AGENT_ASSIGNED', 'AGENT_REACHED', 'VERIFICATION', 'COMPLETED'];
const statusRank = (s: string) => STATUS_ORDER.indexOf(s);

// Map a backend booking status string → internal STATUS_ORDER key.
function mapBackendStatus(s?: string): string {
  if (!s) return 'ORDER_PLACED';
  if (s === 'COMPLETED' || s === 'WAREHOUSE_REACHED') return 'COMPLETED';
  if (s === 'VERIFICATION' || s === 'PICKED_UP' || s === 'VERIFIED') return 'VERIFICATION';
  if (s === 'REACHED' || s === 'AGENT_REACHED') return 'AGENT_REACHED';
  if (s === 'ASSIGNED' || s === 'ACCEPTED') return 'AGENT_ASSIGNED';
  return 'ORDER_PLACED';
}

const EVENT_TO_STATUS: Record<string, string> = {
  BOOKING_ACCEPTED: 'AGENT_ASSIGNED',
  AGENT_REACHED: 'AGENT_REACHED',
  BOOKING_PICKED_UP: 'VERIFICATION',
  BOOKING_COMPLETED: 'COMPLETED',
};

const BASE_STEPS = [
  { key: 'ORDER_PLACED',   label: 'Order placed',       sublabel: 'Your pickup request is confirmed' },
  { key: 'AGENT_ASSIGNED', label: 'Agent assigned',     sublabel: 'Agent accepted and is on the way' },
  { key: 'AGENT_REACHED',  label: 'Agent reached',      sublabel: 'Agent has reached your location' },
  { key: 'VERIFICATION',   label: 'Verification', sublabel: 'Items weighed, KarmaCoins credited' },
  { key: 'COMPLETED',      label: 'Completed',           sublabel: 'Reached warehouse and completed' },
];

const STATUS_MESSAGES: Record<string, string> = {
  ORDER_PLACED:   'Your pickup request is confirmed',
  AGENT_ASSIGNED: 'Agent accepted your booking and is on the way!',
  AGENT_REACHED:  'Agent has reached your location!',
  VERIFICATION:   'Waste verified. KarmaCoins credited to your wallet!',
  COMPLETED:      'Booking complete. Thank you for using KarmaVer$e!',
  POOL:           'High demand in your area. Your booking is in our priority pool.',
};

// â"€â"€ Mock booking — replace with navigation params in production â"€â"€
const mockBooking = {
  id: 'KC12345',
  agent: { name: 'Ravi Kumar', rating: 4.8, phone: '+91 98765 43210', initials: 'RK' },
  distanceKm: 0.3,
  etaMins: 3,
  estimatedCoins: 45,
  agentLocation: { latitude: 28.5580, longitude: 77.3910 },
  userLocation: { latitude: 28.5355, longitude: 77.3910 },
};

export function OrderTrackingScreen({ route, navigation }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Resolve passed parameters or fallback to mock data
  const passedBooking = route?.params?.booking;
  // `bookingId` (query param) is how the email "Track pickup" link deep-links to a
  // specific booking — no full booking object is passed then, so fall back to it
  // and let the poll below hydrate the live status/agent from the backend.
  const deepLinkBookingId = route?.params?.bookingId;
  const rawBookingId = passedBooking?._id || passedBooking?.id || deepLinkBookingId || mockBooking.id;

  // Coins come from the backend, which computes them at verify time from the
  // live rate card. Until then, fall back to the schedule screen's estimate
  // passed via navigation (route.params.estimatedCoins).
  const estimatedCoins = passedBooking?.totalKarmaCoins || passedBooking?.estimatedKarmaCoins || route?.params?.estimatedCoins || 0;

  const bookingData = {
    id: rawBookingId.length > 10 ? `#${rawBookingId.substring(0, 8).toUpperCase()}` : rawBookingId,
    estimatedCoins,
  };

  const initialStatus = mapBackendStatus(passedBooking?.status);

  const passedAgent = passedBooking?.agent;
  const [activeAgent, setActiveAgent] = useState<any>(
    passedAgent && typeof passedAgent === 'object' && passedAgent.name ? passedAgent : null
  );
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [etaMins, setEtaMins] = useState<number | null>(null);
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [liveMessage, setLiveMessage] = useState(STATUS_MESSAGES[initialStatus] || STATUS_MESSAGES['ORDER_PLACED']);
  const [earnedCoins, setEarnedCoins] = useState<number | null>(
    passedBooking?.totalKarmaCoins || null
  );
  const [isPool, setIsPool] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  // Initialize from actual booking status so already-cancelled bookings show correctly
  const [isCancelled, setIsCancelled] = useState(passedBooking?.status === 'CANCELLED');
  // Don't auto-show rating modal if opening a historical completed booking
  const openedFromHistory = initialStatus === 'COMPLETED';
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isRated, setIsRated] = useState(passedBooking?.isRated ?? openedFromHistory);

  // Cancel allowed only when real booking exists and before agent reaches
  const hasRealBooking = !!(passedBooking?._id || passedBooking?.id || deepLinkBookingId);
  const CANCELLABLE_STATUSES = ['ORDER_PLACED', 'AGENT_ASSIGNED', 'PENDING', 'SCHEDULED'];
  const canCancel = hasRealBooking && CANCELLABLE_STATUSES.includes(currentStatus) && !isCancelled;

  const handleCancelBooking = () => {
    setShowCancelConfirm(true);
  };

  // KV-024: the '?' explains what each tracking stage means.
  const showStatusHelp = () => {
    showAlert(
      'What the tracking stages mean',
      'Order placed — we’ve received your pickup request.\n\n' +
      'Agent assigned — a pickup partner is on the way to you.\n\n' +
      'Agent reached — they’ve arrived at your location.\n\n' +
      'Verification — items are checked and your KarmaCoins XP are credited.\n\n' +
      'Completed — pickup done. Thank you for making an impact!'
    );
  };

  // KV-024: Help routes to support. TODO: point at live support chat/FAQ once the
  // Founding Engineer confirms the channel; for now offer email and phone.
  const showSupport = () => {
    showAlert(
      'Need help?',
      'Our support team is here for you — reach us and we’ll sort it out.',
      [
        { text: 'Email us', onPress: () => Linking.openURL('mailto:info@0waste.co.in') },
        { text: 'Call us', onPress: () => Linking.openURL('tel:+917093198828') },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  const confirmCancel = async () => {
    setShowCancelConfirm(false);
    setIsCancelling(true);
    try {
      await bookingService.cancelBooking(rawBookingId);
      setIsCancelled(true);
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      showAlert('Cannot cancel', msg || 'Could not cancel booking. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const { latestUpdate, clearLatestUpdate, agentLocation } = useUserSocket();

  // Haversine distance in km between two GPS coords
  const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // â"€â"€ Handle incoming socket events â"€â"€
  useEffect(() => {
    if (!latestUpdate) return;

    // Match using raw MongoDB _id — not the truncated display id
    const eventBookingId = latestUpdate.bookingId;
    if (eventBookingId && eventBookingId !== rawBookingId) {
      return;
    }

    const mappedStatus = EVENT_TO_STATUS[latestUpdate.event];

    if (latestUpdate.event === 'BOOKING_ACCEPTED') {
      const agentObj = latestUpdate.agent || (latestUpdate as any).booking?.agent;
      if (agentObj) setActiveAgent(agentObj);
    }

    if (latestUpdate.event === 'BOOKING_IN_POOL') {
      setIsPool(true);
      setLiveMessage(STATUS_MESSAGES['POOL']);
    } else if (latestUpdate.event === 'BOOKING_CANCEL_SUCCESS') {
      setLiveMessage('Booking cancelled.');
    } else if (latestUpdate.event === 'AGENT_LOCATION' && latestUpdate.agentLocation) {
      const userCoords = passedBooking?.address?.location?.coordinates;
      if (userCoords) {
        const dist = calcDistance(
          latestUpdate.agentLocation.lat, latestUpdate.agentLocation.lng,
          userCoords[1], userCoords[0]
        );
        setDistanceKm(parseFloat(dist.toFixed(1)));
        setEtaMins(Math.max(1, Math.round(dist / 0.5 * 10)));
      }
    } else if (mappedStatus) {
      setIsPool(false);
      // Only ever advance — a late/duplicate event must not drag the tracker back.
      setCurrentStatus((prev) => (statusRank(mappedStatus) > statusRank(prev) ? mappedStatus : prev));
      setLiveMessage(latestUpdate.message || STATUS_MESSAGES[mappedStatus]);
      if (latestUpdate.event === 'BOOKING_PICKED_UP' && latestUpdate.totalKarmaCoins) {
        setEarnedCoins(latestUpdate.totalKarmaCoins);
      }
    }

    clearLatestUpdate();
  }, [latestUpdate]);

  // Self-heal: while the tracker is open, poll the real booking status so a missed
  // or late socket event (e.g. AGENT_REACHED never reaching this device) can't leave
  // the UI stuck at "Agent assigned" or skip a step. Status only ever advances.
  useEffect(() => {
    if (!hasRealBooking) return;
    let active = true;
    const sync = async () => {
      try {
        const b = await bookingService.getBookingById(rawBookingId);
        if (!active || !b) return;
        if (b.status === 'CANCELLED') { setIsCancelled(true); return; }
        const st = mapBackendStatus(b.status);
        setCurrentStatus((prev) => (statusRank(st) > statusRank(prev) ? st : prev));
        if (b.agent && typeof b.agent === 'object' && b.agent.name) setActiveAgent(b.agent);
        if (st === 'VERIFICATION' && (b.totalKarmaCoins || b.totalKarmaCoins === 0)) setEarnedCoins(b.totalKarmaCoins);
      } catch (_) { /* transient — next tick retries */ }
    };
    sync(); // correct a stale initial status immediately on open
    const iv = setInterval(sync, 12000);
    return () => { active = false; clearInterval(iv); };
  }, [hasRealBooking, rawBookingId]);

  useEffect(() => {
    if (!rawBookingId) return;
    bookingService.getBookingById(rawBookingId)
      .then((full: any) => {
        if (full?.agent && typeof full.agent === 'object' && full.agent.name) {
          setActiveAgent(full.agent);
        }
      })
      .catch(() => {});
  }, [rawBookingId]);

  // Catches completions whose socket event this device missed (seen via the status poll).
  // Bookings opened already-completed from history are not counted again.
  useEffect(() => {
    if (currentStatus === 'COMPLETED' && !openedFromHistory) trackPickupCompleted(rawBookingId);
  }, [currentStatus, openedFromHistory, rawBookingId]);

  useEffect(() => {
    if (currentStatus === 'COMPLETED' && !isRated && !openedFromHistory) {
      const timer = setTimeout(() => setShowRatingModal(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [currentStatus, isRated, openedFromHistory]);

  const handleRatingSubmit = async (rating: number, comment: string) => {
    try {
      await bookingService.submitRating(rawBookingId, rating, comment);
      setIsRated(true);
      setShowRatingModal(false);
      showAlert('Thank you!', 'Your rating has been submitted.');
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      if (msg === 'You have already rated this booking') {
        setIsRated(true);
        setShowRatingModal(false);
      } else {
        showAlert('Could not submit rating', msg || 'Please try again.');
      }
    }
  };
  // â"€â"€ Pulse animation for active step â"€â"€
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Compute which steps are done/active from currentStatus
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const steps = BASE_STEPS.map((step) => {
    const stepIndex = STATUS_ORDER.indexOf(step.key);
    return {
      ...step,
      done: stepIndex < currentIndex,
      active: stepIndex === currentIndex,
    };
  });



  // â"€â"€ Cancelled state — full screen replacement â"€â"€
  if (isCancelled) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#b91c1c" />
        <SafeAreaView edges={['top']} style={[styles.header, { backgroundColor: '#b91c1c' }]}>
          <TouchableOpacity onPress={() => navigation.navigate('Orders')} style={styles.backBtn}>
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Cancelled</Text>
          {/* Invisible spacer to keep the title centred — no background, so it
              doesn't render as a stray circle like the styled help button would. */}
          <View style={{ width: 36 }} />
        </SafeAreaView>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.bg }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <XCircle size={44} color="#dc2626" />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text, marginBottom: 10, textAlign: 'center' }}>Pickup Cancelled</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '500', textAlign: 'center', lineHeight: 22, marginBottom: 8 }}>
            Your pickup request has been cancelled successfully.
          </Text>
          <Text style={{ fontSize: 13, color: colors.textFaint, fontWeight: '600', marginBottom: 40 }}>{bookingData.id}</Text>
          <TouchableOpacity
            style={{ backgroundColor: '#15803d', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, width: '100%', maxWidth: 420, alignItems: 'center', elevation: 3, shadowColor: '#15803d', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}
            onPress={() => navigation.navigate('SchedulePickup')}
          >
            <Text style={{ color: 'white', fontSize: 15, fontWeight: '800' }}>Schedule New Pickup</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ marginTop: 14, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, width: '100%', maxWidth: 420, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border }}
            onPress={() => navigation.navigate('Orders')}
          >
            <Text style={{ color: colors.textMuted, fontSize: 15, fontWeight: '700' }}>View All Orders</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#15803d" />

      {/* â"€â"€ Header â"€â"€ */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('App')} style={styles.backBtn}>
          <ArrowLeft size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live tracking</Text>
        <TouchableOpacity style={styles.helpIconBtn} onPress={showStatusHelp}>
          <HelpCircle size={20} color="white" />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      {/* â"€â"€ Booking Badge â"€â"€ */}
      <View style={[styles.bookingBadge, { maxWidth: 900, width: '100%', alignSelf: 'center' }]}>
        <View style={styles.bookingBadgeLeft}>
          <Text style={styles.bookingIdLabel}>Booking ID</Text>
          <Text style={styles.bookingId}>{bookingData.id}</Text>
        </View>
        {currentStatus === 'COMPLETED' ? (
          <View style={[styles.inProgressBadge, { backgroundColor: '#dcfce7' }]}>
            <View style={[styles.inProgressDot, { backgroundColor: '#16a34a' }]} />
            <Text style={[styles.inProgressText, { color: '#15803d' }]}>COMPLETED</Text>
          </View>
        ) : (
          <View style={styles.inProgressBadge}>
            <View style={styles.inProgressDot} />
            <Text style={styles.inProgressText}>IN PROGRESS</Text>
          </View>
        )}
      </View>

      {/* â"€â"€ Agent Card â"€â"€ */}
      {activeAgent ? (
        <View style={styles.agentCard}>
          <View style={styles.agentAvatar}>
            <Text style={styles.agentInitials}>
              {activeAgent.name ? activeAgent.name.split(' ').map((n: any) => n[0]).join('').toUpperCase() : 'AP'}
            </Text>
          </View>
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>{activeAgent.name || 'Agent Partner'}</Text>
            <View style={styles.agentRatingRow}>
              <Star size={12} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.agentRating}>
                {activeAgent.rating != null ? activeAgent.rating : (activeAgent.averageRating != null ? activeAgent.averageRating : 'NA')}
              </Text>
              <Text style={styles.agentDistance}>
                {distanceKm !== null ? `• ${distanceKm} km away • ${etaMins} mins` : ''}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.agentCard, { backgroundColor: colors.primarySoft, borderColor: '#86efac', borderWidth: 1 }]}>
          <View style={[styles.agentAvatar, { backgroundColor: colors.surfaceAlt }]}>
            <ActivityIndicator size="small" color="#15803d" />
          </View>
          <View style={styles.agentInfo}>
            <Text style={[styles.agentName, { color: colors.primary, fontWeight: '700' }]}>Finding agent...</Text>
            <Text style={styles.agentDistance}>Searching for the nearest active pickup partner</Text>
          </View>
        </View>
      )}

      {/* Live Map — visible when agent is assigned or reached */}
      {(currentStatus === 'AGENT_ASSIGNED' || currentStatus === 'AGENT_REACHED') && (
        <View style={styles.mapContainer}>
          {passedBooking?.address?.location?.coordinates ? (
            <TrackingMap
              userCoordinate={[passedBooking.address.location.coordinates[0], passedBooking.address.location.coordinates[1]]}
              agentLocation={agentLocation}
            />
          ) : (
            <View style={styles.mapComingSoon}>
              <ActivityIndicator size="small" color="#16a34a" />
              <Text style={styles.mapComingSoonTitle}>Initializing map...</Text>
            </View>
          )}
        </View>
      )}

      {/* â"€â"€ Bottom Sheet â"€â"€ */}
      <View style={styles.bottomSheet}>

        {/* Live Status */}
        <View style={styles.liveStatusRow}>
          <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }], backgroundColor: isPool ? '#f59e0b' : '#22c55e' }]} />
          <Text style={styles.liveStatusLabel}>Live status</Text>
          <Text style={styles.liveStatusTime}>Just now</Text>
        </View>
        <Text style={styles.liveStatusText}>{liveMessage}</Text>

        {/* Priority Pool Badge */}
        {isPool && (
          <View style={styles.poolBadge}>
            <Text style={styles.poolBadgeText}>⏳ In Priority Pool — We'll notify you when an agent picks up</Text>
          </View>
        )}

        {/* KarmaCoins earned toast */}
        {earnedCoins !== null && (
          <View style={styles.coinsBadge}>
            <Text style={styles.coinsBadgeText}>🎉 {earnedCoins} KarmaCoins credited to your wallet!</Text>
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{distanceKm !== null ? `${distanceKm} km` : '—'}</Text>
            <Text style={styles.statLabel}>Distance away</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{etaMins !== null ? `${etaMins} mins` : '—'}</Text>
            <Text style={styles.statLabel}>ETA</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Number(earnedCoins ?? bookingData.estimatedCoins ?? 0).toLocaleString('en-IN')} KC</Text>
            <Text style={styles.statLabel}>{earnedCoins !== null ? 'Coins earned' : 'Est. coins'}</Text>
          </View>
        </View>

        {/* Progress Steps */}
        <Text style={styles.sectionTitle}>Tracking progress</Text>
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={step.key} style={styles.stepRow}>
              {/* Icon */}
              <View style={styles.stepIconCol}>
                {step.done ? (
                  <View style={styles.stepDoneCircle}>
                    <CheckCircle2 size={20} color="white" fill="#15803d" />
                  </View>
                ) : step.active ? (
                  <Animated.View style={[styles.stepActiveCircle, { transform: [{ scale: pulseAnim }] }]}>
                    <View style={styles.stepActiveDot} />
                  </Animated.View>
                ) : (
                  <View style={styles.stepPendingCircle}>
                    <Circle size={20} color={colors.border} />
                  </View>
                )}
                {index < steps.length - 1 && (
                  <View style={[styles.stepLine, step.done && styles.stepLineDone]} />
                )}
              </View>

              {/* Text */}
              <View style={styles.stepTextCol}>
                <View style={styles.stepTitleRow}>
                  <Text style={[styles.stepLabel, step.active && styles.stepLabelActive, !step.done && !step.active && styles.stepLabelPending]}>
                    {step.label}
                  </Text>
                </View>
                <Text style={styles.stepSublabel}>{step.sublabel}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.primaryBtn, !activeAgent?.phone && { opacity: 0.5 }]}
          onPress={() => activeAgent?.phone && Linking.openURL(`tel:${activeAgent.phone}`)}
          disabled={!activeAgent?.phone}
        >
          <Phone size={16} color="white" />
          <Text style={styles.primaryBtnText}>Contact agent</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={showSupport}>
          <HelpCircle size={16} color={colors.textMuted} />
          <Text style={styles.secondaryBtnText}>Need help?</Text>
        </TouchableOpacity>

        {/* Cancel Button — only before agent reaches */}
        {canCancel && !showCancelConfirm && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancelBooking}
            disabled={isCancelling}
            activeOpacity={0.8}
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <>
                <XCircle size={16} color="#ef4444" />
                <Text style={styles.cancelBtnText}>Cancel booking</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Inline cancel confirmation — replaces Alert.alert (works on web) */}
        {canCancel && showCancelConfirm && (
          <View style={styles.cancelConfirmBox}>
            <Text style={styles.cancelConfirmText}>Cancel this pickup request?</Text>
            <View style={styles.cancelConfirmRow}>
              <TouchableOpacity style={styles.cancelConfirmNo} onPress={() => setShowCancelConfirm(false)}>
                <Text style={styles.cancelConfirmNoText}>Keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelConfirmYes} onPress={confirmCancel} disabled={isCancelling}>
                {isCancelling ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.cancelConfirmYesText}>Yes, cancel</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </View>
      </ScrollView>

      {/* â"€â"€ Rating Modal — appears after pickup COMPLETED â"€â"€ */}
      <RatingModal
        visible={showRatingModal}
        agentName={activeAgent?.name || 'Your Agent'}
        agentInitials={
          activeAgent?.name
            ? activeAgent.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
            : 'AP'
        }
        bookingId={rawBookingId}
        onSkip={() => { setShowRatingModal(false); setIsRated(true); }}
        onSubmit={handleRatingSubmit}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },

  // Header
  header: { backgroundColor: '#15803d', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: 'white' },
  helpIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  // Booking Badge
  bookingBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.surface, marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14, elevation: 2, shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  bookingBadgeLeft: {},
  bookingIdLabel: { fontSize: 11, color: c.textFaint, fontWeight: '600' },
  bookingId: { fontSize: 18, fontWeight: '900', color: c.text, marginTop: 2 },
  inProgressBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fef9c3', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  inProgressDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ca8a04' },
  inProgressText: { fontSize: 10, fontWeight: '800', color: '#ca8a04' },

  // Agent Card
  agentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, marginHorizontal: 16, marginTop: 10, borderRadius: 14, padding: 14, elevation: 2, shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, maxWidth: 900, width: '100%', alignSelf: 'center' },
  agentAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#15803d', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  agentInitials: { color: 'white', fontWeight: '800', fontSize: 16 },
  agentInfo: { flex: 1 },
  agentName: { fontSize: 15, fontWeight: '800', color: c.text },
  agentRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  agentRating: { fontSize: 12, fontWeight: '700', color: c.text },
  agentDistance: { fontSize: 12, color: c.textMuted, fontWeight: '500' },
  callBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.primarySoft, borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center', justifyContent: 'center' },

  // Map
  mapContainer: { marginHorizontal: 16, marginTop: 10, borderRadius: 20, overflow: 'hidden', height: height * 0.22, elevation: 3, shadowColor: c.shadow, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, maxWidth: 900, width: '100%', alignSelf: 'center' },
  mapComingSoon: { flex: 1, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', padding: 20 },
  mapComingSoonTitle: { fontSize: 14, fontWeight: '700', color: c.primary, marginTop: 8, textAlign: 'center' },
  userPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#dcfce7', borderWidth: 2, borderColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  agentPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 2, borderColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#0ea5e9', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  map: { flex: 1 },
  agentMarker: { backgroundColor: 'white', borderRadius: 20, padding: 4, elevation: 3, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  agentMarkerEmoji: { fontSize: 22 },
  userMarker: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(59,130,246,0.3)', alignItems: 'center', justifyContent: 'center' },
  userMarkerInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3b82f6', borderWidth: 2, borderColor: 'white' },

  // Bottom Sheet
  bottomSheet: { flex: 1, backgroundColor: c.surface, marginTop: 10, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, overflow: 'hidden', maxWidth: 900, width: '100%', alignSelf: 'center' },

  // Live Status
  liveStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  liveStatusLabel: { fontSize: 13, fontWeight: '700', color: c.textMuted, flex: 1 },
  liveStatusTime: { fontSize: 11, color: c.textFaint, fontWeight: '500' },
  liveStatusText: { fontSize: 14, color: c.text, fontWeight: '600', marginBottom: 16 },

  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceAlt, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: c.border },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '900', color: c.primary },
  statLabel: { fontSize: 11, color: c.textFaint, fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: c.border },

  // Steps
  sectionTitle: { fontSize: 15, fontWeight: '800', color: c.text, marginBottom: 16 },
  stepsContainer: { marginBottom: 24 },
  stepRow: { flexDirection: 'row', gap: 14 },
  stepIconCol: { alignItems: 'center', width: 24 },
  stepDoneCircle: {},
  stepActiveCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: c.primarySoft, borderWidth: 2, borderColor: '#15803d', alignItems: 'center', justifyContent: 'center' },
  stepActiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#15803d' },
  stepPendingCircle: {},
  stepLine: { width: 2, height: 36, backgroundColor: c.border, marginVertical: 4 },
  stepLineDone: { backgroundColor: '#15803d' },
  stepTextCol: { flex: 1, paddingBottom: 20 },
  stepTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepLabel: { fontSize: 14, fontWeight: '700', color: c.text },
  stepLabelActive: { color: c.primary },
  stepLabelPending: { color: c.textFaint },
  stepTime: { fontSize: 11, color: c.textMuted, fontWeight: '600' },
  stepSublabel: { fontSize: 12, color: c.textFaint, fontWeight: '500', marginTop: 2 },

  poolBadge: { backgroundColor: '#fef3c7', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#fde68a' },
  poolBadgeText: { fontSize: 13, color: '#92400e', fontWeight: '600', lineHeight: 18 },
  coinsBadge: { backgroundColor: c.primarySoft, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#bbf7d0' },
  coinsBadgeText: { fontSize: 13, color: c.primary, fontWeight: '700' },

  // Buttons
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#15803d', borderRadius: 16, paddingVertical: 16, marginBottom: 12, elevation: 3, shadowColor: '#15803d', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  primaryBtnText: { color: 'white', fontSize: 15, fontWeight: '800' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.surface, borderRadius: 16, paddingVertical: 14, borderWidth: 1.5, borderColor: c.border },
  secondaryBtnText: { color: c.textMuted, fontSize: 15, fontWeight: '700' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fef2f2', borderRadius: 16, paddingVertical: 14, borderWidth: 1.5, borderColor: '#fecaca', marginTop: 8 },
  cancelBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
  cancelConfirmBox: { backgroundColor: '#fef2f2', borderRadius: 16, padding: 16, marginTop: 8, borderWidth: 1.5, borderColor: '#fecaca' },
  cancelConfirmText: { fontSize: 14, fontWeight: '700', color: '#0f172a', textAlign: 'center', marginBottom: 12 },
  cancelConfirmRow: { flexDirection: 'row', gap: 10 },
  cancelConfirmNo: { flex: 1, backgroundColor: c.surface, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  cancelConfirmNoText: { color: c.textMuted, fontSize: 14, fontWeight: '700' },
  cancelConfirmYes: { flex: 1, backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelConfirmYesText: { color: 'white', fontSize: 14, fontWeight: '700' },
}));
