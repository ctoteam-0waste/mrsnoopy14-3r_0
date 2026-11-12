import AsyncStorage from '@react-native-async-storage/async-storage';
import { profileService } from '../services/profile';
import { getLocalDateStr } from './quizDate';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export type QuizDays = { days: string[]; streak: number; playedToday: boolean };

// Days in a row up to today, or up to yesterday when today's quiz is still open.
export function quizStreakFrom(days: string[], base: Date = new Date()): number {
  const played = new Set(days);
  const d = new Date(base);
  if (!played.has(getLocalDateStr(d))) d.setDate(d.getDate() - 1);
  let count = 0;
  while (played.has(getLocalDateStr(d))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

const isQuizTx = (tx: any) => /quiz/i.test(String(tx?.source || tx?.description || ''));

// Quiz days from this phone plus every day with quiz coins in the account's
// transactions, so a quiz played on another phone counts too. A quiz with no
// correct answers earns no coins, so only the phone it was played on knows it.
// With withServer false it reads this phone only (no network), for a quick first paint.
export async function loadQuizDays(suffix: string, withServer = true): Promise<QuizDays> {
  const histKey = `quizHistory_${suffix}`;
  const dateKey = `lastQuizDate_${suffix}`;
  const [rawHistory, lastDate] = await Promise.all([AsyncStorage.getItem(histKey), AsyncStorage.getItem(dateKey)]);
  let local: string[] = [];
  try {
    const parsed = JSON.parse(rawHistory || '[]');
    if (Array.isArray(parsed)) local = parsed;
  } catch {}
  if (lastDate) local.push(lastDate);

  let server: string[] = [];
  if (withServer) {
    try {
      const txs = await profileService.getTransactionHistory();
      server = (Array.isArray(txs) ? txs : [])
        .filter(isQuizTx)
        .map((tx: any) => (tx?.createdAt ? getLocalDateStr(new Date(tx.createdAt)) : ''));
    } catch {}
  }

  const days = [...new Set([...local, ...server].filter((d) => DAY.test(d)))].sort();
  const streak = quizStreakFrom(days);
  const latest = days[days.length - 1];
  if (withServer) {
    await AsyncStorage.multiSet([
      [histKey, JSON.stringify(days)],
      [`quizStreak_${suffix}`, String(streak)],
      ...(latest ? [[dateKey, latest] as [string, string]] : []),
    ]).catch(() => {});
  }
  return { days, streak, playedToday: latest === getLocalDateStr() };
}
