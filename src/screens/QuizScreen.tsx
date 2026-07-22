import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  ActivityIndicator, Animated, BackHandler, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Trophy, Timer, Flame, CheckCircle2, XCircle, ArrowRight, WifiOff, Leaf } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { quizService } from '../services/quiz';
import { BACKEND_BASE } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { getLocalDateStr, getLocalYesterdayStr } from '../utils/quizDate';
import { showAlert } from '../utils/alert';
import { showRedeemInfoOnce } from '../utils/redeemInfo';
import { getStableUserSuffix } from '../utils/userId';

const CONFETTI_COLORS = ['#fbbf24', '#4ade80', '#f472b6', '#60a5fa', '#fb923c', '#a78bfa', '#34d399', '#f87171'];
const CONFETTI_COUNT = 40;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function Confetti() {
  const pieces = useMemo(() =>
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_W,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 8,
      delay: Math.random() * 800,
      duration: 2000 + Math.random() * 1500,
      wobble: (Math.random() - 0.5) * 120,
      anim: new Animated.Value(0),
    })),
  []);

  useEffect(() => {
    pieces.forEach(p => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.anim, { toValue: 1, duration: p.duration, useNativeDriver: false }),
          Animated.timing(p.anim, { toValue: 0, duration: 0, useNativeDriver: false }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map(p => (
        <Animated.View
          key={p.id}
          style={{
            position: 'absolute',
            left: p.x,
            top: -20,
            width: p.size,
            height: p.size * 0.6,
            borderRadius: 2,
            backgroundColor: p.color,
            opacity: p.anim.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, SCREEN_H + 40] }) },
              { translateX: p.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, p.wobble, p.wobble * 0.5] }) },
              { rotate: p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 + Math.random() * 360}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

const TIMER_DURATION = 20;

type ScreenState = 'init' | 'lobby' | 'playing' | 'results';

interface Question {
  question: string;
  options: string[];
}

interface AnswerResult {
  correct: boolean;
  coinsEarned: number;
  bonusCoins: number;
  perfectScore: boolean;
  correctAnswer: string;
}

function RuleRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <View style={styles.ruleIconWrap}>{icon}</View>
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

