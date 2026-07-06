import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Modal, TextInput, KeyboardAvoidingView, Platform, Animated, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, User, MapPin, Flame, Settings, HeartHandshake, LogOut, FileText, Trophy, X, Mail, Phone, ShieldCheck, CheckCircle, CalendarDays, UserSquare2, Heart, Briefcase } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { profileService } from '../services/profile';
import { authService } from '../services/auth';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Reusable Components
function InputField({ placeholder, value, onChange, keyboardType = 'default', maxLength }: any) {
  return (
    <View style={styles.demoInputContainer}>
      <TextInput
        style={styles.demoInput}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
    </View>
  );
}

function SelectionPills({ options, selected, onSelect }: { options: string[], selected: string, onSelect: (v: string) => void }) {
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

export function ProfileScreen({ navigation }: any) {
  // Main Profile State
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Fetch Profile on Mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await profileService.getProfile();
        // Read quiz streak from AsyncStorage (same as Dashboard)
        const token = await AsyncStorage.getItem('userToken') || 'x';
        const sfx = token.slice(-8);
        const [storedDate, storedStreak] = await Promise.all([
          AsyncStorage.getItem(`lastQuizDate_${sfx}`),
          AsyncStorage.getItem(`quizStreak_${sfx}`),
        ]);
        let quizStreak = 0;
        if (storedDate) {
          const now = new Date();
          const todayUTC = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-${String(now.getUTCDate()).padStart(2,'0')}`;
          const y = new Date(now); y.setUTCDate(y.getUTCDate()-1);
          const yestUTC = `${y.getUTCFullYear()}-${String(y.getUTCMonth()+1).padStart(2,'0')}-${String(y.getUTCDate()).padStart(2,'0')}`;
          if (storedDate === todayUTC || storedDate === yestUTC) quizStreak = Number(storedStreak) || 0;
        }
        setUserProfile({
          name: data.name || 'User',
          phone: data.phone || '+91 00000 00000',
          email: data.email || '',
          coins: data.karmaCoins || data.coins || 0,
          streak: quizStreak,
          address: data.address
            ? (typeof data.address === 'object' ? data.address.fullAddress : data.address)
            : '',
          demographics: {
            age: data.demographics?.age || data.age || 25,
            gender: data.demographics?.gender || data.gender || 'Not Specified',
            maritalStatus: data.demographics?.maritalStatus || data.maritalStatus || 'Not Specified',
            employment: data.demographics?.employment || data.employment || 'Not Specified'
          }
        });
        setEditForm({
           name: data.name || 'User',
           phone: data.phone || '+91 00000 00000',
           email: data.email || '',
        });
      } catch (error) {
        console.error('Failed to load profile', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    fetchProfile();
  }, []);

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
    employment: 'Employed'
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
      Alert.alert('Error', 'Failed to update address. Please try again.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const openDemoModal = () => {
    setDemoEditForm({
      age: userProfile?.demographics?.age?.toString() || '25',
      gender: userProfile?.demographics?.gender || 'Not Specified',
      maritalStatus: userProfile?.demographics?.maritalStatus || 'Not Specified',
      employment: userProfile?.demographics?.employment || 'Not Specified'
    });
    setIsDemoEditing(false);
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

  const openEditModal = () => {
    setEditForm({ ...userProfile });
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

  const [profileOtp, setProfileOtp] = useState(['', '', '', '', '', '']);
  const profileOtpRefs = useRef<Array<any>>([]);

  const emailChanged = editForm.email && editForm.email !== userProfile?.email;
  const phoneChanged = editForm.phone && editForm.phone !== userProfile?.phone;

  const handleSaveProfile = async () => {
    if (!editForm.name || !editForm.email || !editForm.phone) return;

    if (emailChanged || phoneChanged) {
      setFlowStep('loading');
      try {
        await profileService.sendProfileOtp(emailChanged ? editForm.email : editForm.phone);
        setProfileOtp(['', '', '', '', '', '']);
        setFlowStep('otp');
      } catch (error: any) {
        Alert.alert('Could not send OTP', error?.response?.data?.message || 'Please try again.');
        setFlowStep('form');
      }
    } else {
      await saveProfileDirect();
    }
  };

  const saveProfileDirect = async () => {
    setFlowStep('loading');
    try {
      await profileService.updateAccount({
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone
      });
      setUserProfile({ ...userProfile, ...editForm });
      setFlowStep('success');
      setTimeout(() => closeModal(), 2000);
    } catch (error) {
      Alert.alert('Update failed', 'Failed to update account details');
      setFlowStep('form');
    }
  };

  const handleProfileOtpVerify = async () => {
    const otp = profileOtp.join('');
    if (otp.length < 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP.');
      return;
    }
    setFlowStep('loading');
    try {
      await profileService.verifyProfileOtp(emailChanged ? editForm.email : editForm.phone, otp);
      await saveProfileDirect();
    } catch (error: any) {
      Alert.alert('Verification failed', error?.response?.data?.message || 'Invalid or expired OTP.');
      setFlowStep('otp');
    }
  };

  const handleProfileOtpChange = (text: string, index: number) => {
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
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#064e3b', '#15803d']} style={styles.backgroundGradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
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
               <Text style={{ marginTop: 10, color: '#64748b' }}>Loading Profile...</Text>
             </View>
          ) : !userProfile ? (
             <View style={{ padding: 40, alignItems: 'center', gap: 16 }}>
               <Text style={{ color: '#ef4444', fontWeight: '600', fontSize: 15 }}>Failed to load profile.</Text>
               <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>Check your internet connection and try again.</Text>
               <TouchableOpacity
                 style={{ backgroundColor: '#16a34a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
                 onPress={() => { setIsLoadingProfile(true); profileService.getProfile().then(data => { setUserProfile({ name: data.name || 'User', phone: data.phone || '', email: data.email || '', coins: data.karmaCoins || data.coins || 0, address: data.address ? (typeof data.address === 'object' ? data.address.fullAddress : data.address) : '', demographics: { age: data.demographics?.age || data.age || 25, gender: data.demographics?.gender || data.gender || 'Not Specified', maritalStatus: data.demographics?.maritalStatus || 'Not Specified', employment: data.demographics?.employment || 'Not Specified' } }); }).catch(() => {}).finally(() => setIsLoadingProfile(false)); }}
               >
                 <Text style={{ color: 'white', fontWeight: '800' }}>Retry</Text>
               </TouchableOpacity>
               {/* Logout even when profile fails */}
               <TouchableOpacity
                 style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', backgroundColor: 'white' }}
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
                <View style={styles.avatarMain}>
                  <Text style={styles.avatarMainText}>{userProfile?.name?.charAt(0)}{userProfile?.name?.split(' ')[1]?.[0] || ''}</Text>
                  <View style={styles.verifiedBadge}>
                    <View style={styles.verifiedDot} />
                  </View>
                </View>
                
                <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                  {userProfile?.name}
                </Text>
                <Text style={styles.userPhone}>{userProfile?.phone}</Text>
                {userProfile?.email ? <Text style={styles.userEmail}>{userProfile.email}</Text> : null}

                {/* Mini Stats Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statPill}>
                    <Trophy size={14} color="#d97706" />
                    <Text style={styles.statText}>{userProfile?.streak || 0} day streak</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statPill}>
                    <KarmaCoin size={14} />
                    <Text style={styles.statText}>{userProfile?.coins || 0} coins</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.editBtn} onPress={openEditModal} activeOpacity={0.7}>
                  <Text style={styles.editBtnText}>Edit profile</Text>
                </TouchableOpacity>
              </View>

              {/* Account Options */}
              <Text style={styles.sectionTitle}>My account</Text>
              <View style={styles.optionsBlock}>
                <OptionRow onPress={openDemoModal} icon={<UserSquare2 size={18} color="#8b5cf6" />} bg="#f3e8ff" title="Personal details" sub="Age, gender, marital status..." />
                <View style={styles.divider} />
                <OptionRow icon={<MapPin size={18} color="#0284c7" />} bg="#f0f9ff" title="Saved addresses" sub={userProfile?.address || 'Manage home, office locations'} onPress={openAddressModal} />
                <View style={styles.divider} />
                <OptionRow icon={<Flame size={18} color="#ea580c" />} bg="#fff7ed" title="Family impact tracker" sub="LPG, fuel & diet metrics" />
                <View style={styles.divider} />
                <OptionRow icon={<User size={18} color="#16a34a" />} bg="#f0fdf4" title="My network" sub="Referrals & downstream impact" />
              </View>

              {/* General Options */}
              <Text style={styles.sectionTitle}>General</Text>
              <View style={styles.optionsBlock}>
                <OptionRow icon={<Settings size={18} color="#475569" />} bg="#f8fafc" title="App settings" />
                <View style={styles.divider} />
                <OptionRow icon={<HeartHandshake size={18} color="#475569" />} bg="#f8fafc" title="Help & support" />
                <View style={styles.divider} />
                <OptionRow icon={<FileText size={18} color="#475569" />} bg="#f8fafc" title="Terms & privacy" />
              </View>

              {/* Logout */}
              <TouchableOpacity style={styles.logoutBtn} onPress={async () => {
                await authService.logout();
                navigation.replace('Login');
              }}>
                <LogOut size={18} color="#ef4444" />
                <Text style={styles.logoutText}>Log out</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        </ScrollView>
      </SafeAreaView>

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
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
            >
              <Text style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 20 }}>
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

                  <TouchableOpacity style={styles.editBtnOutline} onPress={() => setIsDemoEditing(true)}>
                    <Text style={styles.editBtnOutlineText}>Modify Details</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 20 }}>
                  <View>
                    <Text style={styles.fieldLabel}>Your Age</Text>
                    <InputField placeholder="e.g. 24" value={demoEditForm.age} onChange={(t: any) => setDemoEditForm({...demoEditForm, age: t.replace(/[^0-9]/g, '')})} keyboardType="number-pad" maxLength={3} />
                    {demoEditForm.age && (parseInt(demoEditForm.age) < 5 || parseInt(demoEditForm.age) > 100) && (
                      <Text style={styles.fieldError}>Age must be between 5 and 100</Text>
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
                    <SelectionPills options={['Student', 'Employed', 'Business', 'Unemployed', 'Retired']} selected={demoEditForm.employment} onSelect={(t) => setDemoEditForm({...demoEditForm, employment: t})} />
                  </View>
                  <TouchableOpacity style={[styles.primaryActionBtn, { marginTop: 12 }]} onPress={async () => {
                      const parsedAge = parseInt(demoEditForm.age);
                      if (!demoEditForm.age || isNaN(parsedAge) || parsedAge < 5 || parsedAge > 100) {
                        Alert.alert('Invalid age', 'Please enter a valid age between 5 and 100.');
                        return;
                      }
                      try {
                        await profileService.updateDemographics({ ...demoEditForm, age: parsedAge });
                        setUserProfile({...userProfile, demographics: { ...demoEditForm, age: parsedAge }});
                        setIsDemoEditing(false);
                      } catch (e) {
                        Alert.alert('Error', 'Failed to update profile. Please try again.');
                      }
                  }}>
                    <Text style={styles.primaryActionText}>Update & Save</Text>
                  </TouchableOpacity>
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
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>

            {/* Step 1: Form */}
            {flowStep === 'form' && (
              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <User size={18} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input} 
                      value={editForm.name} 
                      onChangeText={(t) => setEditForm({...editForm, name: t})}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={styles.inputWrapper}>
                    <Phone size={18} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input} 
                      value={editForm.phone} 
                      onChangeText={(t) => setEditForm({...editForm, phone: t})}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Mail size={18} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input} 
                      value={editForm.email} 
                      onChangeText={(t) => setEditForm({...editForm, email: t})}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

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
                <Text style={styles.loadingText}>Saving details...</Text>
              </View>
            )}

            {/* Step: OTP Verification */}
            {flowStep === 'otp' && (
              <View style={{ alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 }}>
                <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: '#bbf7d0' }}>
                  <ShieldCheck size={24} color="#15803d" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 6 }}>Verify your {emailChanged ? 'email' : 'phone'}</Text>
                <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '500', marginBottom: 4 }}>OTP sent to</Text>
                <Text style={{ fontSize: 14, color: '#15803d', fontWeight: '800', marginBottom: 24 }}>{emailChanged ? editForm.email : editForm.phone}</Text>

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                  {profileOtp.map((digit: string, i: number) => (
                    <TextInput
                      key={i}
                      ref={(ref: any) => { profileOtpRefs.current[i] = ref; }}
                      style={{
                        width: 44, height: 52, borderRadius: 12, borderWidth: 2,
                        borderColor: digit ? '#15803d' : '#e2e8f0',
                        backgroundColor: digit ? '#f0fdf4' : '#f8fafc',
                        textAlign: 'center', fontSize: 20, fontWeight: '900', color: '#0f172a',
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

                <TouchableOpacity
                  style={{ backgroundColor: profileOtp.join('').length < 6 ? '#94a3b8' : '#15803d', borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 12 }}
                  onPress={handleProfileOtpVerify}
                  disabled={profileOtp.join('').length < 6}
                >
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 15 }}>Verify & save</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setFlowStep('form')}>
                  <Text style={{ color: '#64748b', fontWeight: '600', fontSize: 13 }}>â† Back to edit</Text>
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
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ paddingHorizontal: 24 }} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 18 }}>
                This address will be used as your default pickup location.
              </Text>

              <Text style={styles.fieldLabel}>House / Flat No. *</Text>
              <View style={[styles.demoInputContainer, !!addressErrors.flatNo && styles.inputError]}>
                <TextInput
                  style={styles.demoInput}
                  placeholder="e.g. 42, Block B"
                  placeholderTextColor="#9ca3af"
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
                  placeholderTextColor="#9ca3af"
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
                      placeholderTextColor="#9ca3af"
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
                      placeholderTextColor="#9ca3af"
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
                  placeholderTextColor="#9ca3af"
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

    </View>
  );
}

const OptionRow = ({ icon, bg, title, sub, onPress }: any) => (
  <TouchableOpacity style={styles.optionRow} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.iconBg, { backgroundColor: bg }]}>{icon}</View>
    <View style={styles.optionTextColumn}>
      <Text style={styles.optionTitle}>{title}</Text>
      {sub && <Text style={styles.optionSub}>{sub}</Text>}
    </View>
    <ChevronLeft size={16} color="#cbd5e1" style={{ transform: [{ rotate: '180deg' }] }} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf6' },
  backgroundGradient: { paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: 'white' },
  placeholderBox: { width: 40 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, maxWidth: 800, width: '100%', alignSelf: 'center' },
  
  /* Floating Profile Card */
  profileInfoCard: { alignItems: 'center', backgroundColor: 'white', borderRadius: 24, padding: 24, paddingTop: 32, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 24, marginTop: -20, marginBottom: 24, borderWidth: 1, borderColor: '#f1f5f9' },
  avatarMain: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 3, borderColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  avatarMainText: { color: 'white', fontSize: 28, fontWeight: '900' },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, backgroundColor: '#10b981', borderRadius: 10, borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  verifiedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'white' },
  userName: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 4, maxWidth: '85%', textAlign: 'center' },
  userPhone: { fontSize: 14, color: '#475569', fontWeight: '700', marginBottom: 2 },
  userEmail: { fontSize: 13, color: '#94a3b8', fontWeight: '500', marginBottom: 20 },
  
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, marginBottom: 20, gap: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 13, fontWeight: '800', color: '#334155' },
  statDivider: { width: 1, height: 20, backgroundColor: '#cbd5e1' },

  editBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#f0fdf4', borderRadius: 100, borderWidth: 1, borderColor: '#bbf7d0', width: '100%', alignItems: 'center' },
  editBtnText: { color: '#16a34a', fontWeight: '800', fontSize: 14 },
  
  /* Options Sections */
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 12, marginLeft: 6 },
  optionsBlock: { backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 16, marginBottom: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  
  /* Demographics Modal Styles */
  demoListRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  demoListIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  demoListLabel: { fontSize: 13, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  demoListValue: { fontSize: 16, color: '#0f172a', fontWeight: '800' },
  
  /* Edit Mode Styles inside Modal */
  editBtnOutline: { marginTop: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#16a34a', alignItems: 'center' },
  editBtnOutlineText: { color: '#16a34a', fontSize: 15, fontWeight: '800' },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  demoInputContainer: { justifyContent: 'center' },
  demoInput: { height: 50, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, fontSize: 15, color: '#0f172a', fontWeight: '700' },
  inputError: { borderColor: '#ef4444', borderWidth: 1.5 },
  fieldError: { fontSize: 12, color: '#ef4444', fontWeight: '600', marginTop: 4, marginLeft: 2 },
  suggestionsBox: { position: 'absolute', top: 78, left: 0, right: 0, maxHeight: 180, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8, zIndex: 100 },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  suggestionText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  pillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  pillActive: { backgroundColor: '#15803d', borderColor: '#15803d', shadowOpacity: 0.3, elevation: 3 },
  pillText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  pillTextActive: { color: 'white', fontWeight: '800' },

  iconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionTextColumn: { flex: 1, marginLeft: 16 },
  optionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  optionSub: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 56 },
  
  /* Logout */
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'white', paddingVertical: 16, borderRadius: 20, borderWidth: 1, borderColor: '#fecaca', marginBottom: 20 },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '800' },

  /* Modal Styles (Zomato/Swiggy Style) */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBackdropCloseArea: { flex: 1 },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  
  /* Form Step */
  formContainer: {},
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#0f172a', fontWeight: '600', height: '100%' },
  
  primaryActionBtn: { backgroundColor: '#15803d', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: '#16a34a', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  primaryActionBtnDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0, elevation: 0 },
  primaryActionText: { color: 'white', fontSize: 16, fontWeight: '900' },
  securityNote: { textAlign: 'center', color: '#94a3b8', fontSize: 11, fontWeight: '500', marginTop: 12 },

  /* OTP Step */
  otpContainer: { alignItems: 'center', paddingVertical: 20 },
  otpIconWrapper: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  otpHeading: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  otpSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 32 },
  otpMainInput: { backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#cbd5e1', borderRadius: 16, fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: 16, textAlign: 'center', width: '100%', height: 72 },
  otpInputError: { borderColor: '#ef4444', color: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '600', marginTop: 8 },
  resendBtn: { padding: 16, marginTop: 16 },
  resendText: { fontSize: 14, color: '#64748b', fontWeight: '600' },

  /* Loading */
  loadingContainer: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '700', color: '#16a34a' },

  /* Success */
  successContainer: { alignItems: 'center', paddingVertical: 40 },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#16a34a', marginTop: 16, marginBottom: 8 },
  successSub: { fontSize: 14, color: '#64748b', textAlign: 'center', paddingHorizontal: 20, fontWeight: '500' },
});
