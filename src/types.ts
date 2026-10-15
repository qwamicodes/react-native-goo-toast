import type { ReactNode } from 'react';
import type { ToastSound } from './sound';

export type ToastState = 'success' | 'error' | 'warning' | 'info' | 'action' | 'loading';

export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type ToastTheme = 'light' | 'dark' | 'system';

export interface ToastButton {
  /** Button label shown in the toast body. */
  label: string;
  /** Called when the button is pressed. The toast dismisses afterwards. */
  onPress: () => void;
}

export interface ToastOptions {
  /** Heading shown inside the pill. */
  title: string;
  /** Body text that grows out of the pill. */
  description?: string;
  /** Override the Toaster's default position for this toast. */
  position?: ToastPosition;
  /** Auto-dismiss after this many ms. `null` keeps it until dismissed. Default 6000. */
  duration?: number | null;
  /** Custom icon for the badge. `null` hides the badge. */
  icon?: ReactNode | null;
  /** Background colour of the toast shape. Defaults to the theme's fill. */
  fill?: string;
  /** Corner radius of the body. Default 18. */
  roundness?: number;
  /** Optional action button rendered in the body. */
  button?: ToastButton;
  /** Play a haptic matching the state. Default true. */
  haptics?: boolean;
  /** Sound for this toast. Defaults to the Toaster's sound for the state; `false` mutes it. */
  sound?: ToastSound;
}

export interface ToastItem extends ToastOptions {
  id: string;
  state: ToastState;
  position: ToastPosition;
  /** Bumped every time the toast's content changes, which triggers a morph. */
  version: number;
  dismissed: boolean;
}

export type ToastMessage<T> = ToastOptions | ((value: T) => ToastOptions);

export interface PromiseMessages<T> {
  loading: ToastOptions;
  success: ToastMessage<T>;
  error: ToastMessage<unknown>;
}
