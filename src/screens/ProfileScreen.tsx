import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Modal, TextInput, KeyboardAvoidingView, Platform, Animated, ActivityIndicator, useWindowDimensions } from 'react-native';
import { WebFooter } from '../components/shared/WebFooter';
import { showAlert } from '../utils/alert';
import { ChevronLeft, User, MapPin, Flame, HeartHandshake, LogOut, FileText, X, Mail, Phone, ShieldCheck, CheckCircle, CalendarDays, UserSquare2, Heart, Briefcase, Users, ArrowRight, Gift, Trash2, Bell, BellOff, Camera, Pencil } from 'lucide-react-native';
import { useNotifications } from '../context/NotificationContext';
import { openNotificationSettings } from '../utils/notifications';
import { UserAvatar } from '../components/shared/UserAvatar';
import { Avatar } from '../components/shared/Avatar';
import { ThemeToggle } from '../components/shared/ThemeToggle';
import { AvatarPickerModal } from '../components/shared/AvatarPickerModal';
import { getStoredAvatarId, setStoredAvatarId } from '../utils/avatar';
import { addressService, SavedAddress, AddressLabel, AddressInput } from '../services/address';
import { LinearGradient } from 'expo-linear-gradient';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { StateCityFields } from '../components/shared/StateCityFields';
import { profileService } from '../services/profile';
import { streakService } from '../services/streak';
import { AddressSearch, AddressDetails } from '../components/shared/AddressSearch';
import { authService } from '../services/auth';
import * as Location from 'expo-location';
import { useTheme, makeStyles } from '../theme';
import { isDiwaliSeason } from '../utils/festive';
import { DiwaliHeaderDecor, DiwaliGoldBorder, DiwaliBackdrop } from '../components/festive/Diwali';

// Reusable Components
function InputField({ placeholder, value, onChange, keyboardType = 'default', maxLength }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.demoInputContainer}>
      <TextInput
        style={styles.demoInput}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
    </View>
  );
}

