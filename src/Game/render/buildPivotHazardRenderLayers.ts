import {
  RenderLayerData,
  ShapeTypes,
  createRectLayerBacking,
  withRenderLayerBacking,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { SWIMMER_BLOCK_CELL_BACKING_COLOR } from '@/assets/swimmerBlocks';
import type { ArmWorldTransform } from '@/Game/hazards/pivotMotion';
import { buildPivotHubSizePx } from '@/Game/hazards/pivotArmSpawn';

export type PivotHazardRenderArgs = {
  hubX: number;
  hubY: number;
  columnWidth: number;
  armTransforms: readonly ArmWorldTransform[];
};

export function buildPivotHazardRenderLayers(
  args: PivotHazardRenderArgs
): RenderLayerData[] {
  'worklet';
  const clayColor = SWIMMER_BLOCK_CELL_BACKING_COLOR;
  const hubSize = buildPivotHubSizePx(args.columnWidth);
  const layers: RenderLayerData[] = [];

  layers.push(
    withRenderLayerBacking(
      {
        position: { x: 0, y: 0 },
        shape: {
          type: ShapeTypes.Rectangle,
          width: hubSize,
          height: hubSize,
        },
        visible: true,
      },
      createRectLayerBacking(clayColor, hubSize, hubSize, {
        borderRadius: hubSize * 0.12,
      })
    )
  );

  for (let i = 0; i < args.armTransforms.length; i++) {
    const t = args.armTransforms[i];
    const localX = t.centerX - args.hubX;
    const localY = t.centerY - args.hubY;
    layers.push(
      withRenderLayerBacking(
        {
          position: { x: localX, y: localY },
          angle: t.angleRad,
          shape: {
            type: ShapeTypes.Rectangle,
            width: t.lengthPx,
            height: t.thicknessPx,
          },
          visible: true,
        },
        createRectLayerBacking(clayColor, t.lengthPx, t.thicknessPx, {
          borderRadius: Math.min(t.lengthPx, t.thicknessPx) * 0.08,
        })
      )
    );
  }

  return layers;
}
