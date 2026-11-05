import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getToken } from '../utils/tokenStore';
import { addNotificationResponseListener, getLastNotificationResponse, markNotificationOpened } from '../utils/notifications';
// Eager: the landing page plus every screen a logged-out visitor can open via a
// direct link. Everything behind auth is lazy-loaded below (see lazyScreen), so a
// first-time visitor's bundle doesn't ship or execute the whole app.
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { LegalScreen } from '../screens/LegalScreen';
import { AboutUsScreen } from '../screens/AboutUsScreen';
import { NewsScreen } from '../screens/NewsScreen';
import { FeedbackScreen } from '../screens/FeedbackScreen';
import { UnsubscribeScreen } from '../screens/UnsubscribeScreen';
import { EmailPreferencesScreen } from '../screens/EmailPreferencesScreen';
import { NotFoundScreen } from '../screens/NotFoundScreen';
// Public blog (posts are read live from 0waste.co.in's feed).
import { BlogScreen } from '../screens/BlogScreen';
import { BlogPostScreen } from '../screens/BlogPostScreen';
import { navigationRef } from './navRef';
import { capturePendingAppLink, capturePendingDeepLink, captureReferralLink, clearPendingDeepLink, getPendingReferralCode, hasPendingDeepLink, hasPendingReferral } from '../utils/deepLink';
import { routeNotification } from '../utils/notificationRoute';
import { initAnalytics, trackPageView } from '../utils/analytics';

// Runs at import, before the NavigationContainer resolves the URL — remembers a
// protected deep link (e.g. an email "Track pickup" link) opened while logged out,
// so we can return the user to it after they log in.
capturePendingDeepLink();

const Stack = createNativeStackNavigator();

// GA4 (web only): loads gtag with automatic page views off. Every screen change,
// including the first load, is reported by trackPageView in onReady/onStateChange.
initAnalytics();

function AuthLoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#16a34a" />
    </View>
  );
}

// ── Code-splitting ───────────────────────────────────────────────────────────
// Each authenticated screen is loaded on first navigation instead of up front, so
// the landing bundle stays small. The wrapper keeps the same name the navigator
// already references, and shows the auth loader while the chunk fetches.
function lazyScreen<T extends React.ComponentType<any>>(
  loader: () => Promise<any>,
  pick: (m: any) => T,
) {
  const C = lazy(() => loader().then((m) => ({ default: pick(m) })));
  return function LazyScreen(props: any) {
    return (
      <Suspense fallback={<AuthLoadingScreen />}>
        <C {...props} />
      </Suspense>
    );
  };
}

const TabNavigator = lazyScreen(() => import('./TabNavigator'), (m) => m.TabNavigator);
const ProfileScreen = lazyScreen(() => import('../screens/ProfileScreen'), (m) => m.ProfileScreen);
const SchedulePickupScreen = lazyScreen(() => import('../screens/SchedulePickupScreen'), (m) => m.SchedulePickupScreen);
const KnowledgeHubScreen = lazyScreen(() => import('../screens/KnowledgeHubScreen'), (m) => m.KnowledgeHubScreen);
const ArticleDetailScreen = lazyScreen(() => import('../screens/ArticleDetailScreen'), (m) => m.ArticleDetailScreen);
const QuizScreen = lazyScreen(() => import('../screens/QuizScreen'), (m) => m.QuizScreen);
const ReferralScreen = lazyScreen(() => import('../screens/ReferralScreen'), (m) => m.ReferralScreen);
const OrderTrackingScreen = lazyScreen(() => import('../screens/OrderTrackingScreen'), (m) => m.OrderTrackingScreen);
const BookingDetailsScreen = lazyScreen(() => import('../screens/BookingDetailsScreen'), (m) => m.BookingDetailsScreen);
const RedeemScreen = lazyScreen(() => import('../screens/RedeemScreen'), (m) => m.RedeemScreen);
const RedeemHistoryScreen = lazyScreen(() => import('../screens/RedeemHistoryScreen'), (m) => m.RedeemHistoryScreen);
const AddPayoutMethodScreen = lazyScreen(() => import('../screens/AddPayoutMethodScreen'), (m) => m.AddPayoutMethodScreen);
const WithdrawalDetailScreen = lazyScreen(() => import('../screens/WithdrawalDetailScreen'), (m) => m.WithdrawalDetailScreen);
const DonationScreen = lazyScreen(() => import('../screens/DonationScreen'), (m) => m.DonationScreen);
const TransferScreen = lazyScreen(() => import('../screens/TransferScreen'), (m) => m.TransferScreen);

