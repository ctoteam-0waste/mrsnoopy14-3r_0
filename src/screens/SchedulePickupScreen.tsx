import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Image, Animated, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from '../utils/alert';
import { showRedeemInfoOnce } from '../utils/redeemInfo';
import { getStableUserSuffix } from '../utils/userId';
import { AddressSearch, AddressDetails } from '../components/shared/AddressSearch';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, MapPin, CheckCircle2, PackageOpen, Plus, FileText, Magnet, Droplets, Wine, Smartphone } from 'lucide-react-native';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { LinearGradient } from 'expo-linear-gradient';
import { CupSoda, ShoppingBag, Archive, Newspaper as NewsIcon, BookOpen, Database, Cog, Utensils, Activity, Laptop, Cable, Tv, Battery, Shirt, Fan, AirVent, WashingMachine, Refrigerator, Flame, Home as HomeIcon, Briefcase } from 'lucide-react-native';
import { addressService, SavedAddress, AddressLabel } from '../services/address';
import { bookingService } from '../services/booking';
import * as Location from 'expo-location';
import { SCREEN_WIDTH as width } from '../utils/layout';

const CARD_MARGIN = 8;
const COLS = Platform.OS === 'web' && width > 768 ? 4 : 2;
const CARD_WIDTH = (Math.min(width, 900) - 40 - (CARD_MARGIN * 2 * COLS)) / COLS;

// Waste catalogue — 10 categories. category/subCategory strings are sent to the
// backend exactly as written here and are matched there by exact string
// (booking.service.js), so renaming anything here breaks booking + verify.
// name is what the user sees; backendName is the enum value the booking API
// accepts (renaming those requires a backend change first).
const CATEGORIES = [
  { id: '5', name: 'Appliances & TV', backendName: 'Home Appliances & Electronics', color: '#8b5cf6', icon: Tv },
  { id: '1', name: 'E-Waste (Phones & Computers)', backendName: 'Phones & Computers', color: '#0ea5e9', icon: Smartphone },
  { id: '2', name: 'Mixed E-Waste', backendName: 'Mixed E-Waste', color: '#14b8a6', icon: Cable },
  { id: '9', name: 'Plastic', backendName: 'Plastic', color: '#3b82f6', icon: Droplets },
  { id: '4', name: 'Paper', backendName: 'Paper', color: '#84cc16', icon: FileText },
  { id: '8', name: 'Metal', backendName: 'Metals', color: '#64748b', icon: Magnet },
  { id: '3', name: 'Glass', backendName: 'Glass', color: '#10b981', icon: Wine },
  { id: '6', name: 'Batteries', backendName: 'Batteries', color: '#ef4444', icon: Battery },
  { id: '7', name: 'Shoes', backendName: 'Footwear', color: '#f59e0b', icon: ShoppingBag },
  { id: '10', name: 'Textile Waste', backendName: 'Textile Waste', color: '#ec4899', icon: Shirt },
];

const ADDRESS_LABEL_ICONS: Record<string, any> = { Home: HomeIcon, Work: Briefcase, Other: MapPin };

const CONDITIONS = ['Working', 'Not Working'] as const;
type Condition = typeof CONDITIONS[number];

type CatalogueItem = {
  id: string;
  catId: string;
  subCategory: string;             // exact backend name
  unit: 'kg' | 'piece';
  coins?: number;                  // items without a condition dropdown
  coinsWorking?: number;           // condition items
  coinsNotWorking?: number;        // condition items
  hasCondition?: boolean;
  minQty?: number;                 // in `unit` terms — e.g. Battery = 1 kg
  itemIcon: any;
  // Real product photo. Accepts a local require(...) or a { uri } remote image.
  // When absent, the card falls back to itemIcon.
  image?: any;
};

