import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioSource } from 'expo-audio';
import type { ToastState } from './types';

/** Anything expo-audio can play: `require('./pop.mp3')`, a file uri, a URL. `false` mutes. */
export type ToastSound = Exclude<AudioSource, null> | false;
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

interface SoundConfig {
  enabled: boolean;
  volume: number;
  sounds: Record<ToastState, ToastSound>;
}

let config: SoundConfig = { enabled: true, volume: 0.5, sounds: DEFAULT_SOUNDS };
let audioModeSet = false;
const players = new Map<ToastSound, AudioPlayer>();

/** @internal Called by <Toaster />. */
export function setSoundConfig(sounds: ToastSounds | false | undefined, volume: number | undefined) {
  config = {
    enabled: sounds !== false,
    volume: volume ?? 0.5,
    sounds: { ...DEFAULT_SOUNDS, ...(sounds || {}) },
  };
}

function playerFor(source: Exclude<ToastSound, false>): AudioPlayer {
  let player = players.get(source);
  if (!player) {
    player = createAudioPlayer(source);
    players.set(source, player);
  }
  return player;
}

/**
 * UI sounds should never stop the user's music, and should respect the silent switch,
 * like iOS's own keyboard clicks. Mix with others, stay quiet in silent mode.
 */
function ensureAudioMode() {
  if (audioModeSet) return;
  audioModeSet = true;
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
}

/** @internal Plays the sound for a toast. `override` is the toast's own `sound` option. */
export function playToastSound(state: ToastState, override?: ToastSound) {
  if (!config.enabled || override === false) return;
  const source = override ?? config.sounds[state];
  if (!source) return;
  try {
    ensureAudioMode();
    const player = playerFor(source);
    player.volume = config.volume;
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // Audio is decoration; never let it break a toast.
  }
}

/** Decode the sounds ahead of time so the first toast plays with no delay. */
export function preloadToastSounds() {
  if (!config.enabled) return;
  for (const source of Object.values(config.sounds)) {
    if (source) playerFor(source);
  }
}
