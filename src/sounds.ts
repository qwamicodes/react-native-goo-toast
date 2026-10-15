import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { registerFeedback, unregisterFeedback } from './feedback';
import type { ToastSound, ToastState } from './types';

export type ToastSounds = Partial<Record<ToastState, ToastSound>>;

/** CC0 sounds by Kenney (kenney.nl), via soundcn. */
export const DEFAULT_SOUNDS: Record<ToastState, ToastSound> = {
  success: require('../assets/sounds/success.mp3'),
  error: require('../assets/sounds/error.mp3'),
  warning: require('../assets/sounds/warning.mp3'),
  info: require('../assets/sounds/info.mp3'),
  action: require('../assets/sounds/action.mp3'),
  loading: false,
};

export interface SoundOptions {
  /** Per-state overrides, merged over the bundled set. `false` silences a state. */
  sounds?: ToastSounds;
  /** 0 to 1. Default 0.5. */
  volume?: number;
  /**
   * Set the app's audio session to mix with other audio and respect the silent switch.
   * Turn off if your app manages its own audio session. Default true.
   */
  configureAudioSession?: boolean;
}

const players = new Map<Exclude<ToastSound, false>, AudioPlayer>();

function playerFor(source: Exclude<ToastSound, false>): AudioPlayer {
  let player = players.get(source);
  if (!player) {
    player = createAudioPlayer(source);
    players.set(source, player);
  }
  return player;
}

/**
 * Opt in to sounds. Call once at startup. Requires `expo-audio`.
 *
 * ```ts
 * import { enableSounds } from 'react-native-goo-toast/sounds';
 * enableSounds({ volume: 0.4, sounds: { success: require('./assets/sounds/coin.mp3') } });
 * ```
 */
export function enableSounds({ sounds, volume = 0.5, configureAudioSession = true }: SoundOptions = {}) {
  const map = { ...DEFAULT_SOUNDS, ...sounds };

  if (configureAudioSession) {
    // UI sounds never pause the user's music and stay quiet on silent, like keyboard clicks.
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }

  // Preload so the first toast plays with no delay.
  for (const source of Object.values(map)) if (source !== false) playerFor(source);

  registerFeedback({
    sound: (state, override) => {
      const source = override ?? map[state];
      if (source === false) return;
      const player = playerFor(source);
      player.volume = volume;
      player.seekTo(0).catch(() => {});
      player.play();
    },
  });
}

/** Stop playing sounds and free the cached players. */
export function disableSounds() {
  unregisterFeedback('sound');
  players.forEach((p) => p.remove());
  players.clear();
}
