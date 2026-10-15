import type { ToastSound, ToastState } from './types';

/**
 * The core toast never imports expo-haptics or expo-audio. The optional add-ons
 * (`react-native-goo-toast/haptics`, `react-native-goo-toast/sounds`) register
 * themselves here, so apps that skip them never need those packages.
 */
export interface FeedbackDriver {
  haptic?: (state: ToastState) => void;
  sound?: (state: ToastState, override?: ToastSound) => void;
}

let driver: FeedbackDriver = {};

/** @internal */
export function registerFeedback(next: FeedbackDriver) {
  driver = { ...driver, ...next };
}

/** @internal */
export function unregisterFeedback(kind: keyof FeedbackDriver) {
  const { [kind]: _removed, ...rest } = driver;
  driver = rest;
}

/** @internal Called by a toast each time it shows new content. */
export function playFeedback(state: ToastState, haptics?: boolean, sound?: ToastSound) {
  try {
    if (haptics !== false) driver.haptic?.(state);
    if (sound !== false) driver.sound?.(state, sound);
  } catch {
    // Feedback is decoration; never let it break a toast.
  }
}