export function QuizScreen({ navigation }: any) {
  const { addNotification } = useNotifications();
  const [screenState, setScreenState] = useState<ScreenState>('init');
  const [isLocked, setIsLocked] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [streak, setStreak] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalCoins, setTotalCoins] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isPerfectScore, setIsPerfectScore] = useState(false);
  const [showCoinToast, setShowCoinToast] = useState(false);
  const [quizDateKey, setQuizDateKey] = useState('lastQuizDate_default');
  const [quizStreakKey, setQuizStreakKey] = useState('quizStreak_default');
  const [storedStreak, setStoredStreak] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const isOfflineRef = useRef(false);

  const timerAnim = useRef(new Animated.Value(1)).current;
  const timerAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const correctCountRef = useRef(0);
  const totalCoinsRef = useRef(0);
  const questionsAttemptedRef = useRef(0);
  // Guards against double-submission from a fast double-tap: React state updates
  // (selectedAnswer/isSubmitting) aren't synchronous, so a second tap can fire before
  // the first render reflects them. A ref updates immediately, closing that window.
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem('userToken');
      const suffix = getStableUserSuffix(token);
      const dateKey = `lastQuizDate_${suffix}`;
      const streakKey = `quizStreak_${suffix}`;
      setQuizDateKey(dateKey);
      setQuizStreakKey(streakKey);
      const [storedDate, storedStreakVal] = await Promise.all([
        AsyncStorage.getItem(dateKey),
        AsyncStorage.getItem(streakKey),
      ]);
      const todayStr = getLocalDateStr();
      const yesterdayStr = getLocalYesterdayStr();
      // Old format was toDateString() e.g. "Wed May 28 2026" â€” treat as stale if not YYYY-MM-DD
      const isValidFormat = storedDate ? /^\d{4}-\d{2}-\d{2}$/.test(storedDate) : false;
      const isToday = isValidFormat && storedDate === todayStr;
      const isYesterday = isValidFormat && storedDate === yesterdayStr;
      if (isToday) setIsLocked(true);
      if (storedDate && !isToday && !isYesterday) {
        await AsyncStorage.setItem(streakKey, '0');
        setStoredStreak(0);
      } else {
        setStoredStreak(Number(storedStreakVal) || 0);
      }
      setScreenState('lobby');
    };
    init();
  }, []);

  // Block Android hardware back button during quiz
  useEffect(() => {
    if (screenState !== 'playing') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleQuitPress();
      return true;
    });
    return () => sub.remove();
  }, [screenState]);

  // Network connectivity check â€” pauses the quiz when connection drops
  useEffect(() => {
    const checkNet = () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      fetch(`${BACKEND_BASE}/`, { method: 'HEAD', cache: 'no-store', signal: controller.signal })
        .then(() => {
          clearTimeout(timer);
          if (isOfflineRef.current) {
            isOfflineRef.current = false;
            setIsOffline(false);
          }
        })
        .catch(() => {
          clearTimeout(timer);
          if (!isOfflineRef.current) {
            isOfflineRef.current = true;
            setIsOffline(true);
          }
        });
    };
    checkNet();
    const interval = setInterval(checkNet, 5000);
    return () => clearInterval(interval);
  }, []);

  // Start/resume timer animation when question changes or connection state changes
  useEffect(() => {
    if (screenState !== 'playing') return;
    if (isOffline) {
      timerAnimRef.current?.stop();
      return;
    }
    timerAnim.setValue(timeLeft / TIMER_DURATION);
    const anim = Animated.timing(timerAnim, {
      toValue: 0,
      duration: timeLeft * 1000,
      useNativeDriver: false,
    });
    timerAnimRef.current = anim;
    anim.start();
    return () => anim.stop();
  }, [currentQ, screenState, isOffline]);

  // Countdown integer â€” paused while offline
  useEffect(() => {
    if (screenState !== 'playing' || selectedAnswer !== null || isSubmitting || isOffline) return;
    if (timeLeft === 0) {
      handleTimeout();
      return;
    }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, screenState, selectedAnswer, isSubmitting, isOffline]);

  const finishQuiz = async () => {
    // Base the new streak on the validated local streak (storedStreak), not the
    // backend value — this grows the streak reliably day over day on the client.
    const newStreak = storedStreak + 1;
    const todayStr = getLocalDateStr();
    await AsyncStorage.setItem(quizDateKey, todayStr);
    await AsyncStorage.setItem(quizStreakKey, String(newStreak));
    addNotification({
      type: 'QUIZ_COMPLETED',
      title: 'Daily quiz complete!',
      message: totalCoinsRef.current > 0
        ? `You got ${correctCountRef.current}/${questions.length} correct and earned ${totalCoinsRef.current} KarmaCoins XP!`
        : `You attempted the quiz. Try again tomorrow!`,
    });
    const histKey = quizStreakKey.replace('quizStreak_', 'quizHistory_');
    const raw = await AsyncStorage.getItem(histKey);
    const history: string[] = raw ? JSON.parse(raw) : [];
    if (!history.includes(todayStr)) history.push(todayStr);
    await AsyncStorage.setItem(histKey, JSON.stringify(history));
    setStreak(newStreak);
    setScreenState('results');
    showRedeemInfoOnce(quizStreakKey.replace('quizStreak_', 'firstQuizRedeemInfo_'));
  };

  const handleQuitPress = () => {
    const hasAttempted = questionsAttemptedRef.current > 0;
    showAlert(
      'Exit quiz?',
      hasAttempted
        ? `You've earned ${totalCoinsRef.current} coins so far. Exit and save your progress? Quiz will be locked for today.`
        : 'Are you sure you want to exit? No coins earned yet.',
      [
        { text: 'Continue playing', style: 'cancel' },
        {
          text: hasAttempted ? 'Save & exit' : 'Exit',
          style: 'destructive',
          onPress: async () => {
            try { await quizService.quit(); } catch {}
            if (hasAttempted) {
              await finishQuiz();
            } else {
              navigation.goBack();
            }
          },
        },
      ],
    );
  };

  const handleTimeout = () => {
    setSelectedAnswer('__timeout__');
    setAnswerResult(null);
    setTimeout(advanceQuestion, 1500);
  };

  const handleSelectAnswer = async (option: string) => {
    if (selectedAnswer !== null || isSubmitting || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    questionsAttemptedRef.current += 1;
    setSelectedAnswer(option);
    setIsSubmitting(true);
    timerAnimRef.current?.stop();

    try {
      const q = questions[currentQ] as any;
      const qId = q.questionId || q.id || `q${currentQ}`;
      const result: AnswerResult = await quizService.submit(qId, option);
      setAnswerResult(result);
      if (result.correct) {
        correctCountRef.current += 1;
        totalCoinsRef.current += result.coinsEarned + (result.bonusCoins || 0);
        setCorrectCount(correctCountRef.current);
        setTotalCoins(totalCoinsRef.current);
        setShowCoinToast(true);
        if (result.perfectScore) setIsPerfectScore(true);
      }
    } catch (err: any) {
      // "Already answered" means an earlier submission for this question already
      // succeeded (and was already scored/credited) — don't clobber that real result
      // with a fake incorrect/red one just because this duplicate call was rejected.
      const status = err?.response?.status;
      const message = err?.response?.data?.message || '';
      if (status === 400 && /already answered/i.test(message)) {
        return;
      }
      const errData = err?.response?.data?.data || err?.response?.data;
      setAnswerResult({
        correct: false,
        coinsEarned: 0,
        bonusCoins: 0,
        perfectScore: false,
        correctAnswer: errData?.correctAnswer || '',
      });
    } finally {
      setIsSubmitting(false);
    }

    setTimeout(advanceQuestion, 1500);
  };

  const advanceQuestion = () => {
    setShowCoinToast(false);
    isSubmittingRef.current = false;
    if (currentQ < questions.length - 1) {
      setCurrentQ(p => p + 1);
      setSelectedAnswer(null);
      setAnswerResult(null);
      setTimeLeft(TIMER_DURATION);
    } else {
      finishQuiz();
    }
  };

  const handleStartQuiz = async () => {
    setIsFetching(true);
    try {
      const data = await quizService.start();
      setQuestions(data.questions || []);
      setStreak(data.streak?.currentStreak || 0);
      setCurrentQ(0);
      setTotalCoins(0);
      setCorrectCount(0);
      setIsPerfectScore(false);
      correctCountRef.current = 0;
      totalCoinsRef.current = 0;
      isSubmittingRef.current = false;
      setSelectedAnswer(null);
      setAnswerResult(null);
      setTimeLeft(TIMER_DURATION);
      setScreenState('playing');
    } catch (err: any) {
      // A 429 can mean "you've already played today" OR a generic rate-limit —
      // only treat it as the daily lock when the message actually says so, otherwise
      // this would falsely lock a user out of a quiz they never played (see bug where
      // "Already played today" showed up on the very first attempt of the day).
      const message429 = err?.response?.data?.message || '';
      if (err?.response?.status === 429 && /already (played|answered|completed)/i.test(message429)) {
        setIsLocked(true);
        await AsyncStorage.setItem(quizDateKey, getLocalDateStr());
      } else if (err?.response?.status === 429) {
        showAlert('Too many attempts', 'Please wait a moment and try again.');
      } else if (!err?.response || err?.code === 'ECONNABORTED' || err?.message?.includes('Network')) {
        showAlert(
          'Server is waking up',
          'Our server takes a few seconds to start. Please wait a moment and try again.',
        );
      } else {
        showAlert('Could not start quiz', 'Something went wrong. Please try again.');
      }
    } finally {
      setIsFetching(false);
    }
  };

  // â”€â”€ INIT â”€â”€
  if (screenState === 'init') {
    return (
      <View style={styles.fullCenter}>
        <LinearGradient colors={['#064e3b', '#15803d']} style={StyleSheet.absoluteFillObject} />
        <ActivityIndicator color="white" size="large" />
      </View>
    );
  }

  // â”€â”€ RESULTS â”€â”€
  if (screenState === 'results') {
    const isPerfect = isPerfectScore;
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
        <LinearGradient colors={isPerfect ? ['#052e16', '#065f46'] : ['#064e3b', '#15803d']} style={StyleSheet.absoluteFillObject} />
        {isPerfect && <Confetti />}
        <SafeAreaView style={styles.resultsArea}>
          <View style={styles.trophyContainer}>
            <Trophy size={80} color="#fcd34d" />
            <Text style={styles.resultsTitle}>{isPerfect ? 'Perfect score!' : 'Quiz complete!'}</Text>
            <Text style={styles.resultsSub}>{correctCount} out of {questions.length} correct</Text>
          </View>

          <View style={styles.resultsCard}>
            <Text style={styles.resultsCardLabel}>Total earned today</Text>
            <View style={styles.resultsCoinsRow}>
              <KarmaCoin size={36} glow />
              <Text style={styles.resultsCoinsValue}>+{totalCoins}</Text>
            </View>
            <Text style={styles.resultsCardNote}>
              {totalCoins > 0 ? 'Coins added to your Karma Wallet!' : 'Keep practicing â€” try again tomorrow!'}
            </Text>
            <View style={styles.streakPill}>
              <Flame size={16} color="#f97316" fill="#f97316" />
              <Text style={styles.streakPillText}>{streak} day streak</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('App')} activeOpacity={0.85}>
            <Text style={styles.homeBtnText}>Go to home</Text>
            <ArrowRight size={18} color="#b45309" />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // â”€â”€ LOBBY â”€â”€
  if (screenState === 'lobby') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
        <LinearGradient colors={['#064e3b', '#166534']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.lobbyArea}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <X size={22} color="white" />
          </TouchableOpacity>

          <View style={styles.lobbyIconBg}>
            <Leaf size={42} color="#4ade80" />
          </View>
          <Text style={styles.lobbyTitle}>Daily Eco-Quiz</Text>
          <Text style={styles.lobbySub}>Test your eco-knowledge and earn KarmaCoins XP!</Text>

          {storedStreak > 0 && (
            <View style={styles.lobbyStreakPill}>
              <Flame size={16} color="#f97316" fill="#f97316" />
              <Text style={styles.lobbyStreakText}>{storedStreak} day streak</Text>
            </View>
          )}

          <View style={styles.rulesCard}>
            <RuleRow icon={<CheckCircle2 size={20} color="#4ade80" />} text="3 questions per day" />
            <RuleRow icon={<Timer size={20} color="#60a5fa" />} text="20 seconds per question" />
            <RuleRow icon={<KarmaCoin size={20} />} text="10 coins per question" />
            <RuleRow icon={<Trophy size={20} color="#fbbf24" />} text="Max 30 coins per day" />
          </View>

          {isLocked ? (
            <View style={styles.lockedBox}>
              <Text style={styles.lockedTitle}>Already played today!</Text>
              <Text style={styles.lockedSub}>Next quiz unlocks at 12:00 AM</Text>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.outlineBtnText}>Back to home</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.playBtn, isFetching && { opacity: 0.7 }]}
              onPress={handleStartQuiz}
              disabled={isFetching}
              activeOpacity={0.85}
            >
              {isFetching
                ? <ActivityIndicator color="#78350f" />
                : <Text style={styles.playBtnText}>Start</Text>
              }
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </View>
    );
  }

  // â”€â”€ PLAYING â”€â”€
  const question = questions[currentQ];
  const progressPct = (currentQ / questions.length) * 100;
  const isTimedOut = selectedAnswer === '__timeout__';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      <LinearGradient colors={['#064e3b', '#166534']} style={styles.topBg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleQuitPress}>
          <X size={22} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Eco-Quiz</Text>
        <View style={styles.coinTally}>
          <KarmaCoin size={18} />
          <Text style={styles.coinTallyText}>{totalCoins}</Text>
        </View>
      </View>

      {/* Offline banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <WifiOff size={15} color="white" />
          <Text style={styles.offlineText}>No internet connection. Please check your network.</Text>
        </View>
      )}

      {/* Progress bar (questions) */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      {/* Timer bar */}
      <Animated.View style={[styles.timerBar, {
        width: timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        backgroundColor: timeLeft <= 5 ? '#ef4444' : '#4ade80',
      }]} />

      {/* Meta row */}
      <View style={styles.metaRow}>
        <Text style={styles.qCounter}>Question {currentQ + 1} of {questions.length}</Text>
        <View style={styles.timerChip}>
          <Timer size={13} color={timeLeft <= 3 ? '#ef4444' : 'white'} />
          <Text style={[styles.timerChipText, timeLeft <= 3 && styles.timerDanger]}>
            {timeLeft}s
          </Text>
        </View>
      </View>

      {/* Question card */}
      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{question?.question}</Text>

        <View style={styles.optionsList}>
          {question?.options.map((opt, idx) => {
            const isSelected = selectedAnswer === opt;
            const isCorrectOpt = answerResult?.correctAnswer === opt;
            const isWrongSelected = isSelected && answerResult !== null && !answerResult.correct;

            let optStyle = {};
            let textStyle = {};
            let Icon = null;

            if (answerResult) {
              if (isCorrectOpt) {
                optStyle = styles.optionCorrect;
                textStyle = styles.optionTextLight;
                Icon = <CheckCircle2 size={18} color="white" />;
              } else if (isWrongSelected) {
                optStyle = styles.optionWrong;
                textStyle = styles.optionTextLight;
                Icon = <XCircle size={18} color="white" />;
              }
            }

            return (
              <TouchableOpacity
                key={idx}
                style={[styles.optionBtn, optStyle]}
                onPress={() => handleSelectAnswer(opt)}
                disabled={selectedAnswer !== null || isSubmitting || isOffline}
                activeOpacity={0.8}
              >
                <View style={styles.optionLabelBadge}>
                  <Text style={styles.optionLabelText}>{String.fromCharCode(65 + idx)}</Text>
                </View>
                <Text style={[styles.optionText, textStyle]} numberOfLines={2}>{opt}</Text>
                {Icon}
              </TouchableOpacity>
            );
          })}
        </View>

        {isSubmitting && (
          <View style={styles.submittingRow}>
            <ActivityIndicator size="small" color="#15803d" />
          </View>
        )}

        {isTimedOut && (
          <View style={styles.timeoutBanner}>
            <Timer size={18} color="#ef4444" />
            <Text style={styles.timeoutText}>Time's up!</Text>
          </View>
        )}
      </View>

      {/* Coin toast */}
      {showCoinToast && answerResult?.correct && (
        <View style={styles.coinToast}>
          <KarmaCoin size={16} />
          <Text style={styles.coinToastText}>
            +{answerResult.coinsEarned} coins!{answerResult.bonusCoins > 0 ? ` +${answerResult.bonusCoins} perfect score bonus!` : ''}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  fullCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 280, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: 'white' },
  closeBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  coinTally: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  coinTallyText: { fontSize: 14, fontWeight: '800', color: 'white' },

  // Offline banner
  offlineBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ef4444', paddingVertical: 10, paddingHorizontal: 16, marginHorizontal: 20, marginBottom: 10, borderRadius: 12 },
  offlineText: { flex: 1, fontSize: 12, fontWeight: '700', color: 'white' },

  // Progress track (question count)
  progressTrack: { marginHorizontal: 20, height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#86efac', borderRadius: 3 },

  // Timer bar
  timerBar: { height: 4, marginHorizontal: 20, marginTop: 6, borderRadius: 2 },

  // Meta row
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 10 },
  qCounter: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  timerChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  timerChipText: { fontSize: 13, fontWeight: '800', color: 'white' },
  timerDanger: { color: '#ef4444' },

  // Question card
  questionCard: { marginHorizontal: 16, marginTop: 20, backgroundColor: 'white', borderRadius: 24, padding: 20, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  questionText: { fontSize: 20, fontWeight: '800', color: '#0f172a', textAlign: 'center', lineHeight: 30, marginBottom: 24 },

  // Options
  optionsList: { gap: 10 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 2, borderColor: '#e2e8f0' },
  optionLabelBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optionLabelText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  optionText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1e293b' },
  optionTextLight: { color: 'white' },
  optionCorrect: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  optionWrong: { backgroundColor: '#ef4444', borderColor: '#ef4444' },

  submittingRow: { alignItems: 'center', marginTop: 12 },
  timeoutBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, padding: 10, backgroundColor: '#fef2f2', borderRadius: 12 },
  timeoutText: { fontSize: 14, fontWeight: '800', color: '#ef4444' },

  // Coin toast
  coinToast: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 14, backgroundColor: '#f0fdf4', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#bbf7d0', elevation: 4 },
  coinToastText: { fontSize: 15, fontWeight: '800', color: '#15803d' },

  // Lobby
  lobbyArea: { flex: 1, paddingHorizontal: 24, paddingTop: 8, maxWidth: 600, width: '100%', alignSelf: 'center' },
  lobbyIconBg: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 32, marginBottom: 20 },
  lobbyTitle: { fontSize: 28, fontWeight: '900', color: 'white', textAlign: 'center', marginBottom: 8 },
  lobbySub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '600', textAlign: 'center', lineHeight: 22, marginBottom: 32 },

  rulesCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 20, gap: 14, marginBottom: 36, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ruleIconWrap: { width: 28, alignItems: 'center' },
  ruleText: { fontSize: 15, fontWeight: '600', color: 'white' },

  playBtn: { backgroundColor: '#fcd34d', borderRadius: 18, paddingVertical: 18, alignItems: 'center', elevation: 4, shadowColor: '#f59e0b', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  playBtnText: { fontSize: 17, fontWeight: '900', color: '#78350f' },

  // Locked
  lockedBox: { alignItems: 'center', gap: 8 },
  lockedTitle: { fontSize: 18, fontWeight: '800', color: 'white' },
  lockedSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 16 },
  outlineBtn: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32 },
  outlineBtnText: { fontSize: 15, fontWeight: '700', color: 'white' },

  // Results
  resultsArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, maxWidth: 600, width: '100%', alignSelf: 'center' },
  trophyContainer: { alignItems: 'center', marginBottom: 36 },
  resultsTitle: { fontSize: 30, fontWeight: '900', color: 'white', marginTop: 20, marginBottom: 6 },
  resultsSub: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },

  resultsCard: { backgroundColor: 'white', width: '100%', borderRadius: 24, padding: 28, alignItems: 'center', marginBottom: 32, elevation: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  resultsCardLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  resultsCoinsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  resultsCoinsValue: { fontSize: 44, fontWeight: '900', color: '#d97706' },
  resultsCardNote: { fontSize: 13, color: '#64748b', fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff7ed', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  streakPillText: { fontSize: 13, fontWeight: '800', color: '#ea580c' },
  lobbyStreakPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignSelf: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  lobbyStreakText: { fontSize: 14, fontWeight: '800', color: 'white' },

  homeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fcd34d', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 18, elevation: 4, shadowColor: '#f59e0b', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  homeBtnText: { fontSize: 16, fontWeight: '900', color: '#78350f' },
});
