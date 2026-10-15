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
bunx expo install react-native-goo-toast @shopify/react-native-skia react-native-reanimated react-native-gesture-handler react-native-safe-area-context expo-haptics expo-audio
```

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
| `haptics` | `boolean` | `true` | Haptic per state |
| `sound` | `ToastSound \| false` | Toaster's | Sound for this toast |

`<Toaster>` props: `position`, `theme` (`light` \| `dark` \| `system`), `offset`, `options` (defaults for every toast), `sounds` (per-state map or `false`), `volume` (0 to 1, default 0.5).

## Sounds

Every state plays a short sound alongside its haptic. The built-in set is CC0 by [Kenney](https://kenney.nl), picked from [soundcn](https://soundcn.xyz): `success-chime`, `error-buzz`, `glass-001` (warning), `notification-pop` (info), `confirmation-001` (action). Loading is silent.

Sounds mix with the user's music instead of pausing it, and stay quiet when the iPhone is on silent, like system keyboard clicks.

```tsx
<Toaster sounds={{ success: require('./assets/sounds/coin.mp3') }} volume={0.4} />
<Toaster sounds={false} /> // all off

toast.success({ title: 'Level up', sound: require('./assets/sounds/fanfare.mp3') });
toast.info({ title: 'Quiet one', sound: false });
```

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

## Roadmap

- Keyboard-aware bottom positions
- Stacked mode
- Soft shadow for light fills on light backgrounds
- Publish to npm

## License

MIT. Original web concept: Sileo by Aaryan, MIT. Bundled sounds: Kenney, CC0, via soundcn by Kapish Dima (MIT).
