import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from '../utils/alert';
import { showRedeemInfoOnce } from '../utils/redeemInfo';
import { getStableUserSuffix } from '../utils/userId';
import { AddressSearch } from '../components/shared/AddressSearch';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, MapPin, CheckCircle2, PackageOpen, Plus, FileText, Magnet, Droplets, Wine, Smartphone } from 'lucide-react-native';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { LinearGradient } from 'expo-linear-gradient';
import { CupSoda, ShoppingBag, Archive, Newspaper as NewsIcon, BookOpen, Database, Cog, Utensils, Activity, Laptop, Cable, Tv, Battery } from 'lucide-react-native';
import { bookingService } from '../services/booking';
import { profileService } from '../services/profile';
import * as Location from 'expo-location';
import { SCREEN_WIDTH as width } from '../utils/layout';

const CARD_MARGIN = 8;
const COLS = Platform.OS === 'web' && width > 768 ? 4 : 2;
const CARD_WIDTH = (Math.min(width, 900) - 40 - (CARD_MARGIN * 2 * COLS)) / COLS;

// Waste catalogue — 9 categories. category/subCategory strings are sent to the
// backend exactly as written here (Title Case, matched by exact string).
const CATEGORIES = [
  { id: '1', name: 'Phones & Computers', color: '#0ea5e9', icon: Smartphone },
  { id: '2', name: 'Mixed e-waste', color: '#14b8a6', icon: Cable },
  { id: '3', name: 'Glass', color: '#10b981', icon: Wine },
  { id: '4', name: 'Paper', color: '#84cc16', icon: FileText },
  { id: '5', name: 'Appliances & TV', color: '#8b5cf6', icon: Tv },
  { id: '6', name: 'Batteries', color: '#ef4444', icon: Battery },
  { id: '7', name: 'Shoes', color: '#f59e0b', icon: ShoppingBag },
  { id: '8', name: 'Metal', color: '#64748b', icon: Magnet },
  { id: '9', name: 'Plastic', color: '#3b82f6', icon: Droplets },
];

const CONDITIONS = ['Working', 'Not Working'] as const;
type Condition = typeof CONDITIONS[number];