function SelectionPills({ options, selected, onSelect }: { options: string[], selected: string, onSelect: (v: string) => void }) {
  const styles = useStyles();
  return (
    <View style={styles.pillsContainer}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.pill, selected === opt && styles.pillActive]}
          onPress={() => onSelect(opt)}
          activeOpacity={0.7}
        >
          <Text style={[styles.pillText, selected === opt && styles.pillTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Social logins (Facebook/Google) provide no phone, so the backend stores a dummy
// number. Anything that isn't a real Indian mobile counts as "not added yet".
// Hidden until the backend ships DELETE /api/v1/users/account (it returns 404 today,
// so the button could only ever fail). Flip to true once it's live — Apple requires
// in-app account deletion before the iOS app can pass review.
const ACCOUNT_DELETION_LIVE = false;

const cleanPhone = (p?: string) => String(p || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
const isRealPhone = (p?: string) => /^[6-9]\d{9}$/.test(cleanPhone(p));

export function ProfileScreen({ navigation }: any) {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const diwali = isDiwaliSeason();
  const { pushEnabled, enablePush } = useNotifications();
  // Main Profile State
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Fetch Profile on Mount
  // Refetch on every focus (not just mount) so a phone verified elsewhere — e.g.
  // during the booking flow's phone-verification modal — is reflected here as soon
  // as the user opens Profile, instead of showing a stale "Add mobile number".
  useFocusEffect(useCallback(() => {
    const fetchProfile = async () => {
      try {
        // Pickup streak from the backend, the same number Home and the wallet show.
        const [data, streakStatus] = await Promise.all([
          profileService.getProfile(),
          streakService.getStatus().catch(() => null),
        ]);
        setUserProfile({
          name: data.name || 'User',
          phone: isRealPhone(data.phone) ? cleanPhone(data.phone) : '',
          email: data.email || '',
          coins: data.karmaCoins || data.coins || 0,
          totalEarned: data.totalCoinsEarned ?? (data.karmaCoins || data.coins || 0),
          streak: streakStatus?.currentStreak ?? 0,
          address: data.address
            ? (typeof data.address === 'object' ? data.address.fullAddress : data.address)
            : '',
          demographics: {
            age: data.demographics?.age || data.age || 25,
            gender: data.demographics?.gender || data.gender || 'Not Specified',
            maritalStatus: data.demographics?.maritalStatus || data.maritalStatus || 'Not Specified',
            employment: data.demographics?.employment || data.employment || 'Not Specified',
            city: data.demographics?.city || data.city || '',
            state: data.demographics?.state || data.state || ''
          }
        });
        setEditForm({
           name: data.name || 'User',
           phone: isRealPhone(data.phone) ? cleanPhone(data.phone) : '',
           email: data.email || '',
        });
        // Prefer the backend avatarId; fall back to the locally-stored pick so it
        // shows even if the backend hasn't persisted it yet.
        const resolvedAvatar = data.avatarId || (await getStoredAvatarId());
        if (resolvedAvatar) {
          setAvatarId(resolvedAvatar);
          if (data.avatarId) setStoredAvatarId(data.avatarId);
        }
      } catch (error) {
        console.error('Failed to load profile', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    fetchProfile();
  }, []));

  // Save the chosen avatar: reflect it instantly, cache locally, and push to the
  // backend (fire-and-forget — the local cache keeps it even if that field isn't
  // wired server-side yet).
  const chooseAvatar = (id: string) => {
    setAvatarId(id);
    setStoredAvatarId(id);
    profileService.updateAvatar(id).catch(() => {});
  };

  // Permanently delete the account (Apple + DPDP requirement). Two-step confirm so
  // it can never be triggered by an accidental tap, then sign out to Login.
  const confirmDeleteAccount = () => {
    showAlert(
      'Delete account?',
      'This permanently deletes your account, KarmaCoins XP balance, streak, and pickup history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: runDeleteAccount },
      ]
    );
  };

  const runDeleteAccount = async () => {
    if (deletingAccount) return;
    setDeletingAccount(true);
    try {
      await profileService.deleteAccount();
      await authService.logout();
      navigation.replace('Login');
      showAlert('Account deleted', 'Your account and data have been removed.');
    } catch (error: any) {
      setDeletingAccount(false);
      showAlert('Could not delete account', error?.response?.data?.message || 'Please try again, or contact support.');
    }
  };

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [flowStep, setFlowStep] = useState<'form' | 'loading' | 'otp' | 'success'>('form');

  // Demographics Modal State
  const [demoModalVisible, setDemoModalVisible] = useState(false);
  const [isDemoEditing, setIsDemoEditing] = useState(false);
  const [demoEditForm, setDemoEditForm] = useState({
    age: '26',
    gender: 'Male',
    maritalStatus: 'Single',
    employment: 'Employed',
    state: '',
    city: ''
  });
  const demoSlideAnim = useRef(new Animated.Value(0)).current;

  const INDIAN_STATES: Record<string, string[]> = {
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati'],
    'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat'],
    'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon'],
    'Bihar': ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Purnia', 'Arrah'],
    'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg'],
    'Delhi': ['New Delhi', 'Delhi'],
    'Goa': ['Panaji', 'Margao', 'Vasco da Gama'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'],
    'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Hisar', 'Karnal'],
    'Himachal Pradesh': ['Shimla', 'Manali', 'Dharamshala', 'Solan'],
    'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar'],
    'Karnataka': ['Bengaluru', 'Mysuru', 'Hubli', 'Mangaluru', 'Belgaum'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam'],
    'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad'],
    'Manipur': ['Imphal', 'Thoubal'],
    'Meghalaya': ['Shillong', 'Tura'],
    'Mizoram': ['Aizawl', 'Lunglei'],
    'Nagaland': ['Kohima', 'Dimapur'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Puri'],
    'Punjab': ['Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner'],
    'Sikkim': ['Gangtok', 'Namchi'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
    'Tripura': ['Agartala', 'Udaipur'],
    'Uttar Pradesh': ['Lucknow', 'Noida', 'Kanpur', 'Agra', 'Varanasi', 'Ghaziabad', 'Meerut', 'Prayagraj'],
    'Uttarakhand': ['Dehradun', 'Haridwar', 'Rishikesh', 'Nainital', 'Roorkee'],
    'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri', 'Asansol'],
  };
  const ALL_STATES = Object.keys(INDIAN_STATES);

  // Address Modal State — declared BEFORE filteredStates/filteredCities to avoid TDZ crash
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addressForm, setAddressForm] = useState({
    flatNo: '', street: '', city: '', state: '', pincode: ''
  });
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressErrors, setAddressErrors] = useState({ flatNo: '', street: '', city: '', state: '', pincode: '' });
  const [addressTouched, setAddressTouched] = useState({ flatNo: false, street: false, city: false, state: false, pincode: false });
  const addressSlideAnim = useRef(new Animated.Value(0)).current;

  const [showStateSuggestions, setShowStateSuggestions] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  // Saved-addresses manager (multi-address backend — Home/Work/Other)
  const [addrMgrVisible, setAddrMgrVisible] = useState(false);
  const [mgrAddresses, setMgrAddresses] = useState<SavedAddress[]>([]);
  const [mgrLoading, setMgrLoading] = useState(false);
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [mgrBusy, setMgrBusy] = useState(false);
  // Delete confirmation renders INSIDE the address-manager modal (as a second
  // layer) so it can never sit behind it — the global showAlert modal did (KV-014).
  const [deleteTarget, setDeleteTarget] = useState<SavedAddress | null>(null);
  const [editTarget, setEditTarget] = useState<SavedAddress | null>(null);
  // Errors show inside the manager card: a root alert would open behind this modal on iOS.
  const [mgrError, setMgrError] = useState('');
  // iOS can't present a modal while another is on screen or still closing, so the
  // manager and the map picker take turns: close one, open the next from onDismiss.
  const nextAddrModal = useRef<'search' | 'mgr' | null>(null);

  const showNextAddrModal = () => {
    const next = nextAddrModal.current;
    nextAddrModal.current = null;
    if (next === 'search') setShowAddressSearch(true);
    else if (next === 'mgr') setAddrMgrVisible(true);
  };

  const switchAddrModal = (next: 'search' | 'mgr') => {
    nextAddrModal.current = next;
    if (next === 'search') setAddrMgrVisible(false);
    else setShowAddressSearch(false);
    if (Platform.OS !== 'ios') showNextAddrModal();
    else setTimeout(() => { if (nextAddrModal.current === next) showNextAddrModal(); }, 1000);
  };

  const openAddrMgr = () => {
    setMgrError('');
    setAddrMgrVisible(true);
    setMgrLoading(true);
    addressService.list()
      .then(setMgrAddresses)
      .catch(() => setMgrError('Could not load your addresses. Please check your connection and try again.'))
      .finally(() => setMgrLoading(false));
  };

  // AddressSearch's own "Add address details" step collects and validates every
  // field — save directly from its result, no second form.
  const handleAddressSelected = async (_address: string, _coords: [number, number], details?: AddressDetails) => {
    switchAddrModal('mgr');
    if (!details || mgrBusy) return;
    if (editTarget) return saveAddressEdit(editTarget, details);
    setMgrBusy(true);
    setMgrError('');
    try {
      const list = await addressService.add({
        label: (details.label as AddressLabel) || 'Home',
        fullAddress: details.area,
        houseNo: details.houseNo,
        apartment: details.building,
        landmark: details.landmark,
        receiverName: details.receiverName || '',
        receiverPhone: details.receiverPhone || '',
        longitude: details.coordinates[0],
        latitude: details.coordinates[1],
      });
      setMgrAddresses(list);
    } catch (e: any) {
      setMgrError(e?.response?.data?.message || 'Could not save the address. Please try again.');
    } finally {
      setMgrBusy(false);
    }
  };

  const startAddAddress = () => {
    setEditTarget(null);
    setMgrError('');
    switchAddrModal('search');
  };

  const startEditAddress = (addr: SavedAddress) => {
    setEditTarget(addr);
    setMgrError('');
    switchAddrModal('search');
  };

  // Sends only what changed. The location (and the area text that comes from it)
  // goes only when the pin was moved; an emptied apartment or landmark goes as "".
  const saveAddressEdit = async (target: SavedAddress, details: AddressDetails) => {
    const changes: Partial<AddressInput> = {};
    const label = (details.label as AddressLabel) || 'Home';
    if (label !== target.label) changes.label = label;
    if (details.houseNo !== target.houseNo) changes.houseNo = details.houseNo;
    if ((details.building || '') !== (target.apartment || '')) changes.apartment = details.building || '';
    if ((details.landmark || '') !== (target.landmark || '')) changes.landmark = details.landmark || '';
    if ((details.receiverName || '') !== (target.receiverName || '')) changes.receiverName = details.receiverName || '';
    if ((details.receiverPhone || '') !== (target.receiverPhone || '')) changes.receiverPhone = details.receiverPhone || '';
    const [lng, lat] = details.coordinates;
    const [oldLng, oldLat] = target.location?.coordinates || [NaN, NaN];
    if (!(Math.abs(lng - oldLng) < 1e-5 && Math.abs(lat - oldLat) < 1e-5)) {
      changes.longitude = lng;
      changes.latitude = lat;
      if (details.area && details.area !== target.fullAddress) changes.fullAddress = details.area;
    }
    if (Object.keys(changes).length === 0) return;
    setMgrBusy(true);
    setMgrError('');
    try {
      setMgrAddresses(await addressService.update(target._id, changes));
    } catch (e: any) {
      if (e?.response?.status === 404) {
        setMgrError('This address was removed, maybe from another device. Your list is now up to date.');
        addressService.list().then(setMgrAddresses).catch(() => {});
      } else {
        setMgrError(!e?.response
          ? 'No internet connection. Please try again.'
          : (e.response.data?.message || 'Could not save the changes. Please try again.'));
      }
    } finally {
      setMgrBusy(false);
    }
  };

  const deleteAddress = (addr: SavedAddress) => setDeleteTarget(addr);

  const confirmDeleteAddress = async () => {
    const target = deleteTarget;
    if (!target) return;
    setDeleteTarget(null);
    setMgrError('');
    try {
      setMgrAddresses(await addressService.remove(target._id));
    } catch {
      setMgrError('Could not delete the address. Please try again.');
    }
  };

  const makeDefault = async (addr: SavedAddress) => {
    if (addr.isDefault) return;
    setMgrError('');
    try {
      setMgrAddresses(await addressService.setDefault(addr._id));
    } catch {
      setMgrError('Could not change the default address. Please try again.');
    }
  };

  const filteredStates = addressForm.state
    ? ALL_STATES.filter(s => s.toLowerCase().includes(addressForm.state.toLowerCase()))
    : ALL_STATES;

  const citiesForState = INDIAN_STATES[addressForm.state] || [];
  const filteredCities = addressForm.city
    ? citiesForState.filter(c => c.toLowerCase().includes(addressForm.city.toLowerCase()))
    : citiesForState;

  const validateAddressField = (field: string, value: string): string => {
    if (!value.trim()) {
      const labels: any = { flatNo: 'House/Flat No.', street: 'Street', city: 'City', state: 'State', pincode: 'Pincode' };
      return `${labels[field]} is required`;
    }
    if ((field === 'city' || field === 'state') && /[^a-zA-Z\s]/.test(value.trim()))
      return `${field === 'city' ? 'City' : 'State'} should contain only letters`;
    if ((field === 'flatNo' || field === 'street') && /[^a-zA-Z0-9\s\-\/,\.]/.test(value.trim()))
      return 'Special characters like @#$% are not allowed';
    if (field === 'pincode' && !/^\d{6}$/.test(value.trim()))
      return 'Pincode must be exactly 6 digits';
    return '';
  };

  const handleAddressChange = (field: string, value: string) => {
    setAddressForm(f => ({ ...f, [field]: value }));
    setAddressErrors(e => ({ ...e, [field]: validateAddressField(field, value) }));
  };

  const handleAddressBlur = (field: string) => {
    setAddressTouched(t => ({ ...t, [field]: true }));
    setAddressErrors(e => ({ ...e, [field]: validateAddressField(field, addressForm[field as keyof typeof addressForm]) }));
  };

  const openAddressModal = () => {
    setAddressForm({ flatNo: '', street: '', city: '', state: '', pincode: '' });
    setAddressErrors({ flatNo: '', street: '', city: '', state: '', pincode: '' });
    setAddressTouched({ flatNo: false, street: false, city: false, state: false, pincode: false });
    setAddressModalVisible(true);
    Animated.spring(addressSlideAnim, { toValue: 1, useNativeDriver: false, bounciness: 4 }).start();
  };

  const closeAddressModal = () => {
    Animated.timing(addressSlideAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start(() => setAddressModalVisible(false));
  };

  const handleSaveAddress = async () => {
    const { flatNo, street, city, state, pincode } = addressForm;
    const newErrors = {
      flatNo: validateAddressField('flatNo', flatNo),
      street: validateAddressField('street', street),
      city: validateAddressField('city', city),
      state: validateAddressField('state', state),
      pincode: validateAddressField('pincode', pincode),
    };
    setAddressErrors(newErrors);
    setAddressTouched({ flatNo: true, street: true, city: true, state: true, pincode: true });
    if (Object.values(newErrors).some(e => e)) return;
    const fullAddress = [flatNo.trim(), street.trim(), city.trim(), state.trim(), pincode.trim()]
      .filter(Boolean).join(', ');

    setIsSavingAddress(true);
    try {
      let longitude: number | undefined;
      let latitude: number | undefined;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          longitude = loc.coords.longitude;
          latitude = loc.coords.latitude;
        }
      } catch (_) {}

      await profileService.updateAddress({ fullAddress, longitude, latitude });
      setUserProfile({ ...userProfile, address: fullAddress });
      closeAddressModal();
    } catch (e) {
      showAlert('Error', 'Failed to update address. Please try again.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Personal details: show missing State / City under the fields once the user has
  // changed them, and keep Update & Save disabled until the form is complete.
  const [demoTouched, setDemoTouched] = useState(false);
  const [demoError, setDemoError] = useState('');
  const [demoSaving, setDemoSaving] = useState(false);
  const demoAge = parseInt(demoEditForm.age);
  const demoComplete = !!demoEditForm.age && !isNaN(demoAge) && demoAge >= 13 && demoAge <= 100
    && !!demoEditForm.state?.trim() && !!demoEditForm.city?.trim();

  const openDemoModal = () => {
    setDemoEditForm({
      age: userProfile?.demographics?.age?.toString() || '25',
      gender: userProfile?.demographics?.gender || 'Not Specified',
      maritalStatus: userProfile?.demographics?.maritalStatus || 'Not Specified',
      employment: userProfile?.demographics?.employment || 'Not Specified',
      state: userProfile?.demographics?.state || userProfile?.state || '',
      city: userProfile?.demographics?.city || userProfile?.city || ''
    });
    setIsDemoEditing(false);
    setDemoTouched(false);
    setDemoError('');
    setDemoModalVisible(true);
  };
  
  // temporary edit form state
  const [editForm, setEditForm] = useState<any>({});

  // Animation utility for modal slide up
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (modalVisible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: false,
        bounciness: 4,
      }).start();
    } else {
      slideAnim.setValue(0);
      setTimeout(() => {
        setFlowStep('form');
      }, 300);
    }
  }, [modalVisible]);

  // Back (browser/hardware) with a modal open should close the modal, not pop
  // the screen — otherwise the screen pops while the modal's portal lingers,
  // leaving "Edit details" floating over the dashboard.
  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e: any) => {
      // Browser back arrives as RESET_ROOT (react-navigation web linking), not
      // POP/GO_BACK — so while a modal is open, intercept every removal.
      if (modalVisible) {
        e.preventDefault();
        closeModal();
      } else if (demoModalVisible) {
        e.preventDefault();
        closeDemoModal();
      } else if (addressModalVisible) {
        e.preventDefault();
        closeAddressModal();
      } else if (addrMgrVisible) {
        e.preventDefault();
        setAddrMgrVisible(false);
      }
    });
    return sub;
  }, [navigation, modalVisible, demoModalVisible, addressModalVisible, addrMgrVisible]);

  // Safety net: if the screen is actually left while a modal is open (any path
  // that slips past beforeRemove), kill the modals instantly so their portal
  // can never linger over the next screen.
  useEffect(() => {
    const sub = navigation.addListener('blur', () => {
      setModalVisible(false);
      setDemoModalVisible(false);
      setAddressModalVisible(false);
      nextAddrModal.current = null;
      setAddrMgrVisible(false);
      setShowAddressSearch(false);
    });
    return sub;
  }, [navigation]);

  const openEditModal = () => {
    setEditForm({ ...userProfile });
    setEditError('');
    setFlowStep('form');
    setModalVisible(true);
  };

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => setModalVisible(false));
  };

  useEffect(() => {
    if (demoModalVisible) {
      Animated.spring(demoSlideAnim, {
        toValue: 1,
        useNativeDriver: false,
        bounciness: 4,
      }).start();
    } else {
      demoSlideAnim.setValue(0);
    }
  }, [demoModalVisible]);

  const closeDemoModal = () => {
    Animated.timing(demoSlideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => setDemoModalVisible(false));
  };

  // On web, the browser/hardware back button pops the navigator's history entry
  // directly — it doesn't know about these local modal flags, so it would leave
  // the modal floating over whatever screen it lands on. Intercept back while any
  // modal is open and close the modal instead of leaving the screen.
  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e: any) => {
      if (!modalVisible && !addressModalVisible && !demoModalVisible) return;
      e.preventDefault();
      if (modalVisible) closeModal();
      if (addressModalVisible) closeAddressModal();
      if (demoModalVisible) closeDemoModal();
    });
    return sub;
  }, [navigation, modalVisible, addressModalVisible, demoModalVisible]);

  const [profileOtp, setProfileOtp] = useState(['', '', '', '', '', '']);
  const profileOtpRefs = useRef<Array<any>>([]);
  // Which field the current OTP round is verifying — email OTP goes to the current phone,
  // phone OTP goes to the new phone, so they can't share a single round-trip.
  const [otpStage, setOtpStage] = useState<'email' | 'phone' | null>(null);
  // Errors show inside the sheet: an alert opened over the sheet lands behind it on
  // iOS, so the user never sees it and the screen stops responding.
  const [editError, setEditError] = useState('');
  const otpGreen = isDark ? colors.primary : '#15803d';
  const [loadingLabel, setLoadingLabel] = useState('Saving details...');
  const serverMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || error?.response?.data?.error || fallback;
  const showOtpError = (message: string) => {
    setEditError(message);
    setProfileOtp(['', '', '', '', '', '']);
    setFlowStep('otp');
    setTimeout(() => profileOtpRefs.current[0]?.focus(), 50);
  };

  const emailChanged = editForm.email && editForm.email !== userProfile?.email;
  const phoneChanged = editForm.phone && editForm.phone !== userProfile?.phone;

  const startEmailOtp = async () => {
    setEditError('');
    setLoadingLabel('Sending OTP...');
    setFlowStep('loading');
    try {
      await authService.sendOtp(userProfile?.phone, 'change-email');
      setOtpStage('email');
      setProfileOtp(['', '', '', '', '', '']);
      setFlowStep('otp');
    } catch (error: any) {
      setEditError(serverMessage(error, 'Could not send the OTP. Please try again.'));
      setFlowStep('form');
    }
  };

  const startPhoneOtp = async () => {
    setEditError('');
    setLoadingLabel('Sending OTP...');
    setFlowStep('loading');
    try {
      await authService.sendOtp(editForm.phone, 'change-phone');
      setOtpStage('phone');
      setProfileOtp(['', '', '', '', '', '']);
      setFlowStep('otp');
    } catch (error: any) {
      setEditError(serverMessage(error, 'Could not send the OTP. Please try again.'));
      setFlowStep('form');
    }
  };

  const handleSaveProfile = async () => {
    if (!editForm.name || !editForm.email || !editForm.phone) return;

    // Validate a changed phone up front so we never fire an OTP to a malformed
    // number — must be a 10-digit Indian mobile.
    if (phoneChanged && !/^[6-9]\d{9}$/.test(editForm.phone.trim())) {
      setEditError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (emailChanged && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
      setEditError('Please enter a valid email address.');
      return;
    }

    if (emailChanged) {
      await startEmailOtp();
    } else if (phoneChanged) {
      await startPhoneOtp();
    } else {
      await saveProfileDirect();
    }
  };

  const refreshProfile = async () => {
    try {
      const data = await profileService.getProfile();
      setUserProfile((prev: any) => ({
        ...prev,
        name: data.name || prev?.name,
        phone: isRealPhone(data.phone) ? cleanPhone(data.phone) : prev?.phone,
        email: data.email || prev?.email,
        coins: data.karmaCoins || data.coins || prev?.coins,
      }));
    } catch (_) {}
  };

  const saveProfileDirect = async () => {
    setEditError('');
    setLoadingLabel('Saving details...');
    setFlowStep('loading');
    try {
      if (editForm.name !== userProfile?.name) {
        await profileService.updateName({ name: editForm.name });
      }
      await refreshProfile();
      setFlowStep('success');
      setTimeout(() => closeModal(), 2000);
    } catch (error: any) {
      setEditError(serverMessage(error, 'Could not update your profile. Please try again.'));
      setFlowStep('form');
    }
  };

  const handleProfileOtpVerify = async () => {
    const otp = profileOtp.join('');
    if (otp.length < 6) {
      setEditError('Please enter the 6-digit OTP.');
      return;
    }
    setEditError('');
    setLoadingLabel('Verifying OTP...');
    setFlowStep('loading');
    try {
      if (otpStage === 'email') {
        const verifyRes = await authService.verifyOtp(userProfile?.phone, otp, 'change-email');
        const otpToken = verifyRes?.data?.otpToken;
        await profileService.changeEmail(editForm.email, otpToken);

        if (phoneChanged) {
          // Email done — now run the phone OTP round (sent to the new phone).
          await startPhoneOtp();
          return;
        }
      } else if (otpStage === 'phone') {
        const verifyRes = await authService.verifyOtp(editForm.phone, otp, 'change-phone');
        const otpToken = verifyRes?.data?.otpToken;
        await profileService.changePhone(editForm.phone, otpToken);
      }

      if (editForm.name !== userProfile?.name) {
        await profileService.updateName({ name: editForm.name });
      }
      setOtpStage(null);
      await refreshProfile();
      setFlowStep('success');
      setTimeout(() => closeModal(), 2000);
    } catch (error: any) {
      showOtpError(serverMessage(error, 'Incorrect or expired OTP. Please try again.'));
    }
  };

  const handleProfileOtpChange = (text: string, index: number) => {
    if (editError) setEditError('');
    const newOtp = [...profileOtp];
    newOtp[index] = text.replace(/[^0-9]/g, '');
    setProfileOtp(newOtp);
    if (text && index < 5) profileOtpRefs.current[index + 1]?.focus();
  };

  const handleProfileOtpKey = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !profileOtp[index] && index > 0) {
      profileOtpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {diwali && <DiwaliBackdrop dark={isDark} />}
      <StatusBar barStyle="light-content" />

        <ScrollView style={diwali && { backgroundColor: 'transparent' }} contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 0 : 100 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#052e16', '#166534', '#15803d']} style={[styles.backgroundGradient, diwali && { overflow: 'hidden' }]}>
        {diwali && <DiwaliHeaderDecor wide={width >= 768} />}
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('App')}>
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My profile</Text>
          <View style={styles.placeholderBox} />
        </View>
        </LinearGradient>

        <View style={styles.scrollContent}>
          {/* Loading State */}
          {isLoadingProfile ? (
             <View style={{ padding: 40, alignItems: 'center' }}>
               <ActivityIndicator size="large" color="#16a34a" />
               <Text style={{ marginTop: 10, color: colors.textMuted }}>Loading Profile...</Text>
             </View>
          ) : !userProfile ? (
             <View style={{ padding: 40, alignItems: 'center', gap: 16 }}>
               <Text style={{ color: '#ef4444', fontWeight: '600', fontSize: 15 }}>Failed to load profile.</Text>
               <Text style={{ color: colors.textFaint, fontSize: 13, textAlign: 'center' }}>Check your internet connection and try again.</Text>
               <TouchableOpacity
                 style={{ backgroundColor: '#16a34a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
                 onPress={() => { setIsLoadingProfile(true); profileService.getProfile().then(data => { setUserProfile({ name: data.name || 'User', phone: isRealPhone(data.phone) ? cleanPhone(data.phone) : '', email: data.email || '', coins: data.karmaCoins || data.coins || 0, address: data.address ? (typeof data.address === 'object' ? data.address.fullAddress : data.address) : '', demographics: { age: data.demographics?.age || data.age || 25, gender: data.demographics?.gender || data.gender || 'Not Specified', maritalStatus: data.demographics?.maritalStatus || 'Not Specified', employment: data.demographics?.employment || 'Not Specified' } }); }).catch(() => {}).finally(() => setIsLoadingProfile(false)); }}
               >
                 <Text style={{ color: 'white', fontWeight: '800' }}>Retry</Text>
               </TouchableOpacity>
               {/* Logout even when profile fails */}
               <TouchableOpacity
                 style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', backgroundColor: colors.surface }}
                 onPress={async () => { await authService.logout(); navigation.replace('Login'); }}
               >
                 <LogOut size={18} color="#ef4444" />
                 <Text style={{ color: '#ef4444', fontWeight: '800' }}>Log out</Text>
               </TouchableOpacity>
             </View>
          ) : (
            <>
              {/* Avatar & Basic Info Card */}
              <View style={styles.profileInfoCard}>
                {diwali && <DiwaliGoldBorder />}
                <TouchableOpacity style={styles.avatarMain} onPress={() => setAvatarPickerVisible(true)} activeOpacity={0.85}>
                  {avatarId ? (
                    <Avatar avatarId={avatarId} size={66} />
                  ) : (
                    <UserAvatar gender={userProfile?.demographics?.gender} size={66} />
                  )}
                  <View style={styles.avatarEditBadge}>
                    <Camera size={13} color="#ffffff" />
                  </View>
                </TouchableOpacity>
                
                <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                  {userProfile?.name}
                </Text>
                {userProfile?.phone ? (
                  <Text style={styles.userPhone}>+91 {userProfile.phone}</Text>
                ) : (
                  <TouchableOpacity onPress={openEditModal} activeOpacity={0.7}>
                    <Text style={styles.addPhoneLink}>+ Add mobile number</Text>
                  </TouchableOpacity>
                )}
                {userProfile?.email ? <Text style={styles.userEmail}>{userProfile.email}</Text> : null}

                {/* Mini Stats Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statPill}>
                    <Flame size={14} color="#fb923c" />
                    <Text style={styles.statText}>{userProfile?.streak || 0} day pickup streak</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statPill}>
                    <KarmaCoin size={14} />
                    <Text style={styles.statText}>{(userProfile?.totalEarned || 0).toLocaleString()} earned</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.editBtn} onPress={openEditModal} activeOpacity={0.7}>
                  <Text style={styles.editBtnText}>Edit profile</Text>
                </TouchableOpacity>
              </View>

              {/* Referral Banner */}
              <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Referral')} style={styles.referBanner}>
                <LinearGradient colors={['#134e4a', '#0f766e', '#0d9488']} style={styles.referBannerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <View style={styles.referBannerLeft}>
                    <View style={styles.referBannerIconBox}>
                      <Users size={22} color="#2dd4bf" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.referBannerTitle}>Invite friends, earn coins</Text>
                      <Text style={styles.referBannerSub}>Share your code & both get rewards!</Text>
                    </View>
                  </View>
                  <View style={styles.referBannerArrow}>
                    <ArrowRight size={18} color="white" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Account Options */}
              <Text style={styles.sectionTitle}>My account</Text>
              <View style={styles.optionsBlock}>
                <OptionRow onPress={openDemoModal} icon={<UserSquare2 size={18} color="#8b5cf6" />} bg="#f3e8ff" title="Personal details" sub="Age, gender, marital status..." />
                <View style={styles.divider} />
                <OptionRow icon={<MapPin size={18} color="#0284c7" />} bg="#f0f9ff" title="Saved addresses" sub="Manage home, work & other locations" onPress={openAddrMgr} />
                <View style={styles.divider} />
                <OptionRow
                  icon={<Flame size={18} color="#ea580c" />}
                  bg="#fff7ed"
                  title="Family impact tracker"
                  sub="LPG, fuel & diet metrics"
                  onPress={() => showAlert('Coming soon!', "We're building your Family Impact Tracker — check back soon.")}
                />
                <View style={styles.divider} />
                <OptionRow icon={<Users size={18} color="#16a34a" />} bg="#f0fdf4" title="My network" sub="Referrals & downstream impact" onPress={() => navigation.navigate('Referral')} />
              </View>

              {/* Appearance */}
              <Text style={styles.sectionTitle}>Appearance</Text>
              <View style={{ marginBottom: 20 }}>
                <ThemeToggle />
              </View>

              {/* General Options */}
              <Text style={styles.sectionTitle}>General</Text>
              <View style={styles.optionsBlock}>
                {Platform.OS !== 'web' && (
                  <>
                    <OptionRow
                      icon={pushEnabled === false ? <BellOff size={18} color="#b45309" /> : <Bell size={18} color="#16a34a" />}
                      bg={pushEnabled === false ? '#fffbeb' : '#f0fdf4'}
                      title="Notifications"
                      sub={pushEnabled === true ? 'On' : pushEnabled === false ? 'Off — tap to turn on' : 'Manage in settings'}
                      onPress={() => (pushEnabled === false ? enablePush() : openNotificationSettings())}
                    />
                    <View style={styles.divider} />
                  </>
                )}
                <OptionRow
                  icon={<HeartHandshake size={18} color={colors.textMuted} />}
                  bg={colors.surfaceAlt}
                  title="Help & support"
                  onPress={() => showAlert(
                    'Help & support',
                    'Reach out to us anytime:\n\nEmail: cto.team@0waste.co.in\nAddress: Plot 62, Sector 8, IMT Manesar, Gurugram, Haryana 122051'
                  )}
                />
                <View style={styles.divider} />
                <OptionRow icon={<FileText size={18} color={colors.textMuted} />} bg={colors.surfaceAlt} title="Terms & conditions" onPress={() => navigation.navigate('Legal', { type: 'terms' })} />
                <View style={styles.divider} />
                <OptionRow icon={<FileText size={18} color={colors.textMuted} />} bg={colors.surfaceAlt} title="Terms of use" onPress={() => navigation.navigate('Legal', { type: 'terms-of-use' })} />
                <View style={styles.divider} />
                <OptionRow icon={<ShieldCheck size={18} color={colors.textMuted} />} bg={colors.surfaceAlt} title="Privacy policy" onPress={() => navigation.navigate('Legal', { type: 'privacy' })} />
              </View>

              {/* Logout */}
              <TouchableOpacity style={styles.logoutBtn} onPress={async () => {
                await authService.logout();
                navigation.replace('Login');
              }}>
                <LogOut size={18} color="#ef4444" />
                <Text style={styles.logoutText}>Log out</Text>
              </TouchableOpacity>

              {/* Delete account — permanent, required by Apple / DPDP */}
              {ACCOUNT_DELETION_LIVE && (
                <TouchableOpacity
                  style={styles.deleteAccountBtn}
                  onPress={confirmDeleteAccount}
                  disabled={deletingAccount}
                  activeOpacity={0.7}
                >
                  {deletingAccount ? (
                    <ActivityIndicator size="small" color={colors.textFaint} />
                  ) : (
                    <>
                      <Trash2 size={16} color={colors.textFaint} />
                      <Text style={styles.deleteAccountText}>Delete account</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
        {Platform.OS === 'web' && <WebFooter />}
        </ScrollView>

      {/* Avatar picker */}
      <AvatarPickerModal
        visible={avatarPickerVisible}
        currentId={avatarId}
        onSelect={chooseAvatar}
        onClose={() => setAvatarPickerVisible(false)}
      />

      {/* Demographics View Modal */}
      <Modal visible={demoModalVisible} transparent={true} animationType="fade" onRequestClose={closeDemoModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdropCloseArea} onPress={closeDemoModal} activeOpacity={1} />
          <Animated.View style={[
            styles.modalContent,
            { transform: [{ translateY: demoSlideAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }]}
          ]}>
            <View style={[styles.modalHeader, { borderBottomWidth: 0, paddingBottom: 10 }]}>
              <Text style={styles.modalTitle}>Personal details</Text>
              <TouchableOpacity onPress={closeDemoModal} style={styles.closeBtn}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
            >
              <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 24, lineHeight: 20 }}>
                These are the details you submitted during registration. They help us tailor eco-rewards directly for you.
              </Text>

              {!isDemoEditing ? (
                <View style={{ gap: 16 }}>
                  <View style={styles.demoListRow}>
                    <View style={[styles.demoListIconBg, { backgroundColor: '#f0fdf4' }]}><CalendarDays size={20} color="#16a34a" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.demoListLabel}>Age</Text>
                      <Text style={styles.demoListValue}>{userProfile?.demographics?.age || '--'} Years Old</Text>
                    </View>
                  </View>
                  
                  <View style={styles.demoListRow}>
                    <View style={[styles.demoListIconBg, { backgroundColor: '#f0f9ff' }]}><UserSquare2 size={20} color="#0284c7" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.demoListLabel}>Identity</Text>
                      <Text style={styles.demoListValue}>{userProfile?.demographics?.gender || '--'}</Text>
                    </View>
                  </View>

                  <View style={styles.demoListRow}>
                    <View style={[styles.demoListIconBg, { backgroundColor: '#fff1f2' }]}><Heart size={20} color="#e11d48" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.demoListLabel}>Marital Status</Text>
                      <Text style={styles.demoListValue}>{userProfile?.demographics?.maritalStatus || '--'}</Text>
                    </View>
                  </View>

                  <View style={styles.demoListRow}>
                    <View style={[styles.demoListIconBg, { backgroundColor: '#fffbeb' }]}><Briefcase size={20} color="#d97706" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.demoListLabel}>Employment</Text>
                      <Text style={styles.demoListValue}>{userProfile?.demographics?.employment || '--'}</Text>
                    </View>
                  </View>

                  <View style={styles.demoListRow}>
                    <View style={[styles.demoListIconBg, { backgroundColor: '#f0fdf4' }]}><MapPin size={20} color="#16a34a" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.demoListLabel}>Location</Text>
                      <Text style={styles.demoListValue}>{[userProfile?.demographics?.city || userProfile?.city, userProfile?.demographics?.state || userProfile?.state].filter(Boolean).join(', ') || '--'}</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.editBtnOutline} onPress={() => { setDemoError(''); setIsDemoEditing(true); }}>
                    <Text style={styles.editBtnOutlineText}>Modify Details</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 20 }}>
                  <View>
                    <Text style={styles.fieldLabel}>Your Age</Text>
                    <InputField placeholder="e.g. 24" value={demoEditForm.age} onChange={(t: any) => setDemoEditForm({...demoEditForm, age: t.replace(/[^0-9]/g, '')})} keyboardType="number-pad" maxLength={3} />
                    {demoEditForm.age && (parseInt(demoEditForm.age) < 13 || parseInt(demoEditForm.age) > 100) && (
                      <Text style={styles.fieldError}>Age must be between 13 and 100</Text>
                    )}
                  </View>
                  <View>
                    <Text style={styles.fieldLabel}>Identity (Gender)</Text>
                    <SelectionPills options={['Male', 'Female', 'Other']} selected={demoEditForm.gender} onSelect={(t) => setDemoEditForm({...demoEditForm, gender: t})} />
                  </View>
                  <View>
                    <Text style={styles.fieldLabel}>Marital Status</Text>
                    <SelectionPills options={['Single', 'Married']} selected={demoEditForm.maritalStatus} onSelect={(t) => setDemoEditForm({...demoEditForm, maritalStatus: t})} />
                  </View>
                  <View>
                    <Text style={styles.fieldLabel}>Employment</Text>
                    <SelectionPills options={['Student', 'Employed', 'Business', 'Unemployed']} selected={demoEditForm.employment} onSelect={(t) => setDemoEditForm({...demoEditForm, employment: t})} />
                  </View>
                  <StateCityFields
                    state={demoEditForm.state}
                    city={demoEditForm.city}
                    setState={(v) => { setDemoTouched(true); setDemoEditForm(f => ({ ...f, state: v })); }}
                    setCity={(v) => { setDemoTouched(true); setDemoEditForm(f => ({ ...f, city: v })); }}
                    showErrors={demoTouched}
                  />
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { marginTop: 12 }, (!demoComplete || demoSaving) && styles.primaryActionBtnDisabled]}
                    disabled={!demoComplete || demoSaving}
                    onPress={async () => {
                      // Errors show inline: a pop-up from inside this sheet opens behind
                      // it on iOS and freezes the screen.
                      setDemoTouched(true);
                      if (!demoComplete || demoSaving) return;
                      const parsedAge = demoAge;
                      setDemoError('');
                      setDemoSaving(true);
                      try {
                        const payload: any = { ...demoEditForm, age: parsedAge, state: demoEditForm.state.trim(), city: demoEditForm.city.trim() };
                        for (const k of ['gender', 'maritalStatus', 'employment']) if (payload[k] === 'Not Specified') delete payload[k];
                        await profileService.updateDemographics(payload);
                        setUserProfile({...userProfile, demographics: { ...demoEditForm, age: parsedAge }});
                        setIsDemoEditing(false);
                      } catch (e: any) {
                        setDemoError(!e?.response
                          ? 'No internet connection. Please try again.'
                          : (e.response.data?.message || 'Could not save your details. Please try again.'));
                      } finally {
                        setDemoSaving(false);
                      }
                  }}>
                    {demoSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryActionText}>Update & save</Text>}
                  </TouchableOpacity>
                  {!!demoError && <Text style={[styles.fieldError, { textAlign: 'center', marginTop: -8 }]}>{demoError}</Text>}
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modern Bottom Sheet Modal for Editing Profile (Zomato Style) */}
      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdropCloseArea} onPress={closeModal} activeOpacity={1} />
          
          <Animated.View style={[
            styles.modalContent, 
            { transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }]}
          ]}>
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {flowStep === 'form' || flowStep === 'loading' ? 'Edit details' : flowStep === 'otp' ? 'Secure verification' : ''}
              </Text>
              {flowStep !== 'success' && flowStep !== 'loading' && (
                <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Step 1: Form */}
            {flowStep === 'form' && (
              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <User size={18} color={colors.textFaint} style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input} 
                      value={editForm.name} 
                      onChangeText={(t) => setEditForm({...editForm, name: t})}
                      placeholderTextColor={colors.textFaint}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mobile Number</Text>
                  <View style={styles.inputWrapper}>
                    <Phone size={18} color={colors.textFaint} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={editForm.phone}
                      onChangeText={(t) => setEditForm({...editForm, phone: t.replace(/[^0-9]/g, '')})}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Mail size={18} color={colors.textFaint} style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input} 
                      value={editForm.email} 
                      onChangeText={(t) => setEditForm({...editForm, email: t})}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {!!editError && <Text style={[styles.fieldError, { textAlign: 'center', marginBottom: 10 }]}>{editError}</Text>}
                <TouchableOpacity 
                  style={[styles.primaryActionBtn, (!editForm.name || !editForm.email || !editForm.phone) && styles.primaryActionBtnDisabled]} 
                  onPress={handleSaveProfile}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryActionText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Loading Step */}
            {flowStep === 'loading' && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#16a34a" />
                <Text style={styles.loadingText}>{loadingLabel}</Text>
              </View>
            )}

            {/* Step: OTP Verification */}
            {flowStep === 'otp' && (
              <View style={{ alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 }}>
                <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: isDark ? colors.border : '#bbf7d0' }}>
                  <ShieldCheck size={24} color={otpGreen} />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: 6, textAlign: 'center' }}>Secure verification</Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '500', marginBottom: 4, textAlign: 'center' }}>
                  {otpStage === 'phone' ? 'OTP sent to your new mobile number' : 'OTP sent to your registered mobile number'}
                </Text>
                <Text style={{ fontSize: 14, color: otpGreen, fontWeight: '800', marginBottom: 24, textAlign: 'center' }}>
                  +91 {otpStage === 'phone' ? editForm.phone : userProfile?.phone}
                </Text>

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: editError ? 10 : 24, justifyContent: 'center' }}>
                  {profileOtp.map((digit: string, i: number) => (
                    <TextInput
                      key={i}
                      ref={(ref: any) => { profileOtpRefs.current[i] = ref; }}
                      style={{
                        width: 44, height: 52, borderRadius: 12, borderWidth: 2,
                        borderColor: editError ? '#ef4444' : digit ? otpGreen : colors.border,
                        backgroundColor: digit ? colors.primarySoft : colors.inputBg,
                        textAlign: 'center', fontSize: 20, fontWeight: '900', color: colors.text,
      }}
                      value={digit}
                      onChangeText={(t: string) => handleProfileOtpChange(t, i)}
                      onKeyPress={(e: any) => handleProfileOtpKey(e, i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      autoFocus={i === 0}
                    />
                  ))}
                </View>

                {!!editError && <Text style={[styles.fieldError, { textAlign: 'center', marginBottom: 16 }]}>{editError}</Text>}
                <TouchableOpacity
                  style={{ backgroundColor: profileOtp.join('').length < 6 ? '#94a3b8' : '#15803d', borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 12 }}
                  onPress={handleProfileOtpVerify}
                  disabled={profileOtp.join('').length < 6}
                >
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 15 }}>Verify & save</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { setEditError(''); setFlowStep('form'); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <ChevronLeft size={15} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontWeight: '600', fontSize: 13 }}>Back to edit</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 3: Success Animation */}
            {flowStep === 'success' && (
              <View style={styles.successContainer}>
                <CheckCircle size={60} color="#16a34a" />
                <Text style={styles.successTitle}>Verified!</Text>
                <Text style={styles.successSub}>Your profile details have been successfully updated.</Text>
              </View>
            )}

          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Address Edit Modal */}
      <Modal visible={addressModalVisible} transparent={true} animationType="fade" onRequestClose={closeAddressModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdropCloseArea} onPress={closeAddressModal} activeOpacity={1} />
          <Animated.View style={[
            styles.modalContent,
            { transform: [{ translateY: addressSlideAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }]}
          ]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Address</Text>
              <TouchableOpacity onPress={closeAddressModal} style={styles.closeBtn}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ paddingHorizontal: 24 }} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16, lineHeight: 18 }}>
                This address will be used as your default pickup location.
              </Text>

              <Text style={styles.fieldLabel}>House / Flat No. *</Text>
              <View style={[styles.demoInputContainer, !!addressErrors.flatNo && styles.inputError]}>
                <TextInput
                  style={styles.demoInput}
                  placeholder="e.g. 42, Block B"
                  placeholderTextColor={colors.textFaint}
                  value={addressForm.flatNo}
                  onChangeText={(t) => handleAddressChange('flatNo', t.replace(/[^a-zA-Z0-9\s\-\/,\.]/g, ''))}
                  onBlur={() => handleAddressBlur('flatNo')}
                />
              </View>
              {!!addressErrors.flatNo && <Text style={styles.fieldError}>{addressErrors.flatNo}</Text>}

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Street / Area / Colony *</Text>
              <View style={[styles.demoInputContainer, !!addressErrors.street && styles.inputError]}>
                <TextInput
                  style={styles.demoInput}
                  placeholder="e.g. Green Park Colony, Sector 14"
                  placeholderTextColor={colors.textFaint}
                  value={addressForm.street}
                  onChangeText={(t) => handleAddressChange('street', t.replace(/[^a-zA-Z0-9\s\-\/,\.]/g, ''))}
                  onBlur={() => handleAddressBlur('street')}
                />
              </View>
              {!!addressErrors.street && <Text style={styles.fieldError}>{addressErrors.street}</Text>}

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
                <View style={{ flex: 1, zIndex: 20 }}>
                  <Text style={styles.fieldLabel}>State *</Text>
                  <View style={[styles.demoInputContainer, !!addressErrors.state && styles.inputError]}>
                    <TextInput
                      style={styles.demoInput}
                      placeholder="Type state name"
                      placeholderTextColor={colors.textFaint}
                      value={addressForm.state}
                      onChangeText={(t) => { handleAddressChange('state', t.replace(/[^a-zA-Z\s]/g, '')); setShowStateSuggestions(true); handleAddressChange('city', ''); }}
                      onFocus={() => setShowStateSuggestions(true)}
                      onBlur={() => { setTimeout(() => setShowStateSuggestions(false), 200); handleAddressBlur('state'); }}
                    />
                  </View>
                  {showStateSuggestions && filteredStates.length > 0 && (
                    <ScrollView style={styles.suggestionsBox} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {filteredStates.slice(0, 6).map(s => (
                        <TouchableOpacity key={s} style={styles.suggestionItem} onPress={() => { handleAddressChange('state', s); setShowStateSuggestions(false); }}>
                          <Text style={styles.suggestionText}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  {!!addressErrors.state && <Text style={styles.fieldError}>{addressErrors.state}</Text>}
                </View>
                <View style={{ flex: 1, zIndex: 10 }}>
                  <Text style={styles.fieldLabel}>City *</Text>
                  <View style={[styles.demoInputContainer, !!addressErrors.city && styles.inputError]}>
                    <TextInput
                      style={styles.demoInput}
                      placeholder={addressForm.state ? 'Type city name' : 'Select state first'}
                      placeholderTextColor={colors.textFaint}
                      value={addressForm.city}
                      onChangeText={(t) => { handleAddressChange('city', t.replace(/[^a-zA-Z\s]/g, '')); setShowCitySuggestions(true); }}
                      onFocus={() => setShowCitySuggestions(true)}
                      onBlur={() => { setTimeout(() => setShowCitySuggestions(false), 200); handleAddressBlur('city'); }}
                      editable={!!addressForm.state}
                    />
                  </View>
                  {showCitySuggestions && filteredCities.length > 0 && (
                    <ScrollView style={styles.suggestionsBox} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {filteredCities.map(c => (
                        <TouchableOpacity key={c} style={styles.suggestionItem} onPress={() => { handleAddressChange('city', c); setShowCitySuggestions(false); }}>
                          <Text style={styles.suggestionText}>{c}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  {!!addressErrors.city && <Text style={styles.fieldError}>{addressErrors.city}</Text>}
                </View>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Pincode *</Text>
              <View style={[styles.demoInputContainer, !!addressErrors.pincode && styles.inputError]}>
                <TextInput
                  style={styles.demoInput}
                  placeholder="6-digit pincode"
                  placeholderTextColor={colors.textFaint}
                  value={addressForm.pincode}
                  onChangeText={(t) => handleAddressChange('pincode', t.replace(/[^0-9]/g, ''))}
                  onBlur={() => handleAddressBlur('pincode')}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              {!!addressErrors.pincode && <Text style={styles.fieldError}>{addressErrors.pincode}</Text>}

              <TouchableOpacity
                style={[styles.primaryActionBtn, { marginTop: 24 }, isSavingAddress && styles.primaryActionBtnDisabled]}
                onPress={handleSaveAddress}
                disabled={isSavingAddress}
              >
                <Text style={styles.primaryActionText}>{isSavingAddress ? 'Saving...' : 'Save address'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Saved addresses manager */}
      <Modal visible={addrMgrVisible} transparent animationType="fade" onRequestClose={() => setAddrMgrVisible(false)} onDismiss={showNextAddrModal}>
        <View style={styles.addrMgrBackdrop}>
          <View style={styles.addrMgrCard}>
            <View style={styles.addrMgrHeader}>
              <Text style={styles.addrMgrTitle}>Saved addresses</Text>
              <TouchableOpacity style={styles.addrMgrClose} onPress={() => setAddrMgrVisible(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {mgrLoading ? (
                <ActivityIndicator color="#16a34a" style={{ marginVertical: 28 }} />
              ) : mgrAddresses.length === 0 ? (
                <Text style={styles.addrMgrEmpty}>No addresses yet — add your first address.</Text>
              ) : (
                mgrAddresses.map(addr => (
                  <View key={addr._id} style={styles.addrMgrRow}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.addrMgrLabelRow}>
                        <Text style={styles.addrMgrLabel}>{addr.label}</Text>
                        {addr.isDefault ? (
                          <View style={styles.addrMgrDefTag}><Text style={styles.addrMgrDefTagText}>Default</Text></View>
                        ) : (
                          <TouchableOpacity onPress={() => makeDefault(addr)}>
                            <Text style={styles.addrMgrMakeDef}>Set as default</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.addrMgrText} numberOfLines={2}>
                        {[addr.houseNo, addr.apartment, addr.fullAddress].filter(Boolean).join(', ')}
                      </Text>
                      {!!addr.receiverName && (
                        <Text style={styles.addrMgrReceiver}>{addr.receiverName} · {addr.receiverPhone}</Text>
                      )}
                    </View>
                    <TouchableOpacity style={styles.addrMgrEdit} onPress={() => startEditAddress(addr)} disabled={mgrBusy} accessibilityLabel="Edit address">
                      <Pencil size={15} color="#16a34a" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addrMgrDel} onPress={() => deleteAddress(addr)} disabled={mgrBusy} accessibilityLabel="Delete address">
                      <Trash2 size={16} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                ))
              )}

            </ScrollView>

            {!!mgrError && <Text style={styles.addrMgrError}>{mgrError}</Text>}

            {!mgrLoading && (
              mgrBusy ? (
                <View style={styles.addrMgrAddBtn}>
                  <ActivityIndicator size="small" color="#16a34a" />
                </View>
              ) : (
                <TouchableOpacity style={styles.addrMgrAddBtn} onPress={startAddAddress} activeOpacity={0.8}>
                  <Text style={styles.addrMgrAddText}>+ Add new address</Text>
                </TouchableOpacity>
              )
            )}
          </View>

          {/* Second-level delete confirmation — rendered inside the same modal so it
              always sits above the address list, with its own backdrop (KV-014). */}
          {deleteTarget && (
            <View style={styles.deleteConfirmOverlay}>
              <View style={styles.deleteConfirmCard}>
                <Text style={styles.deleteConfirmTitle}>Delete address?</Text>
                <Text style={styles.deleteConfirmMsg} numberOfLines={3}>
                  {deleteTarget.label} — {[deleteTarget.houseNo, deleteTarget.apartment, deleteTarget.fullAddress].filter(Boolean).join(', ')}
                </Text>
                <View style={styles.deleteConfirmRow}>
                  <TouchableOpacity style={styles.deleteConfirmCancel} onPress={() => setDeleteTarget(null)} activeOpacity={0.85}>
                    <Text style={styles.deleteConfirmCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteConfirmDelete} onPress={confirmDeleteAddress} activeOpacity={0.85}>
                    <Text style={styles.deleteConfirmDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Unified map-based address editor */}
      <AddressSearch
        visible={showAddressSearch}
        userCoords={editTarget?.location?.coordinates || null}
        editing={!!editTarget}
        initialArea={editTarget?.fullAddress}
        initialDetails={editTarget ? {
          houseNo: editTarget.houseNo,
          building: editTarget.apartment,
          landmark: editTarget.landmark,
          receiverName: editTarget.receiverName,
          receiverPhone: editTarget.receiverPhone,
          label: editTarget.label,
        } : undefined}
        onSelect={handleAddressSelected}
        onCancel={() => switchAddrModal('mgr')}
        onDismiss={showNextAddrModal}
      />

    </View>
  );
}

const OptionRow = ({ icon, bg, title, sub, onPress }: any) => {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
  <TouchableOpacity style={styles.optionRow} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.iconBg, { backgroundColor: bg }]}>{icon}</View>
    <View style={styles.optionTextColumn}>
      <Text style={styles.optionTitle}>{title}</Text>
      {sub && <Text style={styles.optionSub}>{sub}</Text>}
    </View>
    <ChevronLeft size={16} color={colors.borderStrong} style={{ transform: [{ rotate: '180deg' }] }} />
  </TouchableOpacity>
  );
};

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  backgroundGradient: { paddingTop: 60, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: 'white' },
  placeholderBox: { width: 40 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, maxWidth: 800, width: '100%', alignSelf: 'center' },

  /* Floating Profile Card */
  profileInfoCard: { alignItems: 'center', backgroundColor: c.surface, borderRadius: 24, padding: 24, paddingTop: 32, elevation: 8, shadowColor: c.shadow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 24, marginTop: -20, marginBottom: 24, borderWidth: 1, borderColor: c.border },
  avatarMain: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 3, borderColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, backgroundColor: '#10b981', borderRadius: 10, borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  verifiedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'white' },
  avatarEditBadge: { position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, backgroundColor: '#15803d', borderRadius: 12, borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 22, fontWeight: '900', color: c.text, marginBottom: 4, maxWidth: '85%', textAlign: 'center' },
  userPhone: { fontSize: 14, color: c.textMuted, fontWeight: '700', marginBottom: 2 },
  addPhoneLink: { fontSize: 14, color: '#16a34a', fontWeight: '800', marginBottom: 2 },
  userEmail: { fontSize: 13, color: c.textFaint, fontWeight: '500', marginBottom: 20 },

  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceAlt, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, marginBottom: 20, gap: 12, borderWidth: 1, borderColor: c.border },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 13, fontWeight: '800', color: c.text },
  statDivider: { width: 1, height: 20, backgroundColor: c.borderStrong },

  editBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: c.primarySoft, borderRadius: 100, borderWidth: 1, borderColor: '#bbf7d0', width: '100%', alignItems: 'center' },
  editBtnText: { color: '#16a34a', fontWeight: '800', fontSize: 14 },

  /* Referral Banner */
  referBanner: { marginBottom: 24, borderRadius: 20, overflow: 'hidden', elevation: 6, shadowColor: '#0d9488', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14 },
  referBannerGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16 },
  referBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  referBannerIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  referBannerTitle: { color: 'white', fontSize: 15, fontWeight: '900', marginBottom: 2 },
  referBannerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '600' },
  referBannerArrow: { marginLeft: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  /* Options Sections */
  sectionTitle: { fontSize: 15, fontWeight: '800', color: c.text, marginBottom: 12, marginLeft: 6 },
  optionsBlock: { backgroundColor: c.surface, borderRadius: 20, paddingHorizontal: 16, marginBottom: 24, elevation: 4, shadowColor: c.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, borderWidth: 1, borderColor: c.border },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },

  /* Demographics Modal Styles */
  demoListRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceAlt, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: c.border },
  demoListIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  demoListLabel: { fontSize: 13, color: c.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  demoListValue: { fontSize: 16, color: c.text, fontWeight: '800' },

  /* Edit Mode Styles inside Modal */
  editBtnOutline: { marginTop: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#16a34a', alignItems: 'center' },
  editBtnOutlineText: { color: '#16a34a', fontSize: 15, fontWeight: '800' },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: c.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  demoInputContainer: { justifyContent: 'center' },
  demoInput: { height: 50, borderRadius: 12, backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.border, paddingHorizontal: 16, fontSize: 15, color: c.text, fontWeight: '700' },
  inputError: { borderColor: '#ef4444', borderWidth: 1.5 },
  fieldError: { fontSize: 12, color: '#ef4444', fontWeight: '600', marginTop: 4, marginLeft: 2 },
  suggestionsBox: { position: 'absolute', top: 78, left: 0, right: 0, maxHeight: 180, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border, shadowColor: c.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8, zIndex: 100 },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
  suggestionText: { fontSize: 14, fontWeight: '600', color: c.text },
  pillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  pillActive: { backgroundColor: '#15803d', borderColor: '#15803d', shadowOpacity: 0.3, elevation: 3 },
  pillText: { fontSize: 13, fontWeight: '700', color: c.textMuted },
  pillTextActive: { color: 'white', fontWeight: '800' },

  iconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionTextColumn: { flex: 1, marginLeft: 16 },
  optionTitle: { fontSize: 15, fontWeight: '800', color: c.text, marginBottom: 2 },
  optionSub: { fontSize: 12, color: c.textMuted, fontWeight: '500' },
  divider: { height: 1, backgroundColor: c.border, marginLeft: 56 },

  /* Logout */
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.surface, paddingVertical: 16, borderRadius: 20, borderWidth: 1, borderColor: '#fecaca', marginBottom: 12 },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '800' },
  deleteAccountBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, marginBottom: 20 },
  deleteAccountText: { color: c.textFaint, fontSize: 13.5, fontWeight: '700' },

  /* Modal Styles (Zomato/Swiggy Style) */
  modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end', alignItems: 'center', padding: Platform.OS === 'web' ? 16 : 0 },
  modalBackdropCloseArea: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalContent: { backgroundColor: c.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderBottomLeftRadius: Platform.OS === 'web' ? 32 : 0, borderBottomRightRadius: Platform.OS === 'web' ? 32 : 0, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, elevation: 20, shadowColor: c.shadow, shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, width: '100%', maxWidth: 480, alignSelf: 'center', maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: c.text },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },

  /* Form Step */
  formContainer: {},
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: c.textMuted, marginBottom: 6, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.border, borderRadius: 16, paddingHorizontal: 16, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: c.text, fontWeight: '600', height: '100%' },

  primaryActionBtn: { backgroundColor: '#15803d', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: '#16a34a', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  primaryActionBtnDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0, elevation: 0 },
  primaryActionText: { color: 'white', fontSize: 16, fontWeight: '900' },
  securityNote: { textAlign: 'center', color: c.textFaint, fontSize: 11, fontWeight: '500', marginTop: 12 },

  /* OTP Step */
  otpContainer: { alignItems: 'center', paddingVertical: 20 },
  otpIconWrapper: { width: 64, height: 64, borderRadius: 20, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  otpHeading: { fontSize: 22, fontWeight: '900', color: c.text, marginBottom: 8, textAlign: 'center' },
  otpSub: { fontSize: 14, color: c.textMuted, textAlign: 'center', marginBottom: 32 },
  otpMainInput: { backgroundColor: c.inputBg, borderWidth: 2, borderColor: c.borderStrong, borderRadius: 16, fontSize: 32, fontWeight: '900', color: c.text, letterSpacing: 16, textAlign: 'center', width: '100%', height: 72 },
  otpInputError: { borderColor: '#ef4444', color: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '600', marginTop: 8 },
  resendBtn: { padding: 16, marginTop: 16 },
  resendText: { fontSize: 14, color: c.textMuted, fontWeight: '600' },

  /* Loading */
  loadingContainer: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '700', color: '#16a34a' },

  /* Success */
  successContainer: { alignItems: 'center', paddingVertical: 40 },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#16a34a', marginTop: 16, marginBottom: 8 },
  successSub: { fontSize: 14, color: c.textMuted, textAlign: 'center', paddingHorizontal: 20, fontWeight: '500' },

  /* Saved addresses manager */
  addrMgrBackdrop: { flex: 1, backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center', padding: 20 },
  addrMgrCard: { backgroundColor: c.surface, borderRadius: 24, padding: 20, width: '100%', maxWidth: 480 },

  /* Second-level delete confirmation (renders above the manager) */
  deleteConfirmOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  deleteConfirmCard: { backgroundColor: c.surface, borderRadius: 20, padding: 22, width: '100%', maxWidth: 380 },
  deleteConfirmTitle: { fontSize: 17, fontWeight: '800', color: c.text, marginBottom: 8 },
  deleteConfirmMsg: { fontSize: 14, color: c.textMuted, fontWeight: '500', lineHeight: 20, marginBottom: 18 },
  deleteConfirmRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  deleteConfirmCancel: { backgroundColor: c.surfaceAlt, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11 },
  deleteConfirmCancelText: { color: c.textMuted, fontSize: 14, fontWeight: '800' },
  deleteConfirmDelete: { backgroundColor: '#dc2626', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11 },
  deleteConfirmDeleteText: { color: 'white', fontSize: 14, fontWeight: '800' },
  addrMgrHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  addrMgrTitle: { fontSize: 19, fontWeight: '900', color: c.text },
  addrMgrClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  addrMgrError: { fontSize: 12.5, color: c.danger, fontWeight: '600', lineHeight: 18, marginTop: 10 },
  addrMgrEmpty: { fontSize: 13.5, color: c.textFaint, fontWeight: '500', textAlign: 'center', paddingVertical: 24 },
  addrMgrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
  addrMgrLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  addrMgrLabel: { fontSize: 13.5, fontWeight: '800', color: c.text },
  addrMgrDefTag: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  addrMgrDefTagText: { fontSize: 9.5, fontWeight: '800', color: '#15803d', letterSpacing: 0.4 },
  addrMgrMakeDef: { fontSize: 11.5, fontWeight: '700', color: '#0284c7' },
  addrMgrText: { fontSize: 12.5, color: c.textMuted, fontWeight: '500', lineHeight: 18 },
  addrMgrReceiver: { fontSize: 11.5, color: c.textFaint, fontWeight: '600', marginTop: 3 },
  addrMgrEdit: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  addrMgrDel: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  addrMgrAddBtn: { marginTop: 14, borderWidth: 1.5, borderColor: '#bbf7d0', borderStyle: 'dashed', backgroundColor: c.primarySoft, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  addrMgrAddText: { color: '#15803d', fontSize: 14, fontWeight: '800' },
}));
