import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, ScrollView,
  StyleSheet, ActivityIndicator, Keyboard, Modal,
  StatusBar, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, ArrowLeft, Navigation2, Home, Briefcase, MapPinned, Pencil } from 'lucide-react-native';
import * as Location from 'expo-location';
import { mapService, MapSuggestion } from '../../services/mapService';
import { MapPicker } from './MapPicker';

export interface AddressDetails {
  houseNo: string;
  building?: string;
  landmark?: string;
  receiverName?: string;
  receiverPhone?: string;
  label?: string; // 'Home' | 'Work' | 'Other'
  area: string;   // reverse-geocoded area address
  fullAddress: string;
  coordinates: [number, number];
}

function suggestionKey(item: MapSuggestion): string {
  return item.eLoc || `${item.lat}-${item.lng}`;
}

// Compose the flat address string the backend stores today, from all detail parts.
// The backend only persists `fullAddress`, so receiver contact is folded in here
// (otherwise it would be dropped) — this reaches the agent on the booking.
function composeFullAddress(
  houseNo: string, building: string, area: string, landmark: string,
  receiverName: string, receiverPhone: string,
): string {
  const parts = [houseNo.trim(), building.trim(), area].filter(Boolean);
  let full = parts.join(', ');
  if (landmark.trim()) full += ` (near ${landmark.trim()})`;
  const contact = [receiverName.trim(), receiverPhone.trim()].filter(Boolean).join(' ');
  if (contact) full += ` — Contact: ${contact}`;
  return full;
}

// India centroid — used only when no GPS/profile coordinate is available yet.
const DEFAULT_CENTER: [number, number] = [78.9629, 20.5937];

const LABELS = [
  { key: 'Home', icon: Home },
  { key: 'Work', icon: Briefcase },
  { key: 'Other', icon: MapPinned },
];

interface AddressSearchProps {
  visible: boolean;
  onSelect: (address: string, coords: [number, number], details?: AddressDetails) => void;
  onCancel: () => void;
  userCoords?: [number, number] | null;
  initialDetails?: Partial<AddressDetails>;
}