export function RootNavigator() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const navRef = navigationRef;

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await getToken();
        const isValid = !!token && token !== 'undefined' && token !== 'null';
        // Already logged in — the router resolves the deep link directly, so drop
        // any captured URL to avoid a stale redirect on a later in-session login.
        if (isValid) clearPendingDeepLink();
        // Logged out and opened from an App Link or a referral link (karmacoin://r/CODE):
        // remember it so onReady sends them to Login, with the referral code filled in
        // or returning them to the link after login (web does this at import).
        else if (Platform.OS !== 'web') {
          const url = await Linking.getInitialURL();
          capturePendingAppLink(url);
          captureReferralLink(url);
        }
        setIsLoggedIn(isValid);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsLoggedIn(false);
      }
    };
    checkAuthStatus();
  }, []);

  useEffect(() => {
    // A tapped push/notification routes to the right screen via the shared router
    // (used by the in-app panel too). Report the open for EVERY tap first —
    // fire-and-forget, never awaited, never blocking navigation.
    const handleResponse = (data: any, actionIdentifier?: string) => {
      if (data?.notificationId) markNotificationOpened(data.notificationId);
      routeNotification(data, actionIdentifier);
    };

    getLastNotificationResponse().then(res => {
      if (res) handleResponse(res.data, res.actionIdentifier);
    });

    const sub = addNotificationResponseListener(handleResponse);
    return () => sub.remove();
  }, []);

  // An App Link tapped while the app is open but logged out resolves to NotFound (its
  // path isn't in the logged-out link map). Remember it and show Login instead; a
  // referral link opens Login with its code. Logged-out is checked when the link
  // arrives, since isLoggedIn only reflects app start (a later log out doesn't change it).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Linking.addEventListener('url', async ({ url }) => {
      const token = await getToken();
      if (token && token !== 'undefined' && token !== 'null') return;
      const code = captureReferralLink(url);
      if (code) {
        setTimeout(() => navRef.current?.navigate('Login', { referralCode: code }), 0);
      } else if (capturePendingAppLink(url)) {
        setTimeout(() => navRef.current?.reset({ index: 0, routes: [{ name: 'Login' }] }), 0);
      }
    });
    return () => sub.remove();
  }, []);

  // URL routing: on web for real, shareable, crawlable URLs; on Android for App Links
  // (https://karmaverse.earth/<Screen>, declared in app.json's intentFilters) from
  // emails and shares. Deliberately excludes the `karmacoin://` scheme so the existing
  // manual referral-code deep-link handling in App.tsx (native) is unaffected. The root path
  // ('') must map to whichever screen `initialRouteName` would otherwise pick, or a
  // logged-in user visiting '/' would get bounced to the Splash marketing screen.
  // Every authenticated screen needs an entry here or a cold load / refresh of its
  // URL fails to match and React Navigation falls back to the initial route
  // (Dashboard) — that was KV-016. Tab screens are nested under App; the rest are
  // top-level stack routes. Paths match the route names so the URLs the nav already
  // generates (/Wallet, /Quiz, …) round-trip on refresh, bookmarks and shared links.
  const linking = useMemo(() => ({
    prefixes: Platform.OS === 'web'
      ? (typeof window !== 'undefined' ? [window.location.origin] : [])
      : ['https://karmaverse.earth'],
    config: {
      screens: isLoggedIn
        ? {
            App: {
              path: '',
              screens: {
                Dashboard: 'Dashboard',
                Orders: 'Orders',
                Wallet: 'Wallet',
                Store: 'Store',
              },
            },
            Login: 'login',
            Legal: 'legal/:type',
            Profile: 'Profile',
            SchedulePickup: 'SchedulePickup',
            KnowledgeHub: 'KnowledgeHub',
            ArticleDetail: 'ArticleDetail',
            Quiz: 'Quiz',
            Referral: 'Referral',
            OrderTracking: 'OrderTracking',
            BookingDetails: 'BookingDetails',
            Redeem: 'Redeem',
            RedeemHistory: 'RedeemHistory',
            AddPayoutMethod: 'AddPayoutMethod',
            Withdrawal: 'Withdrawal',
            Donation: 'Donation',
            Transfer: 'Transfer',
            AboutUs: 'AboutUs',
            News: 'news',
            Blog: 'blog',
            BlogPost: 'blog/:slug',
            Feedback: 'feedback',
            Unsubscribe: 'unsubscribe',
            EmailPreferences: 'preferences',
            NotFound: '*',
          }
        : {
            Splash: '', Login: 'login', Legal: 'legal/:type', AboutUs: 'AboutUs', News: 'news',
            Blog: 'blog', BlogPost: 'blog/:slug',
            // Public, token-based mailer destinations — openable while logged out.
            Feedback: 'feedback', Unsubscribe: 'unsubscribe', EmailPreferences: 'preferences',
            NotFound: '*',
          },
    },
  }), [isLoggedIn]);

  if (isLoggedIn === null) {
    return <AuthLoadingScreen />;
  }

  return (
    <NavigationContainer
      ref={navRef}
      linking={linking}
      documentTitle={{ enabled: false }}
      onReady={() => {
        // A logged-out user who opened a protected email/share link, or a referral
        // link (?ref=), resolves to NotFound (those paths aren't in the logged-out
        // link map). Send them to Login instead — after login, consumePendingDeepLink
        // returns them to a protected link, and the signup form reads the captured
        // referral code.
        if (!isLoggedIn && (hasPendingDeepLink() || hasPendingReferral())) {
          const referralCode = getPendingReferralCode();
          navRef.current?.reset({ index: 0, routes: [{ name: 'Login', params: referralCode ? { referralCode } : undefined }] });
        }
        trackPageView(navRef.current?.getCurrentRoute());
        // Fade out the static landing hero from public/index.html once the first
        // screen has painted (two frames) — it sits outside #root, so React won't.
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          requestAnimationFrame(() => requestAnimationFrame(() => (window as any).__kvHideStaticHero?.()));
        }
      }}
      onStateChange={() => {
        // De-duplicated inside trackPageView: a state change that stays on the same
        // screen sends nothing.
        trackPageView(navRef.current?.getCurrentRoute());
      }}
    >
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={isLoggedIn ? 'App' : 'Splash'}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="App" component={TabNavigator} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="SchedulePickup" component={SchedulePickupScreen} />
        <Stack.Screen name="KnowledgeHub" component={KnowledgeHubScreen} />
        <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
        <Stack.Screen name="Quiz" component={QuizScreen} />
        <Stack.Screen name="Referral" component={ReferralScreen} />
        <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
        <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
        <Stack.Screen name="Legal" component={LegalScreen} />
        <Stack.Screen name="Redeem" component={RedeemScreen} />
        <Stack.Screen name="RedeemHistory" component={RedeemHistoryScreen} />
        <Stack.Screen name="AddPayoutMethod" component={AddPayoutMethodScreen} />
        <Stack.Screen name="Withdrawal" component={WithdrawalDetailScreen} />
        <Stack.Screen name="Donation" component={DonationScreen} />
        <Stack.Screen name="Transfer" component={TransferScreen} />
        <Stack.Screen name="AboutUs" component={AboutUsScreen} />
        <Stack.Screen name="News" component={NewsScreen} />
        <Stack.Screen name="Blog" component={BlogScreen} />
        <Stack.Screen name="BlogPost" component={BlogPostScreen} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} />
        <Stack.Screen name="Unsubscribe" component={UnsubscribeScreen} />
        <Stack.Screen name="EmailPreferences" component={EmailPreferencesScreen} />
        <Stack.Screen name="NotFound" component={NotFoundScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#064e3b',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
