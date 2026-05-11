import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, StatusBar } from 'react-native';
import { X, Trophy, AlertCircle, Timer } from 'lucide-react-native';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const QUESTIONS = [
  {
    question: "How long does it take for a plastic bottle to decompose?",
    options: ["10 years", "50 years", "450 years", "Never"],
    correctIndex: 2
  },
  {
    question: "Which of these goes in the Blue bin (Dry waste)?",
    options: ["Banana Peel", "Cardboard Box", "Leftover Pizza", "Batteries"],
    correctIndex: 1
  },
  {
    question: "What is the most recycled item globally?",
    options: ["Aluminum Cans", "Paper", "Glass", "Plastic Bags"],
    correctIndex: 0
  }
];

const TIMER_DURATION = 10;

export function QuizScreen({ navigation }: any) {
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (isFinished || selectedOption !== null) return;

    if (timeLeft === 0) {
      handleTimeOut();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isFinished, selectedOption]);

  const handleTimeOut = () => {
    setSelectedOption(-1); // -1 indicates timeout/wrong
    setTimeout(goToNextQuestion, 1500);
  };

  const handleSelectOption = (index: number) => {
    if (selectedOption !== null) return;
    
    setSelectedOption(index);
    if (index === QUESTIONS[currentQ].correctIndex) {
      setScore(prev => prev + 1);
    }

    setTimeout(goToNextQuestion, 1500);
  };

  const goToNextQuestion = () => {
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(prev => prev + 1);
      setSelectedOption(null);
      setTimeLeft(TIMER_DURATION);
    } else {
      setIsFinished(true);
    }
  };

  if (isFinished) {
    const creditsEarned = score * 5;
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
        <LinearGradient colors={['#064e3b', '#15803d']} style={[StyleSheet.absoluteFillObject]} />
        <SafeAreaView style={styles.resultsArea}>
          <View style={styles.trophyContainer}>
            <Trophy size={100} color="#fcd34d" />
            <Text style={styles.resultsTitle}>Quiz Completed!</Text>
            <Text style={styles.resultsSub}>You answered {score} out of {QUESTIONS.length} correctly.</Text>
          </View>

          <View style={styles.creditsCard}>
            <Text style={styles.creditsLabel}>You Earned</Text>
            <View style={styles.creditsValueRow}>
              <KarmaCoin size={32} glow />
              <Text style={styles.creditsValue}>+{creditsEarned}</Text>
            </View>
            <Text style={styles.creditsNote}>Credits added to your Karma Wallet</Text>
          </View>

          <TouchableOpacity style={styles.claimBtn} onPress={() => navigation.navigate('App')}>
            <Text style={styles.claimBtnText}>Claim & Return Home</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const question = QUESTIONS[currentQ];
  const progressPercent = ((currentQ) / QUESTIONS.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
       {/* Background */}
       <LinearGradient colors={['#064e3b', '#166534']} style={styles.topBackground} />

       {/* Header */}
       <View style={styles.header}>
         <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
           <X size={24} color="white" />
         </TouchableOpacity>
         <Text style={styles.headerTitle}>Daily Eco-Quiz</Text>
         <View style={{ width: 40 }} />
       </View>

       {/* Progress Bar */}
       <View style={styles.progressContainer}>
         <View style={[styles.progressBarFilled, { width: `${progressPercent}%` }]} />
       </View>
       <Text style={styles.questionCounter}>Question {currentQ + 1} of {QUESTIONS.length}</Text>

       {/* Timer */}
       <View style={styles.timerRow}>
         <Timer size={20} color={timeLeft <= 3 ? '#ef4444' : '#fcd34d'} />
         <Text style={[styles.timerText, timeLeft <= 3 && styles.timerTextDanger]}>
           00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
         </Text>
       </View>

       {/* Question Card */}
       <View style={styles.questionCard}>
         <Text style={styles.questionText}>{question.question}</Text>
         
         <View style={styles.optionsContainer}>
           {question.options.map((option, index) => {
             const isSelected = selectedOption === index;
             const isCorrect = selectedOption !== null && index === question.correctIndex;
             const isWrong = isSelected && index !== question.correctIndex;
             
             let stateStyle = {};
             let textStyle = {};
             if (isCorrect) {
               stateStyle = styles.optionCorrect;
               textStyle = styles.optionTextWhite;
             } else if (isWrong) {
               stateStyle = styles.optionWrong;
               textStyle = styles.optionTextWhite;
             }
             
             // Also highlight correct answer if they got it wrong
             if (selectedOption !== null && !isCorrect && !isWrong && index === question.correctIndex) {
                 stateStyle = styles.optionCorrectGlow;
             }

             return (
               <TouchableOpacity 
                 key={index} 
                 style={[styles.optionBtn, stateStyle]}
                 onPress={() => handleSelectOption(index)}
                 disabled={selectedOption !== null}
                 activeOpacity={0.8}
               >
                 <Text style={[styles.optionText, textStyle]}>{option}</Text>
               </TouchableOpacity>
             )
           })}
         </View>
         
         {selectedOption === -1 && (
             <View style={styles.timeoutBanner}>
                 <AlertCircle size={20} color="#ef4444" />
                 <Text style={styles.timeoutText}>Time's up!</Text>
             </View>
         )}
       </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 350, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20 },
  closeBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '800' },
  
  progressContainer: { marginHorizontal: 20, height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 24, overflow: 'hidden' },
  progressBarFilled: { height: '100%', backgroundColor: '#fcd34d', borderRadius: 3 },
  questionCounter: { textAlign: 'center', color: 'rgba(255,255,255,0.8)', marginTop: 8, fontWeight: '600', fontSize: 12 },

  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 30, gap: 8 },
  timerText: { fontSize: 36, fontWeight: '800', color: 'white' },
  timerTextDanger: { color: '#ef4444' },

  questionCard: { marginHorizontal: 20, backgroundColor: 'white', borderRadius: 24, padding: 24, marginTop: 30, elevation: 6, shadowColor: '#000', shadowOffset: {height: 4, width: 0}, shadowOpacity: 0.1, shadowRadius: 12 },
  questionText: { fontSize: 22, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 32, lineHeight: 32 },
  
  optionsContainer: { gap: 16 },
  optionBtn: { padding: 20, backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center' },
  optionText: { fontSize: 16, fontWeight: '700', color: '#334155' },
  
  optionCorrect: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  optionCorrectGlow: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  optionWrong: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  optionTextWhite: { color: 'white' },

  timeoutBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 8 },
  timeoutText: { color: '#ef4444', fontWeight: '800', fontSize: 16 },

  resultsArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  trophyContainer: { alignItems: 'center', marginBottom: 40 },
  resultsTitle: { color: 'white', fontSize: 32, fontWeight: '800', marginTop: 24, marginBottom: 8 },
  resultsSub: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600' },
  
  creditsCard: { backgroundColor: 'white', width: '100%', borderRadius: 24, padding: 30, alignItems: 'center', marginBottom: 40, elevation: 10 },
  creditsLabel: { fontSize: 14, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  creditsValueRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  creditsValue: { fontSize: 40, fontWeight: '800', color: '#d97706' },
  creditsNote: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

  claimBtn: { backgroundColor: '#fcd34d', width: '100%', padding: 20, borderRadius: 16, alignItems: 'center' },
  claimBtnText: { color: '#b45309', fontSize: 18, fontWeight: '800' }
});