export function AddressSearch({ visible, onSelect, onCancel, userCoords, initialDetails }: AddressSearchProps) {
  const [step, setStep] = useState<'map' | 'details'>('map');

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MapSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [center, setCenter] = useState<[number, number]>(userCoords || DEFAULT_CENTER);
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [resolvedCoords, setResolvedCoords] = useState<[number, number] | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Details form
  const [houseNo, setHouseNo] = useState('');
  const [building, setBuilding] = useState('');
  const [landmark, setLandmark] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [label, setLabel] = useState('Home');
  const [detailError, setDetailError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const reverseGeocodeCenter = useCallback((coords: [number, number]) => {
    if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current);
    geocodeDebounceRef.current = setTimeout(async () => {
      setIsGeocoding(true);
      try {
        const result = await mapService.reverseGeocode(coords[1], coords[0]);
        const address = result.formattedAddress || [result.locality, result.city, result.state].filter(Boolean).join(', ');
        setResolvedAddress(address);
        setResolvedCoords(coords);
      } catch (e) {
        setResolvedAddress('');
        setResolvedCoords(null);
      } finally {
        setIsGeocoding(false);
      }
    }, 350);
  }, []);

  // Reset state whenever modal opens
  useEffect(() => {
    if (visible) {
      setStep('map');
      setQuery('');
      setSuggestions([]);
      setError(null);
      setDetailError(null);
      setHouseNo(initialDetails?.houseNo || '');
      setBuilding(initialDetails?.building || '');
      setLandmark(initialDetails?.landmark || '');
      setReceiverName(initialDetails?.receiverName || '');
      setReceiverPhone(initialDetails?.receiverPhone || '');
      setLabel(initialDetails?.label || 'Home');
      const start = (userCoords && typeof userCoords[0] === 'number' && typeof userCoords[1] === 'number')
        ? userCoords
        : DEFAULT_CENTER;
      setCenter(start);
      reverseGeocodeCenter(start);
    }
  }, [visible]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setError(null);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const lat = center[1];
        const lng = center[0];
        const results = await mapService.autosuggest(trimmed, lat, lng);
        setSuggestions(results);
        setError(results.length === 0 ? 'No results found. Try a different keyword.' : null);
      } catch (e: any) {
        console.error('[AddressSearch] Autosuggest error:', e?.response?.status, e?.response?.data, e?.message);
        setSuggestions([]);
        setError('Search failed. Check your connection and try again.');
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords: [number, number] = [loc.coords.longitude, loc.coords.latitude];
      setCenter(coords);
      reverseGeocodeCenter(coords);
    } catch (e: any) {
      console.error('[AddressSearch] GPS error:', e?.message);
      setError('Could not detect your location. Try searching or dragging the map.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelect = async (item: MapSuggestion) => {
    Keyboard.dismiss();
    setSuggestions([]);
    setQuery('');

    if (typeof item.lat === 'number' && typeof item.lng === 'number' && !Number.isNaN(item.lat) && !Number.isNaN(item.lng)) {
      const coords: [number, number] = [item.lng, item.lat];
      setCenter(coords);
      reverseGeocodeCenter(coords);
      return;
    }

    setResolvingKey(suggestionKey(item));
    setError(null);
    try {
      const detail = await mapService.placeDetail(item.eLoc);
      const coords: [number, number] = [detail.lng, detail.lat];
      setCenter(coords);
      reverseGeocodeCenter(coords);
    } catch (e: any) {
      console.error('[AddressSearch] Place detail error:', e?.response?.status, e?.response?.data?.message);
      setError('Could not fetch exact location for this place. Try dragging the map instead.');
    } finally {
      setResolvingKey(null);
    }
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    onCancel();
  };

  // Map step → go to details form
  const handleConfirmLocation = () => {
    if (!resolvedCoords || !resolvedAddress) return;
    Keyboard.dismiss();
    setStep('details');
  };

  // Details step → compose and return
  const handleSaveDetails = () => {
    if (!resolvedCoords) return;
    if (!houseNo.trim()) {
      setDetailError('Please enter your house / flat number.');
      return;
    }
    if (!receiverName.trim()) {
      setDetailError('Please enter the receiver name.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(receiverPhone.trim())) {
      setDetailError('Please enter a valid 10-digit receiver mobile number.');
      return;
    }
    const fullAddress = composeFullAddress(houseNo, building, resolvedAddress, landmark, receiverName, receiverPhone);
    const details: AddressDetails = {
      houseNo: houseNo.trim(),
      building: building.trim() || undefined,
      landmark: landmark.trim() || undefined,
      receiverName: receiverName.trim() || undefined,
      receiverPhone: receiverPhone.trim() || undefined,
      label,
      area: resolvedAddress,
      fullAddress,
      coordinates: resolvedCoords,
    };
    onSelect(fullAddress, resolvedCoords, details);
  };

  const showEmpty = query.trim().length >= 2 && !isSearching && suggestions.length === 0;
  const showOverlay = suggestions.length > 0 || !!error || showEmpty;

  // ────────────────────────────── DETAILS STEP ──────────────────────────────
  if (step === 'details') {
    return (
      <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={handleCancel}>
        <StatusBar backgroundColor="#fff" barStyle="dark-content" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => setStep('map')} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <ArrowLeft size={22} color="#1c1c1e" />
            </TouchableOpacity>
            <Text style={styles.detailsTitle}>Add address details</Text>
          </View>

          <ScrollView contentContainerStyle={styles.detailsScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Selected location banner */}
            <View style={styles.locBanner}>
              <View style={styles.locBannerIcon}>
                <MapPin size={18} color="#16a34a" />
              </View>
              <Text style={styles.locBannerText} numberOfLines={2}>{resolvedAddress}</Text>
              <TouchableOpacity onPress={() => setStep('map')} style={styles.locChangeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Pencil size={13} color="#16a34a" />
                <Text style={styles.locChangeText}>Change</Text>
              </TouchableOpacity>
            </View>

            <Field label="House / Flat / Block No." required value={houseNo} onChangeText={setHouseNo} placeholder="e.g. 42, Flat 3B" autoFocus />
            <Field label="Apartment / Building / Society" value={building} onChangeText={setBuilding} placeholder="e.g. Green Valley Apartments" />
            <Field label="Landmark (optional)" value={landmark} onChangeText={setLandmark} placeholder="e.g. near IIT main gate" />
            <Field label="Receiver's name" value={receiverName} onChangeText={setReceiverName} placeholder="Who should the agent ask for?" />
            <Field label="Receiver's phone" value={receiverPhone} onChangeText={(t) => setReceiverPhone(t.replace(/[^0-9]/g, '').slice(0, 10))} placeholder="10-digit mobile number" keyboardType="phone-pad" />

            <Text style={styles.fieldLabel}>Save address as</Text>
            <View style={styles.labelRow}>
              {LABELS.map(({ key, icon: Icon }) => {
                const active = label === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.labelPill, active && styles.labelPillActive]}
                    onPress={() => setLabel(key)}
                    activeOpacity={0.8}
                  >
                    <Icon size={16} color={active ? '#15803d' : '#64748b'} />
                    <Text style={[styles.labelPillText, active && styles.labelPillTextActive]}>{key}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {!!detailError && <Text style={styles.detailErrorText}>{detailError}</Text>}
          </ScrollView>

          <SafeAreaView edges={['bottom']} style={styles.bottomSheet}>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveDetails} activeOpacity={0.85}>
              <Text style={styles.confirmBtnText}>Save address</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // ────────────────────────────── MAP STEP ──────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={handleCancel}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.screen}>
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleCancel} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ArrowLeft size={22} color="#1c1c1e" />
          </TouchableOpacity>
          <View style={styles.searchBox}>
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              value={query}
              onChangeText={(t) => setQuery(t)}
              placeholder="Search area, street, landmark..."
              placeholderTextColor="#9ca3af"
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {isSearching && (
              <ActivityIndicator size="small" color="#16a34a" style={styles.searchSpinner} />
            )}
            {!isSearching && query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); setSuggestions([]); setError(null); }} style={styles.clearBtn}>
                <Text style={styles.clearX}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Map body ── */}
        <View style={styles.mapBody}>
          <MapPicker center={center} onCenterChange={(coords) => { setCenter(coords); reverseGeocodeCenter(coords); }} />

          {!showOverlay && (
            <TouchableOpacity
              style={styles.gpsFab}
              onPress={handleUseCurrentLocation}
              disabled={isLocating}
              activeOpacity={0.8}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color="#16a34a" />
              ) : (
                <Navigation2 size={18} color="#16a34a" />
              )}
            </TouchableOpacity>
          )}

          {showOverlay && (
            <View style={styles.suggestionsOverlay}>
              {suggestions.length > 0 && (
                <FlatList
                  data={suggestions}
                  keyExtractor={(item) => suggestionKey(item)}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  ItemSeparatorComponent={() => <View style={styles.rowSep} />}
                  renderItem={({ item }) => {
                    const isResolving = resolvingKey === suggestionKey(item);
                    return (
                      <TouchableOpacity
                        style={styles.resultRow}
                        onPress={() => handleSelect(item)}
                        activeOpacity={0.6}
                        disabled={resolvingKey !== null}
                      >
                        <View style={styles.resultIconWrap}>
                          {isResolving ? (
                            <ActivityIndicator size="small" color="#16a34a" />
                          ) : (
                            <MapPin size={16} color="#16a34a" />
                          )}
                        </View>
                        <View style={styles.resultText}>
                          <Text style={styles.resultName} numberOfLines={1}>{item.placeName}</Text>
                          {!!item.address && (
                            <Text style={styles.resultAddr} numberOfLines={2}>{item.address}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
              {(error || showEmpty) && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📍</Text>
                  <Text style={styles.emptyText}>{error || 'No results found.'}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Bottom sheet: resolved address + confirm ── */}
        {!showOverlay && (
          <SafeAreaView edges={['bottom']} style={styles.bottomSheet}>
            <View style={styles.addressRow}>
              <MapPin size={18} color="#16a34a" />
              <Text style={styles.addressText} numberOfLines={2}>
                {isGeocoding ? 'Locating address...' : (resolvedAddress || 'Move the map to select a location')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.confirmBtn, (!resolvedCoords || isGeocoding) && styles.confirmBtnDisabled]}
              disabled={!resolvedCoords || isGeocoding}
              onPress={handleConfirmLocation}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnText}>Confirm location</Text>
            </TouchableOpacity>
          </SafeAreaView>
        )}
      </View>
    </Modal>
  );
}

function Field({
  label, value, onChangeText, placeholder, required, autoFocus, keyboardType,
}: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder?: string;
  required?: boolean; autoFocus?: boolean; keyboardType?: any;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>
        {label}{required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        autoFocus={autoFocus}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 50,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { padding: 4 },
  detailsTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a', fontWeight: '500', paddingVertical: 0 },
  searchSpinner: { marginLeft: 8 },
  clearBtn: { padding: 4, marginLeft: 4 },
  clearX: { fontSize: 13, color: '#94a3b8', fontWeight: '700' },

  // Map body
  mapBody: { flex: 1, position: 'relative' },
  gpsFab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  // Suggestions overlay
  suggestionsOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff' },
  rowSep: { height: 1, backgroundColor: '#f8fafc', marginLeft: 70 },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  resultIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  resultText: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  resultAddr: { fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 17 },
  emptyState: { alignItems: 'center', paddingTop: 48, gap: 10 },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', paddingHorizontal: 32 },

  // Bottom sheet
  bottomSheet: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  addressText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a', lineHeight: 20 },
  confirmBtn: { backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  confirmBtnDisabled: { backgroundColor: '#a7d7b8' },
  confirmBtnText: { color: 'white', fontSize: 15, fontWeight: '800' },

  // Details form
  detailsScroll: { padding: 20, paddingBottom: 32, maxWidth: 640, width: '100%', alignSelf: 'center' },
  locBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14, marginBottom: 22,
    borderWidth: 1, borderColor: '#dcfce7',
  },
  locBannerIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  locBannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#166534', lineHeight: 18 },
  locChangeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locChangeText: { fontSize: 12, fontWeight: '800', color: '#16a34a' },

  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 7 },
  required: { color: '#ef4444' },
  fieldInput: {
    backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    fontSize: 15, color: '#0f172a', fontWeight: '500',
  },

  labelRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  labelPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: 'white',
  },
  labelPillActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  labelPillText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  labelPillTextActive: { color: '#15803d' },

  detailErrorText: { color: '#ef4444', fontSize: 13, fontWeight: '600', marginTop: 14 },
});
