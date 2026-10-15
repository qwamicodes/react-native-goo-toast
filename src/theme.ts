import type { ToastState } from './types';

export const PILL_H = 36;
export const PAD = 16; // room around the shapes so the blur never clips
export const OVERLAP = 14; // body tucks under the pill so a neck forms
export const BODY_MAX = 240;
export const MAX_W = 380;

export const SPRING = { damping: 18, stiffness: 220, mass: 0.9 };

/** Goo tuning: blur softens both shapes, the alpha row snaps the edge back hard. */
export const GOO_BLUR = 8;
export const GOO_MATRIX = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 20, -8];

export const FILL = { light: '#FFFFFF', dark: '#141416' } as const;

export const ACCENT: Record<ToastState, string> = {
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  action: '#8B5CF6',
  loading: '#A1A1AA',
};

export const GLYPH: Record<Exclude<ToastState, 'loading'>, string> = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
  action: '→',
};

/** True when text on this fill should be light. Accepts #rgb or #rrggbb. */
export function isDarkFill(hex: string): boolean {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return false;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}
