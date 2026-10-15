import * as Haptics from 'expo-haptics';
import { registerFeedback, unregisterFeedback } from './feedback';
import type { ToastState } from './types';

export type HapticMap = Partial<Record<ToastState, (() => Promise<void>) | false>>;

const DEFAULT_HAPTICS: Record<ToastState, (() => Promise<void>) | false> = {
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  info: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  action: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  loading: false,
};

/**
 * Opt in to haptics. Call once at startup. Requires `expo-haptics`.
 *
 * ```ts
 * import { enableHaptics } from 'react-native-goo-toast/haptics';
 * enableHaptics();                                  // system defaults
 * enableHaptics({ info: false });                   // silence a state
 * ```
 */
export function enableHaptics(overrides: HapticMap = {}) {
  const map = { ...DEFAULT_HAPTICS, ...overrides };
  registerFeedback({
    haptic: (state) => {
      const play = map[state];
      if (play) play().catch(() => {});
    },
  });
}

export function disableHaptics() {
  unregisterFeedback('haptic');
}
