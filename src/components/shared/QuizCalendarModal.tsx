import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Leaf, Flame, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { StatModal } from './StatModal';
import { useTheme, makeStyles } from '../../theme';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const HITSLOP = { top: 8, bottom: 8, left: 8, right: 8 };

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Monthly calendar popup for the Eco Quiz Streak card. Days the user played a
// quiz get a green leaf stamp with the date inside; other days show a plain
// faded number. Navigate month-by-month; future months are locked.
export function QuizCalendarModal({ visible, onClose, playedDates, streak }: {
  visible: boolean; onClose: () => void; playedDates: string[]; streak: number;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  // Every time it opens, start on the current month (not the last one browsed).
  useEffect(() => {
    if (visible) { const now = new Date(); setView({ y: now.getFullYear(), m: now.getMonth() }); }
  }, [visible]);

  const played = new Set(playedDates);
  const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate());

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const isCurrentMonth = view.y === today.getFullYear() && view.m === today.getMonth();

  const goPrev = () => setView(v => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const goNext = () => { if (!isCurrentMonth) setView(v => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 })); };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const playedThisMonth = cells.filter(d => d && played.has(ymd(view.y, view.m, d))).length;

  return (
    <StatModal visible={visible} onClose={onClose} title="Quiz calendar">
      <View style={s.navRow}>
        <TouchableOpacity onPress={goPrev} hitSlop={HITSLOP}><ChevronLeft size={20} color="#15803d" /></TouchableOpacity>
        <Text style={s.monthLabel}>{MONTHS[view.m]} {view.y}</Text>
        <TouchableOpacity onPress={goNext} disabled={isCurrentMonth} hitSlop={HITSLOP}>
          <ChevronRight size={20} color={isCurrentMonth ? colors.border : '#15803d'} />
        </TouchableOpacity>
      </View>

      <View style={s.weekRow}>
        {WEEKDAYS.map((w, i) => <Text key={i} style={s.weekDay}>{w}</Text>)}
      </View>

      <View style={s.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={s.cell} />;
          const ds = ymd(view.y, view.m, d);
          const isPlayed = played.has(ds);
          const isToday = ds === todayStr;
          return (
            <View key={i} style={s.cell}>
              <View style={[s.dayInner, isToday && s.todayRing]}>
                {isPlayed ? (
                  <View style={s.leafWrap}>
                    <View style={s.leafAbs}><Leaf size={34} color="#16a34a" fill="#bbf7d0" /></View>
                    <Text style={s.leafDate}>{d}</Text>
                  </View>
                ) : (
                  <Text style={s.plainDate}>{d}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <View style={s.footer}>
        <View style={s.footerItem}>
          <Leaf size={15} color="#16a34a" fill="#bbf7d0" />
          <Text style={s.footerText}>{playedThisMonth} {playedThisMonth === 1 ? 'quiz' : 'quizzes'} in {MONTHS[view.m]}</Text>
        </View>
        <View style={s.footerItem}>
          <Flame size={15} color="#fb923c" />
          <Text style={s.footerText}>{streak}-day streak</Text>
        </View>
      </View>
    </StatModal>
  );
}

const useStyles = makeStyles((c) => ({
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthLabel: { fontSize: 15, fontWeight: '800', color: c.text },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: c.textFaint },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', height: 42, alignItems: 'center', justifyContent: 'center' },
  dayInner: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  todayRing: { borderWidth: 2, borderColor: '#16a34a' },
  leafWrap: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  leafAbs: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  leafDate: { fontSize: 12, fontWeight: '900', color: '#14532d' },
  plainDate: { fontSize: 13, fontWeight: '600', color: c.textFaint },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerText: { fontSize: 12, fontWeight: '700', color: c.textMuted },
}));