// Items with a Working / Not Working dropdown carry coinsWorking + coinsNotWorking.
// Everything else carries a single coins value. Broken glass is not accepted, so
// it is intentionally left out of the catalogue.
// `image` (optional) shows a real product photo; when absent the card uses itemIcon.
const ALL_ITEMS: CatalogueItem[] = [
  // 1. Phones & Computers (piece, condition)
  { id: 'pc1', catId: '1', subCategory: 'Laptop', unit: 'piece', hasCondition: true, coinsWorking: 10000, coinsNotWorking: 3000, itemIcon: Laptop, image: require('../../assets/catalogue/laptop.jpg') },
  { id: 'pc2', catId: '1', subCategory: 'Desktop', unit: 'piece', hasCondition: true, coinsWorking: 2000, coinsNotWorking: 1000, itemIcon: Cog, image: require('../../assets/catalogue/desktop.jpg') },
  { id: 'pc3', catId: '1', subCategory: 'Monitor (LCD/LED)', unit: 'piece', hasCondition: true, coinsWorking: 4000, coinsNotWorking: 1000, itemIcon: Tv, image: require('../../assets/catalogue/monitor.jpg') },
  { id: 'pc4', catId: '1', subCategory: 'Printer', unit: 'piece', hasCondition: true, coinsWorking: 6000, coinsNotWorking: 1000, itemIcon: Archive, image: require('../../assets/catalogue/printer.jpg') },
  { id: 'pc5', catId: '1', subCategory: 'Tablet', unit: 'piece', hasCondition: true, coinsWorking: 2000, coinsNotWorking: 1000, itemIcon: Smartphone, image: require('../../assets/catalogue/tablet.jpg') },
  { id: 'pc6', catId: '1', subCategory: 'Branded Smartphone', unit: 'piece', hasCondition: true, coinsWorking: 10000, coinsNotWorking: 1000, itemIcon: Smartphone, image: require('../../assets/catalogue/branded-smartphone.jpg') },
  { id: 'pc7', catId: '1', subCategory: 'Non-Branded Smartphone', unit: 'piece', hasCondition: true, coinsWorking: 5000, coinsNotWorking: 1000, itemIcon: Smartphone, image: require('../../assets/catalogue/non-branded-smartphone.jpg') },
  { id: 'pc8', catId: '1', subCategory: 'Keyboard', unit: 'piece', hasCondition: true, coinsWorking: 100, coinsNotWorking: 50, itemIcon: Cable, image: require('../../assets/catalogue/keyboard.jpg') },
  { id: 'pc9', catId: '1', subCategory: 'Mouse', unit: 'piece', hasCondition: true, coinsWorking: 100, coinsNotWorking: 10, itemIcon: Cable, image: require('../../assets/catalogue/mouse.jpg') },
  { id: 'pc10', catId: '1', subCategory: 'Touchpad Phone', unit: 'piece', hasCondition: true, coinsWorking: 200, coinsNotWorking: 100, itemIcon: Smartphone, image: require('../../assets/catalogue/touchpad-phone.jpg') },

  // 2. Mixed E-Waste (kg)
  { id: 'me1', catId: '2', subCategory: 'Mixed E-waste', unit: 'kg', coins: 200, itemIcon: Cable, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Keyboards_and_mice_in_pile_of_ewaste.jpg/500px-Keyboards_and_mice_in_pile_of_ewaste.jpg' } },

  // 3. Glass (kg) — Broken Glass is not accepted, so it is omitted
  { id: 'gl1', catId: '3', subCategory: 'Beer Bottles', unit: 'kg', coins: 20, itemIcon: Wine, image: require('../../assets/catalogue/beer-bottles.jpg') },
  { id: 'gl2', catId: '3', subCategory: 'Soft Drink Bottles', unit: 'kg', coins: 20, itemIcon: CupSoda, image: require('../../assets/catalogue/soft-drink-bottles.jpg') },
  { id: 'gl3', catId: '3', subCategory: 'Wine Bottles', unit: 'kg', coins: 20, itemIcon: Wine, image: require('../../assets/catalogue/wine-bottles.jpg') },
  { id: 'gl4', catId: '3', subCategory: 'Glass Jars', unit: 'kg', coins: 20, itemIcon: Archive, image: require('../../assets/catalogue/glass-jars.jpg') },
  { id: 'gl5', catId: '3', subCategory: 'Other Glass', unit: 'kg', coins: 10, itemIcon: Wine, image: require('../../assets/catalogue/other-glass.jpg') },

  // 4. Paper (kg)
  { id: 'pa1', catId: '4', subCategory: 'Newspapers', unit: 'kg', coins: 100, itemIcon: NewsIcon, image: require('../../assets/catalogue/newspapers.jpg') },
  { id: 'pa2', catId: '4', subCategory: 'Cardboard', unit: 'kg', coins: 80, itemIcon: PackageOpen, image: require('../../assets/catalogue/cardboard.jpg') },
  { id: 'pa3', catId: '4', subCategory: 'Magazines / Books', unit: 'kg', coins: 80, itemIcon: BookOpen, image: require('../../assets/catalogue/magazines-books.jpg') },
  { id: 'pa4', catId: '4', subCategory: 'Other Paper', unit: 'kg', coins: 40, itemIcon: FileText, image: require('../../assets/catalogue/other-paper.jpg') },

  // 5. Home Appliances & Electronics (piece, condition)
  { id: 'ap1', catId: '5', subCategory: 'TV (Below 40")', unit: 'piece', hasCondition: true, coinsWorking: 10000, coinsNotWorking: 2000, itemIcon: Tv, image: require('../../assets/catalogue/tv-below-40.jpg') },
  { id: 'ap2', catId: '5', subCategory: 'TV (40" & Above)', unit: 'piece', hasCondition: true, coinsWorking: 20000, coinsNotWorking: 2500, itemIcon: Tv, image: require('../../assets/catalogue/tv-above-40.jpg') },
  { id: 'ap3', catId: '5', subCategory: 'Refrigerator (Above 300L)', unit: 'piece', hasCondition: true, coinsWorking: 20000, coinsNotWorking: 5000, itemIcon: Refrigerator, image: require('../../assets/catalogue/fridge-above-300l.jpg') },
  { id: 'ap4', catId: '5', subCategory: 'Refrigerator (Below 300L)', unit: 'piece', hasCondition: true, coinsWorking: 15000, coinsNotWorking: 2500, itemIcon: Refrigerator, image: require('../../assets/catalogue/fridge-below-300l.jpg') },
  { id: 'ap5', catId: '5', subCategory: 'Automatic Washing Machine', unit: 'piece', hasCondition: true, coinsWorking: 10000, coinsNotWorking: 2000, itemIcon: WashingMachine, image: require('../../assets/catalogue/automatic-washing-machine.jpg') },
  { id: 'ap6', catId: '5', subCategory: 'Semi-Automatic Washing Machine', unit: 'piece', hasCondition: true, coinsWorking: 8000, coinsNotWorking: 1500, itemIcon: WashingMachine, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/A_collection_of_washing_machines_in_a_laundry_shop.jpg/500px-A_collection_of_washing_machines_in_a_laundry_shop.jpg' } },
  { id: 'ap7', catId: '5', subCategory: 'Branded Air Conditioner', unit: 'piece', hasCondition: true, coinsWorking: 80000, coinsNotWorking: 10000, itemIcon: AirVent, image: require('../../assets/catalogue/branded-ac.jpg') },
  { id: 'ap8', catId: '5', subCategory: 'Geyser', unit: 'piece', hasCondition: true, coinsWorking: 10000, coinsNotWorking: 1000, itemIcon: Flame, image: require('../../assets/catalogue/geyser.jpg') },
  { id: 'ap9', catId: '5', subCategory: 'Ceiling Fan', unit: 'piece', hasCondition: true, coinsWorking: 5000, coinsNotWorking: 1050, itemIcon: Fan, image: require('../../assets/catalogue/ceiling-fan.jpg') },
  { id: 'ap10', catId: '5', subCategory: 'Other Large Appliances', unit: 'piece', hasCondition: true, coinsWorking: 15000, coinsNotWorking: 2500, itemIcon: Cog, image: require('../../assets/catalogue/other-large-appliances.jpg') },

  // 6. Batteries (kg) — minimum 1 kg
  { id: 'ba1', catId: '6', subCategory: 'Battery', unit: 'kg', coins: 200, minQty: 1, itemIcon: Battery, image: require('../../assets/catalogue/battery.jpg') },

  // 7. Footwear (piece)
  { id: 'sh1', catId: '7', subCategory: 'Branded', unit: 'piece', coins: 2000, itemIcon: ShoppingBag, image: require('../../assets/catalogue/branded-shoes.jpg') },
  { id: 'sh2', catId: '7', subCategory: 'Non-Branded', unit: 'piece', coins: 500, itemIcon: ShoppingBag, image: require('../../assets/catalogue/non-branded-shoes.jpg') },

  // 8. Metals (kg)
  { id: 'mt1', catId: '8', subCategory: 'Aluminium', unit: 'kg', coins: 500, itemIcon: Database, image: require('../../assets/catalogue/aluminium.jpg') },
  { id: 'mt2', catId: '8', subCategory: 'Copper Wire', unit: 'kg', coins: 800, itemIcon: Activity, image: require('../../assets/catalogue/copper-wire.jpg') },
  { id: 'mt3', catId: '8', subCategory: 'Iron', unit: 'kg', coins: 100, itemIcon: Cog, image: require('../../assets/catalogue/iron.jpg') },
  { id: 'mt4', catId: '8', subCategory: 'Steel/Utensils', unit: 'kg', coins: 100, itemIcon: Utensils, image: require('../../assets/catalogue/steel-utensils.jpg') },
  { id: 'mt5', catId: '8', subCategory: 'Other Metals', unit: 'kg', coins: 100, itemIcon: Magnet, image: require('../../assets/catalogue/other-metals.jpg') },

  // 9. Plastic (kg)
  { id: 'pl1', catId: '9', subCategory: 'PET Bottles', unit: 'kg', coins: 100, itemIcon: CupSoda, image: require('../../assets/catalogue/pet-bottles.jpg') },
  { id: 'pl2', catId: '9', subCategory: 'Hard Plastic (HDPE/PP)', unit: 'kg', coins: 150, itemIcon: Archive, image: require('../../assets/catalogue/hard-plastic.jpg') },
  { id: 'pl5', catId: '9', subCategory: 'LDPE', unit: 'kg', coins: 200, itemIcon: Droplets, image: require('../../assets/catalogue/ldpe.jpg') },
  { id: 'pl3', catId: '9', subCategory: 'Thermocol', unit: 'kg', coins: 30, itemIcon: PackageOpen, image: require('../../assets/catalogue/thermocol.jpg') },
  { id: 'pl4', catId: '9', subCategory: 'Other Plastic', unit: 'kg', coins: 10, itemIcon: Droplets, image: require('../../assets/catalogue/other-plastic.jpg') },

  // 10. Textile Waste (kg) — per-item rates pending exact confirmation from backend
  { id: 'tx1', catId: '10', subCategory: 'Grade 1 Clothing', unit: 'kg', coins: 500, itemIcon: Shirt, image: require('../../assets/catalogue/grade-1-clothing.jpg') },
  { id: 'tx2', catId: '10', subCategory: 'Grade 2 Clothing', unit: 'kg', coins: 200, itemIcon: Shirt, image: require('../../assets/catalogue/grade-2-clothing.jpg') },
  { id: 'tx3', catId: '10', subCategory: 'Jeans', unit: 'kg', coins: 300, itemIcon: Shirt },
  { id: 'tx4', catId: '10', subCategory: 'Premium Sarees', unit: 'kg', coins: 500, itemIcon: Shirt, image: require('../../assets/catalogue/premium-sarees.jpg') },
  { id: 'tx5', catId: '10', subCategory: 'Non-Premium Sarees', unit: 'kg', coins: 200, itemIcon: Shirt, image: require('../../assets/catalogue/non-premium-sarees.jpg') },
  { id: 'tx6', catId: '10', subCategory: 'Cartons', unit: 'kg', coins: 50, itemIcon: PackageOpen },
  { id: 'tx7', catId: '10', subCategory: 'Other Textiles', unit: 'kg', coins: 50, itemIcon: Shirt, image: require('../../assets/catalogue/other-textiles.jpg') },
];

const unitLabel = (unit: string) => (unit === 'kg' ? 'per kg' : 'per piece');

// Working / Not Working switch. Tapping anywhere flips it; the thumb slides to
// the active side so the current condition is readable at a glance.
function ConditionToggle({ value, onChange }: { value: Condition; onChange: (c: Condition) => void }) {
  const isWorking = value === 'Working';
  const slide = useRef(new Animated.Value(isWorking ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: isWorking ? 0 : 1,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [isWorking, slide]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onChange(isWorking ? 'Not Working' : 'Working')}
      style={styles.toggleTrack}
      accessibilityRole="switch"
      accessibilityState={{ checked: isWorking }}
      accessibilityLabel={`Condition: ${value}`}
    >
      <Animated.View
        style={[
          styles.toggleThumb,
          {
            left: slide.interpolate({ inputRange: [0, 1], outputRange: ['2%', '50%'] }),
            backgroundColor: isWorking ? '#16a34a' : '#64748b',
          },
        ]}
      />
      <View style={styles.toggleHalf}>
        <Text style={[styles.toggleLabel, isWorking && styles.toggleLabelOn]}>Working</Text>
      </View>
      <View style={styles.toggleHalf}>
        <Text style={[styles.toggleLabel, !isWorking && styles.toggleLabelOn]}>Not Working</Text>
      </View>
    </TouchableOpacity>
  );
}

// A condition item stores each variant separately in the cart via a suffixed key.
const condSuffix = (c: Condition) => (c === 'Working' ? 'W' : 'N');
const makeCartKey = (item: CatalogueItem, cond: Condition) => (item.hasCondition ? `${item.id}__${condSuffix(cond)}` : item.id);
const parseCartKey = (key: string): { id: string; condition?: Condition } => {
  const [id, suf] = key.split('__');
  return { id, condition: suf === 'W' ? 'Working' : suf === 'N' ? 'Not Working' : undefined };
};
const rateFor = (item: CatalogueItem, condition?: Condition) =>
  item.hasCondition ? (condition === 'Not Working' ? item.coinsNotWorking || 0 : item.coinsWorking || 0) : item.coins || 0;

const generateDates = () => {
  const dates = [];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();
  // Include today only if before 6 PM, otherwise start from tomorrow
  const startFrom = now.getHours() < 18 ? 0 : 1;
  for (let i = startFrom; i <= startFrom + 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(9, 0, 0, 0);
    dates.push({
      dateObj: d,
      day: i === 0 ? 'Today' : days[d.getDay()],
      num: d.getDate().toString(),
      fullDate: d.toISOString()
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

// Shows the product photo; if it fails to load, falls back to the category icon.
function ItemImage({ image, Icon, color }: { image?: any; Icon: any; color: string }) {
  const [failed, setFailed] = useState(false);
  if (image && !failed) {
    return <Image source={image} style={styles.cardImage} resizeMode="contain" onError={() => setFailed(true)} />;
  }
  return <Icon size={46} color={color} strokeWidth={1.5} opacity={0.8} />;
}

export function SchedulePickupScreen({ navigation }: any) {
  // Step Management
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Cart State { cartKey: quantity } — cartKey encodes condition for dropdown items
  const [cart, setCart] = useState<Record<string, number>>({});
  // Selected Working / Not Working per condition item
  const [itemCondition, setItemCondition] = useState<Record<string, Condition>>({});

  // UI States
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [selectedDate, setSelectedDate] = useState(DATES[0].fullDate);
  const [selectedTime, setSelectedTime] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState<[number, number] | null>(null); // GPS — map centering only

  // Saved addresses (multi-address backend). Booking sends the SELECTED address,
  // not the GPS position.
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  // Address picked on the map but not yet saved — waiting for a label choice.
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Priority 1: Get real GPS coordinates from device
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserCoordinates([loc.coords.longitude, loc.coords.latitude]);
          console.log('[Location] GPS coordinates fetched:', [loc.coords.longitude, loc.coords.latitude]);
        }
      } catch (err) {
        console.log('[Location] GPS fetch failed:', err);
      }
    })();
  }, []);

  // Load saved addresses; keep the current selection if it still exists,
  // otherwise fall back to the default (or first) address.
  useFocusEffect(
    useCallback(() => {
      addressService.list().then(list => {
        setSavedAddresses(list);
        setSelectedAddressId(prev => {
          if (prev && list.some(a => a._id === prev)) return prev;
          const def = list.find(a => a.isDefault) || list[0];
          return def?._id ?? null;
        });
      }).catch(err => console.log('Failed to fetch addresses:', err));
    }, [])
  );

  // AddressSearch's own "Add address details" step collects and validates every
  // field — save directly from its result, no second form.
  const handleAddressPicked = async (details: AddressDetails) => {
    if (isSavingAddress) return;
    setIsSavingAddress(true);
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
      setSavedAddresses(list);
      // Select the address we just added (the API returns the whole array)
      const added = [...list].reverse().find(a => a.fullAddress === details.area) || list[list.length - 1];
      if (added) setSelectedAddressId(added._id);
    } catch (error: any) {
      showAlert('Could not save address', error?.response?.data?.message || 'Please try again.');
    } finally {
      setIsSavingAddress(false);
    }
  };

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
    
    Object.entries(cart).forEach(([key, qty]) => {
      const { id, condition } = parseCartKey(key);
      const item = ALL_ITEMS.find(i => i.id === id);
      if (item) {
        totalItems += qty;
        totalCoins += rateFor(item, condition) * qty;
      }
    });

    return { totalItems, totalCoins };
  }, [cart]);

  // Derived Grid Logic for Step 1
  const displayedItems = useMemo(() => ALL_ITEMS.filter(item => item.catId === activeCategory), [activeCategory]);
  const activeCatData = CATEGORIES.find(c => c.id === activeCategory);

  const handleConfirmPickup = async () => {
    console.log('[Confirm Pickup] Pressed! Cart:', cart);

    if (Object.keys(cart).length === 0) {
      showAlert("Empty cart", "Please add items to your cart first.");
      return;
    }

    if (!selectedTime) {
      showAlert("Time slot required", "Please select a pickup time slot.");
      return;
    }

    const selectedAddress = savedAddresses.find(a => a._id === selectedAddressId);
    if (!selectedAddress) {
      showAlert("Pickup address required", "Please add or select a pickup address below.");
      return;
    }

    // Booking uses the SELECTED address's coordinates; device GPS is only a
    // fallback for older saved addresses missing a location.
    const addrCoords = selectedAddress.location?.coordinates;
    const coords: [number, number] | null =
      addrCoords && addrCoords.length === 2 && addrCoords.every(n => typeof n === 'number' && !Number.isNaN(n))
        ? [addrCoords[0], addrCoords[1]]
        : userCoordinates;
    if (!coords) {
      showAlert("Location required", "This address has no location pin. Please re-add it, or allow location access.", [{ text: "OK" }]);
      return;
    }

    setIsLoading(true);
    try {
      // Structure the categories array — send category/subCategory exactly as in the
      // catalogue, and condition only for Working/Not Working items (never null).
      const payloadCategories: any[] = [];
      Object.keys(cart).forEach((key) => {
        const { id, condition } = parseCartKey(key);
        const item = ALL_ITEMS.find(i => i.id === id);
        if (!item) return;
        const categoryObj = CATEGORIES.find(c => c.id === item.catId);
        if (!categoryObj) return;
        const entry: any = { category: categoryObj.backendName, subCategory: item.subCategory };
        if (item.hasCondition && condition) entry.condition = condition;
        payloadCategories.push(entry);
      });

      const payload: any = {
        categories: payloadCategories,
        pickupDate: selectedDate,
        timeSlot: selectedTime,
        // Booking takes the full ad-hoc address object (not addressId)
        address: {
          fullAddress: selectedAddress.fullAddress,
          houseNo: selectedAddress.houseNo,
          apartment: selectedAddress.apartment,
          landmark: selectedAddress.landmark,
          receiverName: selectedAddress.receiverName,
          receiverPhone: selectedAddress.receiverPhone,
          location: {
            type: 'Point' as const,
            coordinates: coords
          }
        },
      };
      if (instructions.trim()) {
        payload.specialInstruction = instructions.trim();
      }

      const res = await bookingService.createBooking(payload);
      const createdBooking = res?.data || res;
      console.log('[Confirm Pickup] Created booking:', createdBooking);

      setIsSubmitted(true);
      const token = await AsyncStorage.getItem('userToken');
      showRedeemInfoOnce(`firstBookingRedeemInfo_${getStableUserSuffix(token)}`);
      setTimeout(() => navigation.replace('OrderTracking', { booking: createdBooking }), 2500);
    } catch (error: any) {
      showAlert(
        "Scheduling failed",
        error?.response?.data?.message || "Failed to schedule pickup. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Success View
  if (isSubmitted) {
    return (
      <View style={styles.successContainer}>
        <CheckCircle2 size={100} color="#16a34a" />
        <Text style={styles.successTitle}>Pickup scheduled!</Text>
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
                  <Text style={styles.filterTextActive}>{cat.name}</Text>
                </LinearGradient>
              );
            }
            return (
              <TouchableOpacity key={cat.id} style={styles.filterChip} onPress={() => setActiveCategory(cat.id)}>
                <Icon size={16} color="#64748b" style={{ marginRight: 6 }} />
                <Text style={styles.filterText}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.gridContent}>
        <View style={styles.gridContainer}>
          {displayedItems.map((item) => {
            const hasCond = !!item.hasCondition;
            const activeCond: Condition = itemCondition[item.id] || 'Working';
            const key = makeCartKey(item, activeCond);
            const qty = cart[key] || 0;
            const addedAny = hasCond
              ? ((cart[makeCartKey(item, 'Working')] || 0) + (cart[makeCartKey(item, 'Not Working')] || 0)) > 0
              : qty > 0;
            const CatIcon = item.itemIcon || activeCatData?.icon || PackageOpen;
            const catColor = activeCatData?.color || '#16a34a';

            return (
              <View key={item.id} style={[styles.cardContainer, addedAny && styles.cardContainerActive]}>
                <View style={[styles.cardImageArea, { backgroundColor: catColor + '15' }]}>
                  <ItemImage image={item.image} Icon={CatIcon} color={catColor} />
                </View>

                <View style={styles.cardInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.subCategory}</Text>
                  <Text style={styles.itemUnit}>{unitLabel(item.unit)}</Text>

                  {item.minQty ? (
                    <Text style={styles.minHint}>Minimum {item.minQty} {item.unit}</Text>
                  ) : null}

                  {hasCond && (
                    <ConditionToggle
                      value={activeCond}
                      onChange={(c) => setItemCondition(prev => ({ ...prev, [item.id]: c }))}
                    />
                  )}

                  <View style={styles.coinPill}>
                    <KarmaCoin size={12} />
                    <Text style={styles.coinValue}>+{rateFor(item, activeCond)}</Text>
                  </View>

                  {qty === 0 ? (
                    <TouchableOpacity style={styles.addBtn} onPress={() => updateQuantity(key, 1)}>
                      <Plus size={18} color="white" />
                      <Text style={styles.addBtnText}>ADD</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.addedBtn} onPress={() => updateQuantity(key, -qty)}>
                      <CheckCircle2 size={16} color="#16a34a" />
                      <Text style={styles.addedBtnText}>ADDED</Text>
                    </TouchableOpacity>
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
            <Text style={styles.cartItemText}>{cartCalculations.totalItems} items added</Text>
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Date */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionNum}><Text style={styles.sectionNumText}>2</Text></View>
        <Text style={styles.sectionTitle}>Choose pickup date</Text>
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
        <Text style={styles.sectionTitle}>Choose time slot</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeScroller}>
        {TIMES.filter((time) => {
          const selectedDay = new Date(selectedDate).toDateString();
          const today = new Date().toDateString();
          if (selectedDay !== today) return true;
          // Hide past slots for today
          const startHourStr = time.split(' - ')[0];
          const [hhmm, period] = [startHourStr.split(':')[0], startHourStr.split(' ')[1]];
          let slotHour = parseInt(hhmm);
          if (period === 'PM' && slotHour !== 12) slotHour += 12;
          return slotHour > new Date().getHours();
        }).map((time) => {
          const isSelected = selectedTime === time;
          return (
            <TouchableOpacity key={time} style={[styles.timeBox, isSelected && styles.timeBoxSelected]} onPress={() => setSelectedTime(time)}>
              <Text style={[styles.timeText, isSelected && styles.timeTextSelected]}>{time}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Address — saved-address picker (Flipkart style) */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionNum}><Text style={styles.sectionNumText}>4</Text></View>
        <Text style={styles.sectionTitle}>Select address</Text>
      </View>

      {savedAddresses.map(addr => {
        const on = addr._id === selectedAddressId;
        const LabelIcon = ADDRESS_LABEL_ICONS[addr.label] || MapPin;
        return (
          <TouchableOpacity
            key={addr._id}
            style={[styles.addrRow, on && styles.addrRowOn]}
            onPress={() => setSelectedAddressId(addr._id)}
            activeOpacity={0.8}
          >
            <View style={[styles.addrRadio, on && styles.addrRadioOn]}>
              {on && <View style={styles.addrRadioDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.addrLabelRow}>
                <LabelIcon size={13} color={on ? '#15803d' : '#64748b'} />
                <Text style={[styles.addrLabel, on && { color: '#15803d' }]}>{addr.label}</Text>
                {addr.isDefault && (
                  <View style={styles.addrDefaultTag}><Text style={styles.addrDefaultTagText}>Default</Text></View>
                )}
              </View>
              <Text style={styles.addrText} numberOfLines={2}>
                {[addr.houseNo, addr.apartment, addr.fullAddress].filter(Boolean).join(', ')}
              </Text>
              {!!addr.receiverName && (
                <Text style={styles.addrReceiver}>{addr.receiverName} · {addr.receiverPhone}</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      {savedAddresses.length === 0 && !isSavingAddress && (
        <Text style={styles.addrEmpty}>No saved addresses yet — add your first one below.</Text>
      )}

      {isSavingAddress ? (
        <View style={styles.addrAddBtn}>
          <ActivityIndicator size="small" color="#15803d" />
          <Text style={styles.addrAddText}>Saving address...</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.addrAddBtn} onPress={() => setIsAddingAddress(true)} activeOpacity={0.8}>
          <Plus size={16} color="#15803d" />
          <Text style={styles.addrAddText}>Add new address</Text>
        </TouchableOpacity>
      )}

      <AddressSearch
        visible={isAddingAddress}
        userCoords={userCoordinates}
        onSelect={(_address, _coords, details) => {
          setIsAddingAddress(false);
          if (details) handleAddressPicked(details);
        }}
        onCancel={() => setIsAddingAddress(false)}
      />

      {/* Estimates Box based on Cart */}
      <View style={styles.estimatesBox}>
        <View style={{ flex: 1 }}>
          <Text style={styles.estimateLabel}>Estimated earnings</Text>
          <View style={styles.estimateValueRow}>
            <KarmaCoin size={24} />
            <Text style={styles.estimateValue}>+{cartCalculations.totalCoins}</Text>
          </View>
          <Text style={styles.estimateNote}>For {cartCalculations.totalItems} items. Final value credited after verification.</Text>
        </View>
        <View style={styles.estimateBigCoin}><KarmaCoin size={60} glow /></View>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Special instructions <Text style={{fontWeight: '400', fontSize: 13, color: '#9ca3af'}}>(optional)</Text></Text>
      <TextInput
        style={[styles.inputBox, { color: '#0f172a' }]}
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
        <Text style={styles.submitBtnText}>{isLoading ? 'Scheduling...' : 'Confirm pickup'}</Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
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
              <Text style={styles.headerTitle}>Schedule pickup</Text>
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
  topNotchFiller: { position: 'absolute', top: 0, left: 0, right: 0, height: 60, backgroundColor: '#064e3b' },
  header: { paddingBottom: 16, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, zIndex: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  backBtnInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: 'white', textAlign: 'center' },
  headerSub: { fontSize: 12, color: '#86efac', fontWeight: '700', textAlign: 'center', marginTop: 2, letterSpacing: 1 },

  stepContainer: { flex: 1 },
  filterSection: { paddingTop: 20, paddingBottom: 10, maxWidth: 900, width: '100%', alignSelf: 'center' },
  filterList: { paddingHorizontal: 20, gap: 10 },
  filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, borderWidth: 1, borderColor: '#e4e4e7' },
  filterText: { fontSize: 13, color: '#52525b', fontWeight: '600' },
  filterChipActive: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100, elevation: 4 },
  filterTextActive: { fontSize: 13, color: 'white', fontWeight: '800' },

  gridContent: { paddingBottom: 120, maxWidth: 900, width: '100%', alignSelf: 'center' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginTop: 10, maxWidth: 900, alignSelf: 'center', width: '100%', justifyContent: 'center' },
  
  cardContainer: { width: CARD_WIDTH, backgroundColor: 'white', borderRadius: 18, marginBottom: 10, marginHorizontal: CARD_MARGIN, overflow: 'hidden', elevation: 2, borderWidth: 2, borderColor: 'transparent' },
  cardContainerActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  cardImageArea: { height: 92, width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#f8fafc', padding: 10 },
  cardImage: { width: '100%', height: '100%' },
  cardInfo: { padding: 10, flex: 1 },
  // Fixed two-line block so a one-line name and a wrapping one push the toggle,
  // rate and button down by the same amount — cards stay aligned across the grid.
  itemName: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 2, lineHeight: 19, height: 38 },
  itemUnit: { fontSize: 12, color: '#71717a', fontWeight: '500', marginBottom: 8 },
  coinPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, gap: 4, marginBottom: 16 },
  coinValue: { fontSize: 12, fontWeight: '800', color: '#d97706' },
  minHint: { fontSize: 11, color: '#dc2626', fontWeight: '700', marginBottom: 8 },
  toggleTrack: {
    flexDirection: 'row', height: 28, borderRadius: 14, marginBottom: 10,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e4e4e7',
    position: 'relative', overflow: 'hidden',
  },
  toggleThumb: { position: 'absolute', top: 2, bottom: 2, width: '48%', borderRadius: 12 },
  toggleHalf: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toggleLabel: { fontSize: 9.5, fontWeight: '800', color: '#71717a' },
  toggleLabelOn: { color: '#ffffff' },
  
  // `marginTop: auto` pins the button to the bottom of the card, so buttons line
  // up across a row even when the content above differs in height. Both states
  // share the same height/radius so a card doesn't shift when it's added.
  addBtn: { marginTop: 'auto', backgroundColor: '#1e293b', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 32, borderRadius: 10, gap: 4, borderWidth: 1, borderColor: 'transparent' },
  addBtnText: { color: 'white', fontSize: 11, fontWeight: '800' },
  addedBtn: { marginTop: 'auto', backgroundColor: '#dcfce7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 32, borderRadius: 10, gap: 4, borderWidth: 1, borderColor: '#16a34a' },
  addedBtnText: { color: '#16a34a', fontSize: 12, fontWeight: '800' },

  floatingCart: { position: 'absolute', bottom: 30, left: 20, right: 20, maxWidth: 860, marginHorizontal: 'auto', backgroundColor: '#1e293b', borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  cartInfo: { flex: 1 },
  cartItemText: { color: 'white', fontSize: 15, fontWeight: '800', marginBottom: 2 },
  cartRewardText: { color: '#fbbf24', fontSize: 12, fontWeight: '700' },
  checkoutBtn: { backgroundColor: '#16a34a', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16 },
  checkoutBtnText: { color: 'white', fontWeight: '800', fontSize: 14 },

  /* Step 2 Details Styles */
  scrollContent: { padding: 20, paddingBottom: 80, backgroundColor: '#f4f4f5', maxWidth: 900, width: '100%', alignSelf: 'center' },
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

  // Saved-address picker
  addrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: 'white', padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: '#f1f5f9', marginBottom: 10 },
  addrRowOn: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  addrRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  addrRadioOn: { borderColor: '#16a34a' },
  addrRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16a34a' },
  addrLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  addrLabel: { fontSize: 13, fontWeight: '800', color: '#334155' },
  addrDefaultTag: { backgroundColor: '#dcfce7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100, marginLeft: 4 },
  addrDefaultTagText: { fontSize: 9, fontWeight: '800', color: '#15803d', letterSpacing: 0.4 },
  addrText: { fontSize: 12.5, color: '#64748b', fontWeight: '500', lineHeight: 18 },
  addrReceiver: { fontSize: 11.5, color: '#94a3b8', fontWeight: '600', marginTop: 3 },
  addrEmpty: { fontSize: 13, color: '#94a3b8', fontWeight: '500', marginBottom: 10, marginLeft: 4 },
  addrAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: '#bbf7d0', borderStyle: 'dashed', backgroundColor: '#f0fdf4', paddingVertical: 12, borderRadius: 16, marginBottom: 24 },
  addrAddText: { color: '#15803d', fontSize: 14, fontWeight: '800' },

  estimatesBox: { backgroundColor: '#fffbeb', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#fde68a' },
  estimateLabel: { fontSize: 12, color: '#b45309', fontWeight: '700', marginBottom: 8 },
  estimateValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  estimateValue: { fontSize: 28, fontWeight: '900', color: '#d97706' },
  estimateNote: { fontSize: 11, color: '#d97706', opacity: 0.8, fontWeight: '600', lineHeight: 16 },
  estimateBigCoin: { opacity: 0.8 },

  inputBox: { backgroundColor: 'white', borderRadius: 16, padding: 16, height: 100, textAlignVertical: 'top', color: '#0f172a', fontSize: 14, fontWeight: '500', marginTop: 12, marginBottom: 24, elevation: 1, borderWidth: 1, borderColor: '#e2e8f0' },
  submitBtn: { backgroundColor: '#15803d', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 16, gap: 10, elevation: 4 },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: '900' },

  successContainer: { flex: 1, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#16a34a', marginTop: 24, marginBottom: 8 },
  successSub: { fontSize: 16, color: '#15803d', fontWeight: '600' },
});
