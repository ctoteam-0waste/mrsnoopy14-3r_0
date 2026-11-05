import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from './tokenStore';
import { getStableUserSuffix } from './userId';

// Per-user "has seen this screen's first-visit tour" flags.
export type TourId = 'dashboard';

const keyFor = async (tourId: TourId) => {
  const token = await getToken();
  return `coachTourSeen_${tourId}_${getStableUserSuffix(token)}`;
};

export async function hasSeenTour(tourId: TourId): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(await keyFor(tourId))) === '1';
  } catch {
    return true;
  }
}

export async function markTourSeen(tourId: TourId): Promise<void> {
  try {
    await AsyncStorage.setItem(await keyFor(tourId), '1');
  } catch {}
}
