import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Modal, TextInput, KeyboardAvoidingView, Platform, Animated, ActivityIndicator } from 'react-native';
import { ChevronLeft, User, MapPin, Flame, Settings, HeartHandshake, LogOut, FileText, Trophy, X, Mail, Phone, ShieldCheck, CheckCircle, CalendarDays, UserSquare2, Heart, Briefcase } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { profileService } from '../services/profile';
import { authService } from '../services/auth';

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
        setUserProfile({
          name: data.name || 'User',
          phone: data.phone || '+91 00000 00000',
          email: data.email || '',
          coins: data.karmaCoins || data.coins || 0,
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

  // Address Modal State
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addressForm, setAddressForm] = useState({ fullAddress: '' });
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const addressSlideAnim = useRef(new Animated.Value(0)).current;

  const openAddressModal = () => {
    setAddressForm({ fullAddress: userProfile?.address || '' });
    setAddressModalVisible(true);
    Animated.spring(addressSlideAnim, { toValue: 1, useNativeDriver: true, bounciness: 4 }).start();
  };

  const closeAddressModal = () => {
    Animated.timing(addressSlideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setAddressModalVisible(false));
  };

  const handleSaveAddress = async () => {
    if (!addressForm.fullAddress.trim() || addressForm.fullAddress.trim().length < 5) {
      alert('Please enter a valid address (at least 5 characters).');
      return;
    }
    setIsSavingAddress(true);
    try {
      await profileService.updateAddress({ fullAddress: addressForm.fullAddress.trim() });
      setUserProfile({ ...userProfile, address: addressForm.fullAddress.trim() });
      closeAddressModal();
    } catch (e) {
      alert('Failed to update address. Please try again.');
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
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState(false);

  // Animation utility for modal slide up
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (modalVisible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    } else {
      slideAnim.setValue(0);
      setTimeout(() => {
        setFlowStep('form');
        setOtpCode('');
        setOtpError(false);
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
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  useEffect(() => {
    if (demoModalVisible) {
      Animated.spring(demoSlideAnim, {
        toValue: 1,
        useNativeDriver: true,
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
      useNativeDriver: true,
    }).start(() => setDemoModalVisible(false));
  };

  const handleRequestOTP = () => {
    if (!editForm.name || !editForm.email || !editForm.phone) return;
    
    // Simulate sending OTP
    setFlowStep('loading');
    setTimeout(() => {
      setFlowStep('otp');
    }, 1200);
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length < 4) return;
    
    setFlowStep('loading');
    
    try {
      if (otpCode === '1234') {
        // Send to backend
        await profileService.updateAccount({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone
        });
        
        // Success
        setUserProfile({ ...userProfile, ...editForm });
        setFlowStep('success');
        setTimeout(() => {
          closeModal();
        }, 2000);
      } else {
        // Failure
        setFlowStep('otp');
        setOtpError(true);
      }
    } catch (error) {
      alert("Failed to update account details");
      setFlowStep('form');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#064e3b', '#15803d']} style={styles.backgroundGradient} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={styles.placeholderBox} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Loading State */}
          {isLoadingProfile ? (
             <View style={{ padding: 40, alignItems: 'center' }}>
               <ActivityIndicator size="large" color="#16a34a" />
               <Text style={{ marginTop: 10, color: '#64748b' }}>Loading Profile...</Text>
             </View>
          ) : !userProfile ? (
             <View style={{ padding: 40, alignItems: 'center' }}>
               <Text style={{ color: '#ef4444' }}>Failed to load profile.</Text>
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
                
                <Text style={styles.userName}>{userProfile?.name}</Text>
                <Text style={styles.userPhone}>{userProfile?.phone}</Text>
                {userProfile?.email ? <Text style={styles.userEmail}>{userProfile.email}</Text> : null}

                {/* Mini Stats Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statPill}>
                    <Trophy size={14} color="#d97706" />
                    <Text style={styles.statText}>5 Day Streak</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statPill}>
                    <KarmaCoin size={14} />
                    <Text style={styles.statText}>{userProfile?.coins || 0} Credits</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.editBtn} onPress={openEditModal} activeOpacity={0.7}>
                  <Text style={styles.editBtnText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>

              {/* Account Options */}
              <Text style={styles.sectionTitle}>My Account</Text>
              <View style={styles.optionsBlock}>
                <OptionRow onPress={openDemoModal} icon={<UserSquare2 size={18} color="#8b5cf6" />} bg="#f3e8ff" title="Personal Details" sub="Age, Gender, Marital Status..." />
                <View style={styles.divider} />
                <OptionRow icon={<MapPin size={18} color="#0284c7" />} bg="#f0f9ff" title="Saved Addresses" sub={userProfile?.address || 'Manage Home, Office locations'} onPress={openAddressModal} />
                <View style={styles.divider} />
                <OptionRow icon={<Flame size={18} color="#ea580c" />} bg="#fff7ed" title="Family Impact Tracker" sub="LPG, Fuel & Diet metrics" />
                <View style={styles.divider} />
                <OptionRow icon={<User size={18} color="#16a34a" />} bg="#f0fdf4" title="My Network" sub="Referrals & downstream impact" />
              </View>

              {/* General Options */}
              <Text style={styles.sectionTitle}>General</Text>
              <View style={styles.optionsBlock}>
                <OptionRow icon={<Settings size={18} color="#475569" />} bg="#f8fafc" title="App Settings" />
                <View style={styles.divider} />
                <OptionRow icon={<HeartHandshake size={18} color="#475569" />} bg="#f8fafc" title="Help & Support" />
                <View style={styles.divider} />
                <OptionRow icon={<FileText size={18} color="#475569" />} bg="#f8fafc" title="Terms & Privacy" />
              </View>

              {/* Logout */}
              <TouchableOpacity style={styles.logoutBtn} onPress={async () => {
                await authService.logout();
                navigation.replace('Login');
              }}>
                <LogOut size={18} color="#ef4444" />
                <Text style={styles.logoutText}>Log Out</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Demographics View Modal */}
      <Modal visible={demoModalVisible} transparent={true} animationType="fade" onRequestClose={closeDemoModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdropCloseArea} onPress={closeDemoModal} activeOpacity={1} />
          <Animated.View style={[
            styles.modalContent, 
            { transform: [{ translateY: demoSlideAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }]}
          ]}>
            <View style={[styles.modalHeader, { borderBottomWidth: 0, paddingBottom: 10 }]}>
              <Text style={styles.modalTitle}>Personal Details</Text>
              <TouchableOpacity onPress={closeDemoModal} style={styles.closeBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={{ paddingHorizontal: 24, paddingBottom: 32 }}>
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
                    <InputField placeholder="e.g. 24" value={demoEditForm.age} onChange={(t: any) => setDemoEditForm({...demoEditForm, age: t})} keyboardType="number-pad" maxLength={2} />
                  </View>
                  <View>
                    <Text style={styles.fieldLabel}>Identity (Gender)</Text>
                    <SelectionPills options={['Male', 'Female', 'Other', 'Select Later']} selected={demoEditForm.gender} onSelect={(t) => setDemoEditForm({...demoEditForm, gender: t})} />
                  </View>
                  <View>
                    <Text style={styles.fieldLabel}>Marital Status</Text>
                    <SelectionPills options={['Single', 'Married']} selected={demoEditForm.maritalStatus} onSelect={(t) => setDemoEditForm({...demoEditForm, maritalStatus: t})} />
                  </View>
                  <View>
                    <Text style={styles.fieldLabel}>Employment</Text>
                    <SelectionPills options={['Student', 'Employed', 'Business', 'Unemployed']} selected={demoEditForm.employment} onSelect={(t) => setDemoEditForm({...demoEditForm, employment: t})} />
                  </View>
                  <TouchableOpacity style={[styles.primaryActionBtn, { marginTop: 12 }]} onPress={async () => {
                      try {
                        const parsedAge = parseInt(demoEditForm.age) || 0;
                        await profileService.updateDemographics({ ...demoEditForm, age: parsedAge });
                        setUserProfile({...userProfile, demographics: { ...demoEditForm, age: parsedAge }});
                        setIsDemoEditing(false);
                      } catch (e) {
                        alert("Failed to update profile");
                      }
                  }}>
                    <Text style={styles.primaryActionText}>Update & Save</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Animated.View>
        </View>
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
                {flowStep === 'form' || flowStep === 'loading' ? 'Edit Details' : flowStep === 'otp' ? 'Secure Verification' : ''}
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
                  onPress={handleRequestOTP}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryActionText}>Save & Verify Changes</Text>
                </TouchableOpacity>
                <Text style={styles.securityNote}>A verification code will be sent to confirm your identity.</Text>
              </View>
            )}

            {/* Loading Step */}
            {flowStep === 'loading' && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#16a34a" />
                <Text style={styles.loadingText}>Please wait...</Text>
              </View>
            )}

            {/* Step 2: OTP Entry */}
            {flowStep === 'otp' && (
              <View style={styles.otpContainer}>
                <View style={styles.otpIconWrapper}>
                  <ShieldCheck size={36} color="#16a34a" />
                </View>
                <Text style={styles.otpHeading}>Enter Verification Code</Text>
                <Text style={styles.otpSub}>Code sent securely to <Text style={{fontWeight: '700'}}>{editForm.email}</Text></Text>
                
                <TextInput
                  style={[styles.otpMainInput, otpError && styles.otpInputError]}
                  value={otpCode}
                  onChangeText={(t) => {
                    setOtpCode(t);
                    setOtpError(false);
                  }}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="• • • •"
                  placeholderTextColor="#cbd5e1"
                  autoFocus
                />
                {otpError && <Text style={styles.errorText}>Invalid code. Use 1234.</Text>}

                <TouchableOpacity 
                  style={[styles.primaryActionBtn, {marginTop: 20}, otpCode.length < 4 && styles.primaryActionBtnDisabled]} 
                  onPress={handleVerifyOTP}
                >
                  <Text style={styles.primaryActionText}>Verify & Update</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.resendBtn}>
                  <Text style={styles.resendText}>Didn't receive code? <Text style={{color: '#16a34a', fontWeight: 'bold'}}>Resend</Text></Text>
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
            <View style={{ paddingHorizontal: 24, paddingBottom: 32 }}>
              <Text style={{ fontSize: 14, color: '#64748b', marginBottom: 20, lineHeight: 20 }}>
                This address will be used as your default pickup location.
              </Text>
              <Text style={styles.fieldLabel}>Full Address</Text>
              <View style={[styles.demoInputContainer, { height: 100 }]}>
                <TextInput
                  style={[styles.demoInput, { height: 90, textAlignVertical: 'top' }]}
                  placeholder="e.g. 42, Green Park Colony, Sector 14, Gurugram, Haryana - 122001"
                  placeholderTextColor="#9ca3af"
                  value={addressForm.fullAddress}
                  onChangeText={(t) => setAddressForm({ fullAddress: t })}
                  multiline
                />
              </View>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { marginTop: 20 }, isSavingAddress && styles.primaryActionBtnDisabled]}
                onPress={handleSaveAddress}
                disabled={isSavingAddress}
              >
                <Text style={styles.primaryActionText}>{isSavingAddress ? 'Saving...' : 'Save Address'}</Text>
              </TouchableOpacity>
            </View>
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  backgroundGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: 'white' },
  placeholderBox: { width: 40 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  /* Floating Profile Card */
  profileInfoCard: { alignItems: 'center', backgroundColor: 'white', borderRadius: 24, padding: 20, paddingTop: 30, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 10, marginTop: 10, marginBottom: 24 },
  avatarMain: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 3, borderColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  avatarMainText: { color: 'white', fontSize: 28, fontWeight: '900' },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, backgroundColor: '#10b981', borderRadius: 10, borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  verifiedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'white' },
  userName: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
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
  optionsBlock: { backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 16, marginBottom: 24, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
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
