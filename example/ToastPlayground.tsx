// Drop into an Expo Router app as app/toast-playground.tsx
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { toast, type ToastPosition } from 'react-native-goo-toast';

const POSITIONS: ToastPosition[] = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function ToastPlayground() {
  const [position, setPosition] = useState<ToastPosition>('top-center');

  const fire: Record<string, () => void> = {
    Success: () => toast.success({ title: 'Saved', description: 'Your changes are live.', position }),
    Error: () => toast.error({ title: 'Upload failed', description: 'Check your connection and try again.', position }),
    Warning: () => toast.warning({ title: 'Low storage', description: 'Less than 500 MB left on this device.', position }),
    Info: () => toast.info({ title: 'New version ready', position }),
    Action: () =>
      toast.action({
        title: 'Message archived',
        description: 'You can find it in Archive.',
        button: { label: 'Undo', onPress: () => toast.success({ title: 'Restored', position }) },
        position,
      }),
    Icon: () => toast({ title: 'Custom icon', icon: <Text>🔥</Text>, position }),
    Promise: () =>
      toast.promise(wait(1800), {
        loading: { title: 'Uploading…', position },
        success: { title: 'Uploaded', description: '3 photos added to Trip to Cape Coast.', position },
        error: { title: 'Upload failed', position },
      }),
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.h1}>Playground</Text>
      <Text style={styles.label}>Position</Text>
      <View style={styles.wrap}>
        {POSITIONS.map((p) => (
          <Chip key={p} label={p} active={p === position} onPress={() => setPosition(p)} />
        ))}
      </View>
      <Text style={styles.label}>Fire</Text>
      <View style={styles.wrap}>
        {Object.entries(fire).map(([label, run]) => (
          <Chip key={label} label={label} onPress={run} />
        ))}
      </View>
      <Chip label="Clear all" onPress={() => toast.clear()} />
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, paddingTop: 120, gap: 12 },
  h1: { fontSize: 32, fontWeight: '700' },
  label: { marginTop: 12, fontSize: 13, opacity: 0.6, textTransform: 'uppercase' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: '#F1F1F3', alignSelf: 'flex-start' },
  chipActive: { backgroundColor: '#111113' },
  chipText: { fontSize: 14, fontWeight: '500', color: '#111113' },
  chipTextActive: { color: '#FFFFFF' },
});
