import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, StatusBar, TouchableOpacity, Dimensions, TextInput } from 'react-native';
import { ChevronLeft, MapPin, CheckCircle2, PackageOpen, Plus, Minus, TriangleAlert, FileText, Magnet, Droplets, Wine, Smartphone, Shirt, Leaf } from 'lucide-react-native';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { LinearGradient } from 'expo-linear-gradient';
import { CupSoda, ShoppingBag, Archive, Newspaper as NewsIcon, BookOpen, StickyNote, Database, Cog, Utensils, Activity, Sparkles, Laptop, Cable, Tv, Scissors, Apple, Trees, Battery, PaintBucket, Trash2, Loader2 } from 'lucide-react-native';
import { bookingService } from '../services/booking';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - 40 - (CARD_MARGIN * 2)) / 2;

// Re-using the premium catalog from old StoreScreen
const CATEGORIES = [
  { id: '1', title: 'Plastic Waste', color: '#0ea5e9', icon: Droplets },
  { id: '2', title: 'Paper Waste', color: '#84cc16', icon: FileText },
  { id: '3', title: 'Metal Waste', color: '#64748b', icon: Magnet },
  { id: '4', title: 'Glass Waste', color: '#10b981', icon: Wine },
  { id: '5', title: 'E-Waste', color: '#14b8a6', icon: Smartphone },
  { id: '6', title: 'Textile Waste', color: '#6366f1', icon: Shirt },
  { id: '7', title: 'Organic', color: '#eab308', icon: Leaf },
  { id: '8', title: 'Hazardous', color: '#ef4444', icon: TriangleAlert },
];

const ALL_ITEMS = [
  { id: 'p1', catId: '1', name: 'PET Bottle', unit: 'per kg', coins: 12, itemIcon: CupSoda },
  { id: 'p2', catId: '1', name: 'Milk Packets', unit: 'per kg', coins: 8, itemIcon: PackageOpen },
  { id: 'p3', catId: '1', name: 'Containers', unit: 'per kg', coins: 10, itemIcon: Archive },
  { id: 'p4', catId: '1', name: 'Carry Bags', unit: 'per kg', coins: 5, itemIcon: ShoppingBag },
  
  { id: 'pa1', catId: '2', name: 'Newspaper', unit: 'per kg', coins: 15, itemIcon: NewsIcon },
  { id: 'pa2', catId: '2', name: 'Books', unit: 'per kg', coins: 12, itemIcon: BookOpen },
  { id: 'pa3', catId: '2', name: 'Cardboard', unit: 'per kg', coins: 10, itemIcon: PackageOpen },
  { id: 'pa4', catId: '2', name: 'Office Paper', unit: 'per kg', coins: 14, itemIcon: StickyNote },
  
  { id: 'm1', catId: '3', name: 'Aluminium Can', unit: 'per kg', coins: 35, itemIcon: Database },
  { id: 'm2', catId: '3', name: 'Iron Scrap', unit: 'per kg', coins: 25, itemIcon: Cog },
  { id: 'm3', catId: '3', name: 'Steel Utensils', unit: 'per kg', coins: 30, itemIcon: Utensils },
  { id: 'm4', catId: '3', name: 'Copper Wire', unit: 'per kg', coins: 80, itemIcon: Activity },
  
  { id: 'g1', catId: '4', name: 'Glass Bottle', unit: 'per kg', coins: 5, itemIcon: Wine },
  { id: 'g2', catId: '4', name: 'Broken Glass', unit: 'per kg', coins: 3, itemIcon: Sparkles },
  
  { id: 'e1', catId: '5', name: 'Mobile Phone', unit: 'per piece', coins: 50, itemIcon: Smartphone },
  { id: 'e2', catId: '5', name: 'Laptop', unit: 'per piece', coins: 200, itemIcon: Laptop },
  { id: 'e3', catId: '5', name: 'Cables', unit: 'per kg', coins: 40, itemIcon: Cable },
  { id: 'e4', catId: '5', name: 'Appliances', unit: 'per item', coins: 60, itemIcon: Tv },
  
  { id: 't1', catId: '6', name: 'Old Clothes', unit: 'per kg', coins: 10, itemIcon: Shirt },
  { id: 't2', catId: '6', name: 'Fabric Waste', unit: 'per kg', coins: 8, itemIcon: Scissors },
  
  { id: 'o1', catId: '7', name: 'Food Waste', unit: 'per kg', coins: 2, itemIcon: Apple },
  { id: 'o2', catId: '7', name: 'Veg Peels', unit: 'per kg', coins: 2, itemIcon: Leaf },
  { id: 'o3', catId: '7', name: 'Garden Waste', unit: 'per kg', coins: 3, itemIcon: Trees },
  
  { id: 'h1', catId: '8', name: 'Batteries', unit: 'per piece', coins: 20, itemIcon: Battery },
  { id: 'h2', catId: '8', name: 'Paint Boxes', unit: 'per item', coins: 10, itemIcon: PaintBucket },
  { id: 'h3', catId: '8', name: 'Sanitary', unit: 'per kg', coins: 0, itemIcon: Trash2 },
];

