import { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Blur, Canvas, ColorMatrix, Group, Paint, RoundedRect } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { GOO_BLUR, GOO_MATRIX, PILL_H } from './theme';

interface Props {
  fill: string;
  roundness: number;
  goo: boolean;
  pillX: SharedValue<number>;
  pillY: SharedValue<number>;
  pillW: SharedValue<number>;
  bodyX: SharedValue<number>;
  bodyY: SharedValue<number>;
  bodyW: SharedValue<number>;
  bodyH: SharedValue<number>;
}

/** The two shapes and the goo filter. No React state: Skia reads the shared values on the UI thread. */
export const GooShape = memo(function GooShape(p: Props) {
  const layer = useMemo(
    () =>
      p.goo ? (
        <Paint>
          <Blur blur={GOO_BLUR} />
          <ColorMatrix matrix={GOO_MATRIX} />
        </Paint>
      ) : undefined,
    [p.goo],
  );

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group layer={layer}>
        <RoundedRect x={p.pillX} y={p.pillY} width={p.pillW} height={PILL_H} r={PILL_H / 2} color={p.fill} />
        <RoundedRect x={p.bodyX} y={p.bodyY} width={p.bodyW} height={p.bodyH} r={p.roundness} color={p.fill} />
      </Group>
    </Canvas>
  );
});
