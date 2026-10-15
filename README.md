# react-native-goo-toast

Gooey, physics-based morphing toasts for React Native. A pill springs in, fits its title, then a body grows out of it like liquid, the way the Dynamic Island does.

Inspired by [Sileo](https://github.com/hiaaryan/sileo) by Aaryan (MIT), rebuilt natively: no WebView, no SVG filters, every frame on the UI thread.

## How it works

- Two Skia `RoundedRect`s, a pill and a body, inside one `Group`.
- The group's layer paint applies `Blur` then a `ColorMatrix` alpha threshold. Blur softens both shapes; the threshold snaps the edge back hard. Where they overlap, they fuse into one blob.
- Reanimated shared values drive every x, width and height straight into Skia props. No React re-renders while animating.
- Text, icon and button live in a normal RN overlay outside the filter, so they stay crisp.
- Gesture Handler: swipe toward the edge to dismiss, tap to expand or collapse the body. Timers pause while touched.

## Install

```sh
bunx expo install react-native-goo-toast @shopify/react-native-skia react-native-reanimated react-native-gesture-handler react-native-safe-area-context
```

Haptics and sounds are optional add-ons. Skip them and you never install `expo-haptics` or `expo-audio`.

Until it's on npm, install from GitHub:

```sh
bun add github:qwamicodes/react-native-goo-toast
```

The package ships TypeScript source; Metro compiles it.

## Setup

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'react-native-goo-toast';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack />
        <Toaster position="top-center" theme="system" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

## Usage

```ts
import { toast } from 'react-native-goo-toast';

toast.success({ title: 'Saved', description: 'Your changes are live.' });
toast.error({ title: 'Upload failed' });
toast.warning({ title: 'Low storage' });
toast.info({ title: 'New version ready' });

toast.action({
  title: 'Message archived',
  button: { label: 'Undo', onPress: restore },
});

// One toast morphs loading -> success or error
toast.promise(upload(), {
  loading: { title: 'Uploading…' },
  success: (res) => ({ title: 'Uploaded', description: `${res.count} photos added` }),
  error: { title: 'Upload failed' },
});

const id = toast.loading({ title: 'Syncing' });
toast.update(id, 'success', { title: 'Synced' });
toast.dismiss(id);
toast.clear();          // all
toast.clear('bottom-center');
```

One toast is visible per position. Firing another at the same position morphs the current one into the new content instead of stacking.

## Options

| Option | Type | Default | |
| --- | --- | --- | --- |
| `title` | `string` | required | Shown in the pill |
| `description` | `string` | | Grows out as the body |
| `position` | `ToastPosition` | Toaster's | `top-left` … `bottom-right` |
| `duration` | `number \| null` | `6000` | `null` stays until dismissed |
| `icon` | `ReactNode \| null` | state badge | `null` hides the badge |
| `fill` | `string` | theme | Shape colour; text adapts to it |
| `roundness` | `number` | `18` | Body corner radius |
| `button` | `{ label, onPress }` | | Action button in the body |
| `haptics` | `boolean` | `true` | Haptic for this toast, when enabled |
| `sound` | `ToastSound \| false` | state's | Sound for this toast, when enabled |

`<Toaster>` props: `position`, `theme` (`light` \| `dark` \| `system`), `offset`, `options` (defaults for every toast).

## Haptics and sounds (optional)

Both are off by default and live in separate entry points, so the core never imports `expo-haptics` or `expo-audio`. Turn on either, both, or neither, once at startup.

```sh
bunx expo install expo-haptics   # for haptics
bunx expo install expo-audio     # for sounds
```

```ts
// app/_layout.tsx
import { enableHaptics } from 'react-native-goo-toast/haptics';
import { enableSounds } from 'react-native-goo-toast/sounds';

enableHaptics();                       // success/error/warning notification, light tap for info/action
enableSounds({ volume: 0.4 });         // bundled set below
```

Customise or silence per state, or per toast:

```ts
enableHaptics({ info: false });
enableSounds({ sounds: { success: require('./assets/sounds/coin.mp3'), info: false } });

toast.success({ title: 'Level up', sound: require('./assets/sounds/fanfare.mp3') });
toast.error({ title: 'Quiet one', sound: false, haptics: false });
```

`disableHaptics()` and `disableSounds()` turn them off again, e.g. from a settings toggle.

The bundled sounds are CC0 by [Kenney](https://kenney.nl), picked from [soundcn](https://soundcn.xyz): `success-chime`, `error-buzz`, `glass-001` (warning), `notification-pop` (info), `confirmation-001` (action). Loading is silent. By default they mix with the user's music instead of pausing it and stay quiet on silent mode; pass `configureAudioSession: false` if your app manages its own audio session.

### soundcn, for mobile

soundcn ships sounds as base64 inside `.ts` files for the Web Audio API. On mobile you want real audio assets, so the package includes a small CLI that pulls any freely licensed soundcn sound into your app as an `.mp3`:

```sh
bunx goo-sound search chime
bunx goo-sound add success-chime click-soft --dir assets/sounds
```

It prints the `require` line to paste, and skips anything not freely licensed (soundcn's Blizzard collection is all rights reserved).

## Tuning the goo

In `src/theme.ts`:

- `GOO_BLUR` (8): higher means a thicker, softer neck between pill and body.
- `GOO_MATRIX` alpha row (`20, -8`): raise the multiplier for a crisper edge, lower the offset for more merging.
- `OVERLAP` (14): how far the body tucks under the pill.
- `SPRING` (damping 18, stiffness 220, mass 0.9): the feel of every move.

## Accessibility

- Announced as an alert with a polite live region.
- With Reduce Motion on, the goo is skipped and springs become 150 ms fades.

## Playground

`example/ToastPlayground.tsx` fires every state at every position, like Sileo's playground. Drop it into an Expo Router app as a screen.

## Phases

1. Goo shape and morph playground (built)
2. Store, Toaster, positions, gestures, timers (built)
3. Promise morphing, themes, reduced motion (built)
4. Optional sound and haptic effects (built: `/haptics`, `/sounds`, `goo-sound` CLI)
5. Performance pass, tests, Maestro flow, npm publish

## Roadmap

- Keyboard-aware bottom positions
- Stacked mode
- Soft shadow for light fills on light backgrounds
- Publish to npm

## License

MIT. Original web concept: Sileo by Aaryan, MIT. Bundled sounds: Kenney, CC0, via soundcn by Kapish Dima (MIT).