type CatalogueItem = {
  id: string;
  catId: string;
  subCategory: string;             // exact backend name
  unit: 'kg' | 'piece' | 'pickup';
  coins?: number;                  // items without a condition dropdown
  coinsWorking?: number;           // condition items
  coinsNotWorking?: number;        // condition items
  hasCondition?: boolean;
  minQty?: number;                 // e.g. Battery pickup = 10
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
  { id: 'pc1', catId: '1', subCategory: 'Laptop', unit: 'piece', hasCondition: true, coinsWorking: 1000, coinsNotWorking: 300, itemIcon: Laptop, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Lenovo_G500s_laptop-2905.jpg/500px-Lenovo_G500s_laptop-2905.jpg' } },
  { id: 'pc2', catId: '1', subCategory: 'Desktop', unit: 'piece', hasCondition: true, coinsWorking: 200, coinsNotWorking: 100, itemIcon: Cog, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/HP_ProDesk_600_G1_Tower_PC-001.jpg/500px-HP_ProDesk_600_G1_Tower_PC-001.jpg' } },
  { id: 'pc3', catId: '1', subCategory: 'Monitor (LCD/LED)', unit: 'piece', hasCondition: true, coinsWorking: 400, coinsNotWorking: 100, itemIcon: Tv, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Dell_Professional_P2212H-9899_%28cropped%29.jpg/500px-Dell_Professional_P2212H-9899_%28cropped%29.jpg' } },
  { id: 'pc4', catId: '1', subCategory: 'Printer', unit: 'piece', hasCondition: true, coinsWorking: 600, coinsNotWorking: 100, itemIcon: Archive, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/HP_Deskjet_All_in_One_Printer.jpg/500px-HP_Deskjet_All_in_One_Printer.jpg' } },
  { id: 'pc5', catId: '1', subCategory: 'Tablet', unit: 'piece', hasCondition: true, coinsWorking: 200, coinsNotWorking: 100, itemIcon: Smartphone, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Samsung_Galaxy_Tab_A9%2B_tablet.jpg/500px-Samsung_Galaxy_Tab_A9%2B_tablet.jpg' } },
  { id: 'pc6', catId: '1', subCategory: 'Smartphone-branded', unit: 'piece', hasCondition: true, coinsWorking: 1000, coinsNotWorking: 100, itemIcon: Smartphone, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/IPhone_7_-_A1778_Rose_Gold_-_Back_%28retouch%29_%28white_BG_no_shadow%29.jpg/500px-IPhone_7_-_A1778_Rose_Gold_-_Back_%28retouch%29_%28white_BG_no_shadow%29.jpg' } },
  { id: 'pc7', catId: '1', subCategory: 'Smartphone-non-branded', unit: 'piece', hasCondition: true, coinsWorking: 500, coinsNotWorking: 100, itemIcon: Smartphone, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Blackview_A60_Smartphone_Android_mobile_phone_front_face_logged_in_screen.jpg/500px-Blackview_A60_Smartphone_Android_mobile_phone_front_face_logged_in_screen.jpg' } },
  { id: 'pc8', catId: '1', subCategory: 'Keyboard', unit: 'piece', hasCondition: true, coinsWorking: 10, coinsNotWorking: 8, itemIcon: Cable, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Wireless_Computer_Keyboard.jpg/500px-Wireless_Computer_Keyboard.jpg' } },
  { id: 'pc9', catId: '1', subCategory: 'Mouse', unit: 'piece', hasCondition: true, coinsWorking: 10, coinsNotWorking: 8, itemIcon: Cable, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Wired_Mouse_with_white_background.jpg/500px-Wired_Mouse_with_white_background.jpg' } },
  { id: 'pc10', catId: '1', subCategory: 'Touchpad phone', unit: 'piece', hasCondition: true, coinsWorking: 20, coinsNotWorking: 10, itemIcon: Smartphone, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/5_different_Smartphones.jpg/500px-5_different_Smartphones.jpg' } },

  // 2. Mixed e-waste (kg)
  { id: 'me1', catId: '2', subCategory: 'Router, camera, HDD, etc', unit: 'kg', coins: 20, itemIcon: Cable, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Keyboards_and_mice_in_pile_of_ewaste.jpg/500px-Keyboards_and_mice_in_pile_of_ewaste.jpg' } },

  // 3. Glass (kg) — Broken glass is not accepted, so it is omitted
  { id: 'gl1', catId: '3', subCategory: 'Beer bottle', unit: 'kg', coins: 2, itemIcon: Wine, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Beer_bottles_2018_G1.jpg/500px-Beer_bottles_2018_G1.jpg' } },
  { id: 'gl2', catId: '3', subCategory: 'Soft drink bottle', unit: 'kg', coins: 2, itemIcon: CupSoda, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Bisby_Finley%2C_Glass_Soda_Bottle%2C_c._1940%2C_NGA_22676.jpg/500px-Bisby_Finley%2C_Glass_Soda_Bottle%2C_c._1940%2C_NGA_22676.jpg' } },
  { id: 'gl3', catId: '3', subCategory: 'Wine bottle', unit: 'kg', coins: 2, itemIcon: Wine, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Collection_Sparkling_wine_white_Lion_Gri.jpg' } },
  { id: 'gl4', catId: '3', subCategory: 'Glass jar', unit: 'kg', coins: 2, itemIcon: Archive, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/A_Glass_Jar_with_Threaded_Rim_On_a_Clear_Transparent_Background.png/500px-A_Glass_Jar_with_Threaded_Rim_On_a_Clear_Transparent_Background.png' } },
  { id: 'gl5', catId: '3', subCategory: 'Other', unit: 'kg', coins: 1, itemIcon: Wine, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Amber_Glass_Flask.JPG/500px-Amber_Glass_Flask.JPG' } },

  // 4. Paper (kg)
  { id: 'pa1', catId: '4', subCategory: 'Newspaper', unit: 'kg', coins: 10, itemIcon: NewsIcon, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/A_stack_of_newspapers.jpg/500px-A_stack_of_newspapers.jpg' } },
  { id: 'pa2', catId: '4', subCategory: 'Cardboard', unit: 'kg', coins: 10, itemIcon: PackageOpen, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Cardboard_box.png/500px-Cardboard_box.png' } },
  { id: 'pa3', catId: '4', subCategory: 'Magazines', unit: 'kg', coins: 8, itemIcon: BookOpen, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Gfp-stack-of-magazines-and-books.jpg/500px-Gfp-stack-of-magazines-and-books.jpg' } },
  { id: 'pa4', catId: '4', subCategory: 'Other', unit: 'kg', coins: 4, itemIcon: FileText, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/10000_papers_from_ESO_data_%289740706856%29.jpg/500px-10000_papers_from_ESO_data_%289740706856%29.jpg' } },

  // 5. Appliances & TV (piece, condition)
  { id: 'ap1', catId: '5', subCategory: 'Television-below 40"', unit: 'piece', hasCondition: true, coinsWorking: 1000, coinsNotWorking: 200, itemIcon: Tv, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/9/91/1990s_Television_Set.jpg' } },
  { id: 'ap2', catId: '5', subCategory: 'Television-above 40"', unit: 'piece', hasCondition: true, coinsWorking: 2000, coinsNotWorking: 250, itemIcon: Tv, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Interactive_LED_Flat_Panel_Display.png/500px-Interactive_LED_Flat_Panel_Display.png' } },
  { id: 'ap3', catId: '5', subCategory: 'Fridge', unit: 'piece', hasCondition: true, coinsWorking: 2000, coinsNotWorking: 500, itemIcon: Archive, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Panasonic_HOME_REFRIGERATOR_NR-C320WP-N.jpg/500px-Panasonic_HOME_REFRIGERATOR_NR-C320WP-N.jpg' } },
  { id: 'ap4', catId: '5', subCategory: 'Large Appliance', unit: 'piece', hasCondition: true, coinsWorking: 1500, coinsNotWorking: 250, itemIcon: Cog, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/A_collection_of_washing_machines_in_a_laundry_shop.jpg/500px-A_collection_of_washing_machines_in_a_laundry_shop.jpg' } },

  // 6. Batteries (pickup) — minimum 10 batteries
  { id: 'ba1', catId: '6', subCategory: 'Battery pickup', unit: 'pickup', coins: 2, minQty: 10, itemIcon: Battery, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Three_AA_batteries_on_a_white_background.JPG/500px-Three_AA_batteries_on_a_white_background.JPG' } },

  // 7. Shoes (piece)
  { id: 'sh1', catId: '7', subCategory: 'Branded', unit: 'piece', coins: 200, itemIcon: ShoppingBag, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/NIKE_Court_Zoom_Lite_3_Hard_Court_Sneakers_For_Men.jpg/500px-NIKE_Court_Zoom_Lite_3_Hard_Court_Sneakers_For_Men.jpg' } },
  { id: 'sh2', catId: '7', subCategory: 'Non-branded', unit: 'piece', coins: 150, itemIcon: ShoppingBag, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Leather_shoes_4_man.JPG/500px-Leather_shoes_4_man.JPG' } },

  // 8. Metal (kg)
  { id: 'mt1', catId: '8', subCategory: 'Aluminium', unit: 'kg', coins: 20, itemIcon: Database, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Beverage_cans.jpg/500px-Beverage_cans.jpg' } },
  { id: 'mt2', catId: '8', subCategory: 'Copper wire', unit: 'kg', coins: 30, itemIcon: Activity, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Continuously_Transposed_Conductor_Cu_%28Copper_CTC%29_3.jpg/500px-Continuously_Transposed_Conductor_Cu_%28Copper_CTC%29_3.jpg' } },
  { id: 'mt3', catId: '8', subCategory: 'Iron', unit: 'kg', coins: 10, itemIcon: Cog, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Scrap_metal_at_the_Burnside_Iron_Mills%2C_Dunedin._ATLIB_294035.png/500px-Scrap_metal_at_the_Burnside_Iron_Mills%2C_Dunedin._ATLIB_294035.png' } },
  { id: 'mt4', catId: '8', subCategory: 'Utensils', unit: 'kg', coins: 10, itemIcon: Utensils, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Stainless_Steel_Utensils_Store_%283907497472%29.jpg/500px-Stainless_Steel_Utensils_Store_%283907497472%29.jpg' } },
  { id: 'mt5', catId: '8', subCategory: 'Other', unit: 'kg', coins: 10, itemIcon: Magnet, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/157series_scrapped.jpg/500px-157series_scrapped.jpg' } },

  // 9. Plastic (kg)
  { id: 'pl1', catId: '9', subCategory: 'PET Bottles', unit: 'kg', coins: 10, itemIcon: CupSoda, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/1989_HK_Sheung_Wan_Bonham_Strand_VITA_Distilled_Water.jpg/500px-1989_HK_Sheung_Wan_Bonham_Strand_VITA_Distilled_Water.jpg' } },
  { id: 'pl2', catId: '9', subCategory: 'Hard (HDPE, LDPE, PP)', unit: 'kg', coins: 15, itemIcon: Archive, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Purple_plastic_bucket.jpg' } },
  { id: 'pl3', catId: '9', subCategory: 'Thermocol', unit: 'kg', coins: 10, itemIcon: PackageOpen, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Expanded_polystyrene_foam_dunnage.jpg/500px-Expanded_polystyrene_foam_dunnage.jpg' } },
  { id: 'pl4', catId: '9', subCategory: 'Other', unit: 'kg', coins: 1, itemIcon: Droplets, image: { uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Evian_Bottle.jpg/500px-Evian_Bottle.jpg' } },
];

const unitLabel = (unit: string) => (unit === 'kg' ? 'per kg' : unit === 'piece' ? 'per piece' : 'per pickup');

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
  const [userAddress, setUserAddress] = useState('');
  const [userCoordinates, setUserCoordinates] = useState<[number, number] | null>(null);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

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

  // Priority 2: Get address text + profile coordinates as fallback
  useFocusEffect(
    useCallback(() => {
      profileService.getProfile().then(data => {
        if (data && data.address) {
          const addr = data.address;
          const resolvedAddress = typeof addr === 'object' ? addr.fullAddress : addr;
          if (resolvedAddress) setUserAddress(resolvedAddress);

          // Use profile saved coordinates only if GPS not yet available
          const profileCoords = addr?.location?.coordinates;
          if (profileCoords && profileCoords.length === 2) {
            setUserCoordinates(prev => prev ?? [profileCoords[0], profileCoords[1]]);
          }
        }
      }).catch(err => console.log('Failed to fetch profile:', err));
    }, [])
  );

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
    console.log('[Confirm Pickup] userAddress State:', userAddress);

    if (Object.keys(cart).length === 0) {
      showAlert("Empty cart", "Please add items to your cart first.");
      return;
    }

    if (!selectedTime) {
      showAlert("Time slot required", "Please select a pickup time slot.");
      return;
    }

    if (!userCoordinates || typeof userCoordinates[0] !== 'number' || typeof userCoordinates[1] !== 'number' || Number.isNaN(userCoordinates[0]) || Number.isNaN(userCoordinates[1])) {
      showAlert("Location required", "Please allow location access so we can find an agent near you.", [{ text: "OK" }]);
      return;
    }

    if (!userAddress || userAddress.trim().length === 0) {
      showAlert(
        "Pickup address required",
        "Please save your home or office address in the Profile section before scheduling a pickup.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go to Profile", onPress: () => navigation.navigate('Profile') }
        ]
      );
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
        const entry: any = { category: categoryObj.name, subCategory: item.subCategory };
        if (item.hasCondition && condition) entry.condition = condition;
        payloadCategories.push(entry);
      });

      const payload: any = {
        categories: payloadCategories,
        pickupDate: selectedDate,
        timeSlot: selectedTime,
        address: {
          fullAddress: userAddress,
          location: {
            type: 'Point' as const,
            coordinates: userCoordinates as [number, number]
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
                    <Text style={styles.minHint}>Minimum {item.minQty} batteries</Text>
                  ) : null}

                  {hasCond && (
                    <View style={styles.conditionRow}>
                      {CONDITIONS.map((c) => {
                        const on = activeCond === c;
                        return (
                          <TouchableOpacity
                            key={c}
                            style={[styles.condPill, on && styles.condPillActive]}
                            onPress={() => setItemCondition(prev => ({ ...prev, [item.id]: c }))}
                          >
                            <Text style={[styles.condText, on && styles.condTextActive]}>{c}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
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

      {/* Address */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionNum}><Text style={styles.sectionNumText}>4</Text></View>
        <Text style={styles.sectionTitle}>Confirm address</Text>
      </View>
      <View style={styles.addressCard}>
        <View style={styles.addressIconBg}>
          <MapPin size={20} color="#16a34a" />
        </View>
        <View style={styles.addressBody}>
          <View style={styles.addressTopRow}>
            <Text style={styles.homeLabelText}>Pickup address</Text>
            <TouchableOpacity onPress={() => setIsEditingAddress(true)} activeOpacity={0.7}>
              <Text style={styles.changeText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.addressValue}>
            {userAddress || 'No address saved. Tap Edit to add one.'}
          </Text>
          <AddressSearch
            visible={isEditingAddress}
            userCoords={userCoordinates}
            onSelect={(address, coords) => {
              setUserAddress(address);
              setUserCoordinates(coords);
              setIsEditingAddress(false);
              // Persist to the profile too, so it shows up under Saved Addresses —
              // best-effort: booking itself doesn't depend on this succeeding.
              profileService.updateAddress({ fullAddress: address, longitude: coords[0], latitude: coords[1] }).catch(() => {});
            }}
            onCancel={() => setIsEditingAddress(false)}
          />
        </View>
      </View>

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
  filterSection: { paddingTop: 20, paddingBottom: 10 },
  filterList: { paddingHorizontal: 20, gap: 10 },
  filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, borderWidth: 1, borderColor: '#e4e4e7' },
  filterText: { fontSize: 13, color: '#52525b', fontWeight: '600' },
  filterChipActive: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100, elevation: 4 },
  filterTextActive: { fontSize: 13, color: 'white', fontWeight: '800' },

  gridContent: { paddingBottom: 120 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginTop: 10, maxWidth: 900, alignSelf: 'center', width: '100%', justifyContent: 'center' },
  
  cardContainer: { width: CARD_WIDTH, backgroundColor: 'white', borderRadius: 18, marginBottom: 10, marginHorizontal: CARD_MARGIN, overflow: 'hidden', elevation: 2, borderWidth: 2, borderColor: 'transparent' },
  cardContainerActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  cardImageArea: { height: 92, width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#f8fafc', padding: 10 },
  cardImage: { width: '100%', height: '100%' },
  cardInfo: { padding: 10, flex: 1 },
  itemName: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  itemUnit: { fontSize: 12, color: '#71717a', fontWeight: '500', marginBottom: 8 },
  coinPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, gap: 4, marginBottom: 16 },
  coinValue: { fontSize: 12, fontWeight: '800', color: '#d97706' },
  minHint: { fontSize: 11, color: '#dc2626', fontWeight: '700', marginBottom: 8 },
  conditionRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  condPill: { flex: 1, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#e4e4e7', backgroundColor: 'white', alignItems: 'center' },
  condPillActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  condText: { fontSize: 10, fontWeight: '700', color: '#71717a' },
  condTextActive: { color: '#16a34a' },
  
  addBtn: { backgroundColor: '#1e293b', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 8, gap: 4 },
  addBtnText: { color: 'white', fontSize: 11, fontWeight: '800' },
  addedBtn: { backgroundColor: '#dcfce7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, gap: 4, borderWidth: 1, borderColor: '#16a34a' },
  addedBtnText: { color: '#16a34a', fontSize: 12, fontWeight: '800' },

  floatingCart: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#1e293b', borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
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

  addressCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'white', padding: 16, borderRadius: 16, elevation: 1, marginBottom: 24 },
  addressIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  addressBody: { flex: 1, marginLeft: 12 },
  addressTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  homeLabelText: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  addressValue: { fontSize: 13, color: '#64748b', fontWeight: '500', lineHeight: 20 },
  changeText: { color: '#16a34a', fontSize: 13, fontWeight: '700' },

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
