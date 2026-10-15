import { useSyncExternalStore } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { GooeyToast } from './GooeyToast';
import { setToastDefaults, toastStore } from './store';
import type { ToastOptions, ToastPosition, ToastTheme } from './types';

export interface ToasterProps {
  /** Default position for every toast. Default `top-center`. */
  position?: ToastPosition;
  /** `system` follows the OS colour scheme. Default `system`. */
  theme?: ToastTheme;
  /** Extra distance from the safe-area edge, in px. Default 8. */
  offset?: number;
  /** Defaults merged into every toast (duration, fill, roundness, haptics, sound). */
  options?: Partial<Omit<ToastOptions, 'title' | 'position'>>;
}

/** Mount once at the root of your app, above your navigator. */
export function Toaster({ position = 'top-center', theme = 'system', offset = 8, options }: ToasterProps) {
  setToastDefaults({ position, ...options });
  const items = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, toastStore.getSnapshot);
  const scheme = useColorScheme();
  const resolved = theme === 'system' ? (scheme === 'dark' ? 'dark' : 'light') : theme;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {items.map((item) => (
        <GooeyToast key={item.id} item={item} theme={resolved} offset={offset} />
      ))}
    </View>
  );
}
