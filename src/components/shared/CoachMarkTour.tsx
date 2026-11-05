import React, { RefObject, useEffect, useRef, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, useWindowDimensions, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme, makeStyles } from '../../theme';

// A step points at a view (targetRef) or, for UI the screen doesn't own such as
// the tab bar, at a window rect computed on demand (getRect).
export type CoachMarkStep = {
  targetRef?: RefObject<View | null>;
  getRect?: () => Rect;
  title: string;
  body: string;
};

type Props = {
  visible: boolean;
  steps: CoachMarkStep[];
  // Called before a step is measured, e.g. to scroll its target into view.
  onBeforeStep?: (index: number) => Promise<void> | void;
  onFinish: (completed: boolean) => void;
};

export type Rect = { x: number; y: number; width: number; height: number };

const PAD = 8;
const RADIUS = 16;
const CARD_GAP = 14;
const CARD_MARGIN = 16;

// Full-screen dim with a rounded-rect hole cut out around the target (even-odd fill).
function holePath(screenW: number, screenH: number, r: Rect) {
  const x = r.x - PAD;
  const y = r.y - PAD;
  const w = r.width + PAD * 2;
  const h = r.height + PAD * 2;
  const rad = Math.min(RADIUS, w / 2, h / 2);
  return (
    `M0 0H${screenW}V${screenH}H0Z ` +
    `M${x + rad} ${y}H${x + w - rad}A${rad} ${rad} 0 0 1 ${x + w} ${y + rad}` +
    `V${y + h - rad}A${rad} ${rad} 0 0 1 ${x + w - rad} ${y + h}` +
    `H${x + rad}A${rad} ${rad} 0 0 1 ${x} ${y + h - rad}` +
    `V${y + rad}A${rad} ${rad} 0 0 1 ${x + rad} ${y}Z`
  );
}

function measure(step: CoachMarkStep): Promise<Rect | null> {
  if (step.getRect) return Promise.resolve(step.getRect());
  return new Promise((resolve) => {
    const node = step.targetRef?.current;
    if (!node) return resolve(null);
    node.measureInWindow((x, y, width, height) => {
      resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
    });
  });
}

export function CoachMarkTour({ visible, steps, onBeforeStep, onFinish }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardH, setCardH] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) setIndex(0);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    fade.setValue(0);
    setRect(null);
    (async () => {
      await onBeforeStep?.(index);
      const r = await measure(steps[index]);
      if (!active) return;
      if (!r) {
        // Target isn't on screen (e.g. hidden for this user) — skip it.
        if (index < steps.length - 1) setIndex(index + 1);
        else onFinish(true);
        return;
      }
      setRect(r);
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start();
    })();
    return () => { active = false; };
  }, [visible, index]);

  if (!visible) return null;

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const next = () => (isLast ? onFinish(true) : setIndex(index + 1));

  // Prefer placing the card below the spotlight; flip above when it wouldn't fit.
  let cardTop = 0;
  if (rect) {
    const below = rect.y + rect.height + PAD + CARD_GAP;
    const above = rect.y - PAD - CARD_GAP - cardH;
    cardTop = below + cardH <= screenH - CARD_MARGIN || above < CARD_MARGIN ? below : above;
    cardTop = Math.min(Math.max(cardTop, CARD_MARGIN), screenH - cardH - CARD_MARGIN);
  }

  return (
    // First-time users go through every step: no Skip, the Android back button is
    // ignored, and the full-screen layer swallows taps so nothing behind it
    // (including the highlighted element) can be pressed until "Got it".
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={styles.root} onStartShouldSetResponder={() => true}>
        {rect ? (
          <Svg width={screenW} height={screenH} style={styles.fill} pointerEvents="none">
            <Path d={holePath(screenW, screenH, rect)} fill={colors.overlay} fillRule="evenodd" />
          </Svg>
        ) : (
          <View style={[styles.fill, { backgroundColor: colors.overlay }]} pointerEvents="none" />
        )}

        {rect && (
          <Animated.View
            style={[styles.card, { top: cardTop, opacity: fade }]}
            onLayout={(e) => setCardH(e.nativeEvent.layout.height)}
          >
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.body}>{step.body}</Text>
            <View style={styles.footer}>
              <View style={styles.dots}>
                {steps.map((_, i) => (
                  <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
                ))}
              </View>
              <Text style={styles.counter}>{index + 1} of {steps.length}</Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={styles.nextBtn} onPress={next} activeOpacity={0.85}>
                <Text style={styles.nextText}>{isLast ? 'Got it' : 'Next'}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1 },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  card: {
    position: 'absolute',
    left: CARD_MARGIN,
    right: CARD_MARGIN,
    backgroundColor: c.surface,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  title: { fontSize: 17, fontWeight: '800', color: c.text, marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 20, color: c.textMuted },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.border },
  dotActive: { width: 16, backgroundColor: c.primary },
  counter: { fontSize: 12, color: c.textFaint, fontWeight: '600' },
  nextBtn: { backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999 },
  nextText: { fontSize: 14, fontWeight: '800', color: c.onPrimary },
}));
