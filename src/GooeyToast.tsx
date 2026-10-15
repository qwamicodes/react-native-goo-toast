import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GooShape } from './GooShape';
import { playFeedback } from './feedback';
import { removeToast, toast } from './store';
import { ACCENT, BODY_MAX, FILL, GLYPH, MAX_W, OVERLAP, PAD, PILL_H, SPRING, isDarkFill } from './theme';
import type { ToastItem, ToastState } from './types';

interface Props {
  item: ToastItem;
  theme: 'light' | 'dark';
  offset: number;
}

const BADGE = 20;

export function GooeyToast({ item, theme, offset }: Props) {
  const { width: screenW } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  // ---- static layout -------------------------------------------------------
  const maxW = Math.min(screenW - 32, MAX_W);
  const canvasW = maxW + PAD * 2;
  const canvasH = PILL_H + BODY_MAX + PAD * 2;
  const isTop = item.position.startsWith('top');
  const align = item.position.endsWith('left') ? 'left' : item.position.endsWith('right') ? 'right' : 'center';
  const hidden = isTop ? -canvasH : canvasH;
  const pillTop = isTop ? PAD : canvasH - PAD - PILL_H;
  const left =
    align === 'left' ? 16 - PAD : align === 'right' ? screenW - 16 - maxW - PAD : (screenW - canvasW) / 2;

  // ---- content that is currently drawn (lags `item` during a morph) --------
  const [shown, setShown] = useState(item);
  const [titleW, setTitleW] = useState(0);
  const [bodyContentH, setBodyContentH] = useState(0);

  const fill = shown.fill ?? FILL[theme];
  const dark = isDarkFill(fill);
  const hasBody = Boolean(shown.description || shown.button);
  const hasBadge = shown.icon !== null;
  const targetPillW = Math.min(maxW, Math.max(PILL_H * 3, titleW + (hasBadge ? BADGE + 8 : 0) + 32));
  const targetBodyH = hasBody ? bodyContentH + OVERLAP + 4 : 0;

  // ---- shared values (UI thread) -------------------------------------------
  const y = useSharedValue(hidden);
  const drag = useSharedValue(0);
  const pillW = useSharedValue(PILL_H);
  const bodyH = useSharedValue(0);
  const bodyTarget = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const bodyOpacity = useSharedValue(0);

  const alignX = (w: number) => {
    'worklet';
    return PAD + (align === 'left' ? 0 : align === 'right' ? maxW - w : (maxW - w) / 2);
  };

  const to = (value: number, delay = 0, onDone?: (finished?: boolean) => void) => {
    'worklet';
    const a = reduced ? withTiming(value, { duration: 150 }, onDone) : withSpring(value, SPRING, onDone);
    return delay > 0 ? withDelay(delay, a) : a;
  };

  const pillX = useDerivedValue(() => alignX(pillW.value));
  const pillY = useDerivedValue(() => pillTop);
  const progress = useDerivedValue(() =>
    bodyTarget.value > 0 ? Math.min(1, Math.max(0, bodyH.value / bodyTarget.value)) : 0,
  );
  const bodyW = useDerivedValue(() => pillW.value + (maxW - pillW.value) * progress.value);
  const bodyX = useDerivedValue(() => alignX(bodyW.value));
  const bodyY = useDerivedValue(() =>
    isTop ? pillTop + PILL_H - OVERLAP : pillTop + OVERLAP - bodyH.value,
  );

  // ---- morph in whenever content or its measurements change ----------------
  const first = useRef(true);
  useEffect(() => {
    if (item.dismissed || titleW === 0 || (hasBody && bodyContentH === 0)) return;
    const d = first.current ? 120 : 0;
    if (first.current) {
      y.value = to(0);
      first.current = false;
    }
    bodyTarget.value = targetBodyH;
    pillW.value = to(targetPillW, d);
    titleOpacity.value = withDelay(d + 60, withTiming(1, { duration: 160 }));
    bodyH.value = to(targetBodyH, d + 220);
    bodyOpacity.value = withDelay(d + 300, withTiming(1, { duration: 180 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.version, targetPillW, targetBodyH]);

  // ---- optional haptic + sound (no-ops unless the add-ons are enabled) --------
  useEffect(() => {
    playFeedback(shown.state, shown.haptics, shown.sound);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.version]);

  // ---- new content arrived: collapse, swap, then the effect above re-expands -
  useEffect(() => {
    if (item.version === shown.version || item.dismissed) return;
    titleOpacity.value = withTiming(0, { duration: 100 });
    bodyOpacity.value = withTiming(0, { duration: 100 });
    bodyH.value = to(0);
    const t = setTimeout(() => setShown(item), reduced ? 150 : 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.version]);

  // ---- exit -------------------------------------------------------------------
  useEffect(() => {
    if (!item.dismissed) return;
    const id = item.id;
    titleOpacity.value = withTiming(0, { duration: 100 });
    bodyOpacity.value = withTiming(0, { duration: 100 });
    bodyH.value = to(0);
    pillW.value = to(PILL_H, 140);
    y.value = to(hidden, 300, (finished) => {
      'worklet';
      if (finished) runOnJS(removeToast)(id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.dismissed]);

  // ---- auto-dismiss timer, paused while touched ----------------------------------
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const remaining = useRef(0);
  const startedAt = useRef(0);
  const duration = shown.duration;
  const clearTimer = () => {
    if (timer.current !== undefined) clearTimeout(timer.current);
  };

  const startTimer = useCallback(
    (ms: number) => {
      clearTimer();
      startedAt.current = Date.now();
      remaining.current = ms;
      timer.current = setTimeout(() => toast.dismiss(item.id), ms);
    },
    [item.id],
  );
  const pause = useCallback(() => {
    if (duration == null) return;
    clearTimer();
    remaining.current -= Date.now() - startedAt.current;
  }, [duration]);
  const resume = useCallback(() => {
    if (duration == null) return;
    startTimer(Math.max(1200, remaining.current));
  }, [duration, startTimer]);
  const dismissSelf = useCallback(() => toast.dismiss(item.id), [item.id]);

  useEffect(() => {
    if (duration != null) startTimer(duration);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.version]);

  // ---- gestures ------------------------------------------------------------------
  const dir = isTop ? -1 : 1; // positive = toward the edge it came from
  const pan = Gesture.Pan()
    .onBegin(() => {
      runOnJS(pause)();
    })
    .onUpdate((e) => {
      const toward = e.translationY * dir > 0;
      drag.value = toward ? e.translationY : e.translationY * 0.2; // rubber band away from edge
    })
    .onEnd((e) => {
      if (e.translationY * dir > 30 || e.velocityY * dir > 600) runOnJS(dismissSelf)();
      else drag.value = withSpring(0, SPRING);
    })
    .onFinalize(() => {
      runOnJS(resume)();
    });

  const tap = Gesture.Tap().onEnd(() => {
    if (bodyTarget.value <= 0) return;
    const open = bodyH.value > bodyTarget.value / 2;
    bodyH.value = to(open ? 0 : bodyTarget.value);
    bodyOpacity.value = withTiming(open ? 0 : 1, { duration: open ? 100 : 180 });
  });

  const gesture = Gesture.Exclusive(pan, tap);

  // ---- animated styles ------------------------------------------------------------
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value + drag.value }],
  }));

  const hitStyle = useAnimatedStyle(() => {
    const visibleBody = Math.max(0, bodyH.value - OVERLAP);
    const w = Math.max(pillW.value, bodyW.value);
    return {
      left: alignX(w),
      top: isTop ? pillTop : pillTop - visibleBody,
      width: w,
      height: PILL_H + visibleBody,
    };
  });

  const titleRowStyle = useAnimatedStyle(() => {
    const w = Math.max(pillW.value, bodyW.value);
    return {
      left: alignX(pillW.value) - alignX(w),
      width: pillW.value,
      opacity: titleOpacity.value,
    };
  });

  const bodyStyle = useAnimatedStyle(() => {
    const w = Math.max(pillW.value, bodyW.value);
    return {
      left: PAD - alignX(w),
      opacity: bodyOpacity.value,
    };
  });

  const textColor = dark ? '#FFFFFF' : '#0A0A0A';
  const subColor = dark ? 'rgba(255,255,255,0.72)' : 'rgba(10,10,10,0.62)';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.container, { left, width: canvasW, height: canvasH }, isTop ? { top: insets.top + offset - PAD } : { bottom: insets.bottom + offset - PAD }, containerStyle]}
    >
      <GooShape
        fill={fill}
        roundness={shown.roundness ?? 18}
        goo={!reduced}
        pillX={pillX}
        pillY={pillY}
        pillW={pillW}
        bodyX={bodyX}
        bodyY={bodyY}
        bodyW={bodyW}
        bodyH={bodyH}
      />

      {/* Invisible copy of the title, measured to size the pill. */}
      <Text
        style={[styles.title, styles.measure]}
        numberOfLines={1}
        onLayout={(e) => setTitleW(Math.ceil(e.nativeEvent.layout.width))}
      >
        {shown.title}
      </Text>

      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[styles.hit, hitStyle]}
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityLabel={[shown.title, shown.description].filter(Boolean).join('. ')}
        >
          <Animated.View style={[styles.titleRow, isTop ? { top: 0 } : { bottom: 0 }, titleRowStyle]}>
            {hasBadge ? <Badge state={shown.state} icon={shown.icon} /> : null}
            <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
              {shown.title}
            </Text>
          </Animated.View>

          {hasBody ? (
            <Animated.View
              style={[styles.body, { width: maxW }, isTop ? { top: PILL_H } : { top: 0 }, bodyStyle]}
              onLayout={(e) => setBodyContentH(Math.min(BODY_MAX - OVERLAP, Math.ceil(e.nativeEvent.layout.height)))}
            >
              {shown.description ? (
                <Text style={[styles.desc, { color: subColor }]} numberOfLines={4}>
                  {shown.description}
                </Text>
              ) : null}
              {shown.button ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={shown.button.label}
                  onPress={() => {
                    shown.button?.onPress();
                    toast.dismiss(item.id);
                  }}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: ACCENT[shown.state], opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={styles.buttonLabel}>{shown.button.label}</Text>
                </Pressable>
              ) : null}
            </Animated.View>
          ) : null}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

function Badge({ state, icon }: { state: ToastState; icon: ToastItem['icon'] }) {
  if (icon !== undefined && icon !== null) return <View style={styles.badgeBox}>{icon}</View>;
  if (state === 'loading') {
    return <ActivityIndicator size="small" color={ACCENT.loading} style={styles.badgeBox} />;
  }
  return (
    <View style={[styles.badgeBox, styles.badge, { backgroundColor: ACCENT[state] }]}>
      <Text style={styles.glyph}>{GLYPH[state]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', zIndex: 9999 },
  measure: { position: 'absolute', opacity: 0, left: 0, top: 0 },
  hit: { position: 'absolute' },
  titleRow: {
    position: 'absolute',
    height: PILL_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  title: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  body: { position: 'absolute', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 14, gap: 12 },
  desc: { fontSize: 14, lineHeight: 19, textAlign: 'center' },
  button: { alignSelf: 'center', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  buttonLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  badgeBox: { width: BADGE, height: BADGE, alignItems: 'center', justifyContent: 'center' },
  badge: { borderRadius: BADGE / 2 },
  glyph: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