const generateDates = () => {
  const dates = [];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // Generate next 6 days starting from tomorrow to guarantee future date
  for (let i = 1; i <= 6; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(9, 0, 0, 0); // Set to morning
    dates.push({
      dateObj: d,
      day: days[d.getDay()],
      num: d.getDate().toString(),
      fullDate: d.toISOString() // This will be sent to the backend
    });
  }
  return dates;
};

const DATES = generateDates();

const TIMES = [
  '09:00 AM - 12:00 PM',
  '12:00 PM - 03:00 PM',
  '03:00 PM - 06:00 PM',
  '06:00 PM - 09:00 PM'
];

export function SchedulePickupScreen({ navigation }: any) {
  // Step Management
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Cart State { itemId: quantity }
  const [cart, setCart] = useState<Record<string, number>>({});
  
  // UI States
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [selectedDate, setSelectedDate] = useState(DATES[0].fullDate);
  const [selectedTime, setSelectedTime] = useState(TIMES[0]);
  const [instructions, setInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Cart Logic
  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      const newCart = { ...prev };
      if (next === 0) delete newCart[itemId];
      else newCart[itemId] = next;
      return newCart;
    });
  };

  const cartCalculations = useMemo(() => {
    let totalItems = 0;
    let totalCoins = 0;
    
    Object.entries(cart).forEach(([id, qty]) => {
      const item = ALL_ITEMS.find(i => i.id === id);
      if (item) {
        totalItems += qty;
        totalCoins += (item.coins * qty);
      }
    });

    return { totalItems, totalCoins };
  }, [cart]);

  // Derived Grid Logic for Step 1
  const displayedItems = useMemo(() => ALL_ITEMS.filter(item => item.catId === activeCategory), [activeCategory]);
  const activeCatData = CATEGORIES.find(c => c.id === activeCategory);

  const getBackendCategoryName = (catTitle: string) => {
    const lower = catTitle.toLowerCase();
    if (lower.includes('plastic')) return 'plastic';
    if (lower.includes('metal')) return 'metal';
    if (lower.includes('e-waste') || lower.includes('e-waste')) return 'e-waste';
    if (lower.includes('paper')) return 'paper';
    if (lower.includes('glass')) return 'glass';
    if (lower.includes('textile')) return 'textile';
    if (lower.includes('organic')) return 'organic';
    if (lower.includes('hazardous')) return 'hazardous';
    return 'other';
  };

  const handleConfirmPickup = async () => {
    if (Object.keys(cart).length === 0) {
      alert("Please add items to your cart first.");
      return;
    }

    setIsLoading(true);
    try {
      // Structure the categories array
      const payloadCategories: any[] = [];
      Object.entries(cart).forEach(([itemId, qty]) => {
        const item = ALL_ITEMS.find(i => i.id === itemId);
        if (item) {
          const categoryObj = CATEGORIES.find(c => c.id === item.catId);
          if (categoryObj) {
             // Add an entry for each quantity? Or just one entry per subCategory?
             // Based on the mock, it seems it expects flat items. If user adds 2 laptops, 
             // maybe we just push 2 entries, or backend handles it via order weight later. 
             // We'll push one entry per distinct item type for now as the schema doesn't ask for quantity.
             payloadCategories.push({
               category: getBackendCategoryName(categoryObj.title),
               subCategory: item.name
             });
          }
        }
      });

      const payload = {
        categories: payloadCategories,
        pickupDate: selectedDate, // ISO string
        timeSlot: selectedTime,
        address: {
          fullAddress: '42, Green Park Colony, Sector 14, Gurugram, Haryana - 122001',
          location: {
            type: 'Point' as const,
            coordinates: [77.0266, 28.4595] as [number, number] // [longitude, latitude] for Gurugram approx
          }
        }
      };

      await bookingService.createBooking(payload);
      
      setIsSubmitted(true);
      setTimeout(() => navigation.replace('OrderTracking'), 2500);
    } catch (error: any) {
      alert(error?.response?.data?.message || "Failed to schedule pickup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Success View
  if (isSubmitted) {
    return (
      <View style={styles.successContainer}>
        <CheckCircle2 size={100} color="#16a34a" />
        <Text style={styles.successTitle}>Pickup Scheduled!</Text>
        <Text style={styles.successSub}>Thank you for recycling {cartCalculations.totalItems} items.</Text>
      </View>
    );
  }

  // --- Render Step 1: Catalog Selection ---
  const renderCatalogStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id;
            const Icon = cat.icon;
            if (isActive) {
              return (
                <LinearGradient key={cat.id} colors={[cat.color, cat.color + 'dd']} style={styles.filterChipActive} start={{ x:0, y:0 }} end={{ x:1, y:1 }}>
                  <Icon size={16} color="white" style={{ marginRight: 6 }} />
                  <Text style={styles.filterTextActive}>{cat.title}</Text>
                </LinearGradient>
              );
            }
            return (
              <TouchableOpacity key={cat.id} style={styles.filterChip} onPress={() => setActiveCategory(cat.id)}>
                <Icon size={16} color="#64748b" style={{ marginRight: 6 }} />
                <Text style={styles.filterText}>{cat.title}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.gridContent}>
        <View style={styles.gridContainer}>
          {displayedItems.map((item) => {
            const qty = cart[item.id] || 0;
            const CatIcon = item.itemIcon || activeCatData?.icon || PackageOpen;
            const catColor = activeCatData?.color || '#16a34a';

            return (
              <View key={item.id} style={[styles.cardContainer, qty > 0 && styles.cardContainerActive]}>
                <View style={[styles.cardImageArea, { backgroundColor: catColor + '15' }]}>
                  <CatIcon size={46} color={catColor} strokeWidth={1.5} opacity={0.8} />
                </View>

                <View style={styles.cardInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemUnit}>{item.unit}</Text>
                  
                  <View style={styles.coinPill}>
                    <KarmaCoin size={12} />
                    <Text style={styles.coinValue}>+{item.coins}</Text>
                  </View>

                  {qty === 0 ? (
                    <TouchableOpacity style={styles.addBtn} onPress={() => updateQuantity(item.id, 1)}>
                      <Plus size={18} color="white" />
                      <Text style={styles.addBtnText}>ADD</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.qtyControl}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, -1)}>
                        <Minus size={16} color="#16a34a" />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{qty}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, 1)}>
                        <Plus size={16} color="#16a34a" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating Cart Summary directly over the view */}
      {cartCalculations.totalItems > 0 && (
        <View style={styles.floatingCart}>
          <View style={styles.cartInfo}>
            <Text style={styles.cartItemText}>{cartCalculations.totalItems} Items Added</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Text style={styles.cartRewardText}>Est. Reward: +{cartCalculations.totalCoins}</Text>
              <KarmaCoin size={12} />
            </View>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={() => setCurrentStep(2)}>
            <Text style={styles.checkoutBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // --- Render Step 2: Date & Details ---
  const renderDetailsStep = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Date */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionNum}><Text style={styles.sectionNumText}>2</Text></View>
        <Text style={styles.sectionTitle}>Choose Pickup Date</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroller}>
        {DATES.map((item) => {
          const isSelected = selectedDate === item.fullDate;
          return (
            <TouchableOpacity key={item.fullDate} style={[styles.dateBox, isSelected && styles.dateBoxSelected]} onPress={() => setSelectedDate(item.fullDate)}>
              <Text style={[styles.dateDay, isSelected && styles.dateDaySelected]}>{item.day}</Text>
              <Text style={[styles.dateNum, isSelected && styles.dateNumSelected]}>{item.num}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Time */}
      <View style={[styles.sectionHeader, { marginTop: 8 }]}>
        <View style={styles.sectionNum}><Text style={styles.sectionNumText}>3</Text></View>
        <Text style={styles.sectionTitle}>Choose Time Slot</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeScroller}>
        {TIMES.map((time) => {
          const isSelected = selectedTime === time;
          return (
            <TouchableOpacity key={time} style={[styles.timeBox, isSelected && styles.timeBoxSelected]} onPress={() => setSelectedTime(time)}>
              <Text style={[styles.timeText, isSelected && styles.timeTextSelected]}>{time}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Address */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionNum}><Text style={styles.sectionNumText}>4</Text></View>
        <Text style={styles.sectionTitle}>Confirm Address</Text>
      </View>
      <View style={styles.addressCard}>
        <View style={styles.addressLeftRow}>
          <View style={styles.addressIconBg}><MapPin size={20} color="#16a34a" /></View>
          <View>
            <View style={styles.homeLabelRow}>
              <Text style={styles.homeLabelText}>Home</Text>
              <View style={styles.defaultTag}><Text style={styles.defaultTagText}>Default</Text></View>
            </View>
            <Text style={styles.addressValue}>42, Green Park Colony, Sector 14</Text>
            <Text style={styles.addressValue}>Gurugram, Haryana - 122001</Text>
          </View>
        </View>
        <Text style={styles.changeText}>Change</Text>
      </View>

      {/* Estimates Box based on Cart */}
      <View style={styles.estimatesBox}>
        <View style={{ flex: 1 }}>
          <Text style={styles.estimateLabel}>Estimated Earnings</Text>
          <View style={styles.estimateValueRow}>
            <KarmaCoin size={24} />
            <Text style={styles.estimateValue}>+{cartCalculations.totalCoins}</Text>
          </View>
          <Text style={styles.estimateNote}>For {cartCalculations.totalItems} items. Final value credited after verification.</Text>
        </View>
        <View style={styles.estimateBigCoin}><KarmaCoin size={60} glow /></View>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Special Instructions <Text style={{fontWeight: '400', fontSize: 13, color: '#9ca3af'}}>(optional)</Text></Text>
      <TextInput
        style={styles.inputBox}
        placeholder="E.g. Ring the bell twice, leave at the door..."
        placeholderTextColor="#9ca3af"
        value={instructions}
        onChangeText={setInstructions}
        multiline
      />

      <TouchableOpacity 
        style={[styles.submitBtn, isLoading && { opacity: 0.7 }]}
        onPress={handleConfirmPickup}
        disabled={isLoading}
      >
        {isLoading ? <CheckCircle2 size={20} color="transparent" /> : <CheckCircle2 size={20} color="white" />}
        <Text style={styles.submitBtnText}>{isLoading ? 'Scheduling...' : 'Confirm Pickup'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      <View style={styles.topNotchFiller} />
      
      {/* Dark Green Header Section */}
      <LinearGradient colors={['#064e3b', '#15803d']} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity 
              style={styles.backBtnInner} 
              onPress={() => {
                if (currentStep === 2) setCurrentStep(1);
                else navigation.goBack();
              }}
            >
              <ChevronLeft size={22} color="white" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Schedule Pickup</Text>
              <Text style={styles.headerSub}>Step {currentStep} of 2</Text>
            </View>
            <View style={{width: 36}}/>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Main Content Router */}
      {currentStep === 1 ? renderCatalogStep() : renderDetailsStep()}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  topNotchFiller: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, backgroundColor: '#064e3b' },
  header: { paddingBottom: 16, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, zIndex: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  backBtnInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: 'white', textAlign: 'center' },
  headerSub: { fontSize: 12, color: '#86efac', fontWeight: '700', textAlign: 'center', marginTop: 2, letterSpacing: 1 },

  stepContainer: { flex: 1 },
  filterSection: { paddingTop: 20, paddingBottom: 10 },
  filterList: { paddingHorizontal: 20, gap: 10 },
  filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, borderWidth: 1, borderColor: '#e4e4e7' },
  filterText: { fontSize: 13, color: '#52525b', fontWeight: '600' },
  filterChipActive: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100, elevation: 4 },
  filterTextActive: { fontSize: 13, color: 'white', fontWeight: '800' },

  gridContent: { paddingBottom: 120 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginTop: 10 },
  
  cardContainer: { width: CARD_WIDTH, backgroundColor: 'white', borderRadius: 24, marginBottom: 16, marginHorizontal: CARD_MARGIN, overflow: 'hidden', elevation: 2, borderWidth: 2, borderColor: 'transparent' },
  cardContainerActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  cardImageArea: { height: 100, width: '100%', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { padding: 14, flex: 1 },
  itemName: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  itemUnit: { fontSize: 12, color: '#71717a', fontWeight: '500', marginBottom: 8 },
  coinPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, gap: 4, marginBottom: 16 },
  coinValue: { fontSize: 12, fontWeight: '800', color: '#d97706' },
  
  addBtn: { backgroundColor: '#1e293b', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, gap: 4 },
  addBtnText: { color: 'white', fontSize: 12, fontWeight: '800' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#dcfce7', borderRadius: 10, padding: 4 },
  qtyBtn: { width: 32, height: 32, backgroundColor: 'white', borderRadius: 8, alignItems: 'center', justifyContent: 'center', elevation: 1 },
  qtyText: { fontSize: 15, fontWeight: '900', color: '#16a34a' },

  floatingCart: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#1e293b', borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  cartInfo: { flex: 1 },
  cartItemText: { color: 'white', fontSize: 15, fontWeight: '800', marginBottom: 2 },
  cartRewardText: { color: '#fbbf24', fontSize: 12, fontWeight: '700' },
  checkoutBtn: { backgroundColor: '#16a34a', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16 },
  checkoutBtnText: { color: 'white', fontWeight: '800', fontSize: 14 },

  /* Step 2 Details Styles */
  scrollContent: { padding: 20, paddingBottom: 60 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 12, gap: 10 },
  sectionNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  sectionNumText: { color: 'white', fontWeight: '800', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  
  dateScroller: { gap: 12, paddingBottom: 16, marginBottom: 10 },
  dateBox: { width: 64, height: 80, backgroundColor: 'white', borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 1, borderWidth: 2, borderColor: 'transparent' },
  dateBoxSelected: { backgroundColor: '#166534', borderColor: '#166534' },
  dateDay: { fontSize: 13, color: '#64748b', fontWeight: '700', marginBottom: 4 },
  dateDaySelected: { color: 'rgba(255,255,255,0.7)' },
  dateNum: { fontSize: 24, color: '#0f172a', fontWeight: '800' },
  dateNumSelected: { color: 'white' },

  timeScroller: { gap: 12, paddingBottom: 16, marginBottom: 10 },
  timeBox: { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: 'white', borderRadius: 12, elevation: 1, borderWidth: 2, borderColor: 'transparent' },
  timeBoxSelected: { backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
  timeText: { fontSize: 13, color: '#64748b', fontWeight: '700' },
  timeTextSelected: { color: '#16a34a', fontWeight: '800' },

  addressCard: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', backgroundColor: 'white', padding: 16, borderRadius: 16, elevation: 1, marginBottom: 24 },
  addressLeftRow: { flexDirection: 'row', flex: 1, gap: 12 },
  addressIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  homeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  homeLabelText: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  defaultTag: { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  defaultTagText: { fontSize: 10, color: '#16a34a', fontWeight: '700' },
  addressValue: { fontSize: 13, color: '#64748b', fontWeight: '500', lineHeight: 20 },
  changeText: { color: '#16a34a', fontSize: 13, fontWeight: '700', marginTop: 4 },

  estimatesBox: { backgroundColor: '#fffbeb', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#fde68a' },
  estimateLabel: { fontSize: 12, color: '#b45309', fontWeight: '700', marginBottom: 8 },
  estimateValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  estimateValue: { fontSize: 28, fontWeight: '900', color: '#d97706' },
  estimateNote: { fontSize: 11, color: '#d97706', opacity: 0.8, fontWeight: '600', lineHeight: 16 },
  estimateBigCoin: { opacity: 0.8 },

  inputBox: { backgroundColor: 'white', borderRadius: 16, padding: 16, height: 100, textAlignVertical: 'top', color: '#0f172a', fontWeight: '500', marginTop: 12, marginBottom: 24, elevation: 1 },
  submitBtn: { backgroundColor: '#15803d', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 16, gap: 10, elevation: 4 },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: '900' },

  successContainer: { flex: 1, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#16a34a', marginTop: 24, marginBottom: 8 },
  successSub: { fontSize: 16, color: '#15803d', fontWeight: '600' },
});
