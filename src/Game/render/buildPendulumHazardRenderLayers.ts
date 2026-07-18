import {
  RenderLayerData,
  ShapeTypes,
  createRectLayerBacking,
  withRenderLayerBacking,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { SWIMMER_BLOCK_CELL_BACKING_COLOR } from '@/assets/swimmerBlocks';
import type { PendulumHeadTransform } from '@/Game/hazards/pendulumMotion';

/** Vibrant danger red for pendulum head slab. */
export const PENDULUM_HEAD_COLOR = '#E8243A';
/** Dark purple/navy tether matching cave UI accents. */
export const PENDULUM_TETHER_COLOR = '#2A1B4A';
/** Low-opacity apex motion trail. */
export const PENDULUM_TRAIL_COLOR = 'rgba(232, 36, 58, 0.25)';

export type PendulumHazardRenderArgs = {
  headTransform: PendulumHeadTransform;
  columnWidth: number;
  blockHeight: number;
  tetherSnapped?: boolean;
  showTrail?: boolean;
};

/**
 * Layers are drawn in parent space with origin at the anchor pivot (bottom of anchor block).
 * Head stays upright (angle 0); only position follows the swing arc.
 * Tether spans anchor → hinge without spinning around a wrong pivot.
 */
export function buildPendulumHazardRenderLayers(
  args: PendulumHazardRenderArgs
): RenderLayerData[] {
  'worklet';
  const { headTransform, columnWidth, blockHeight, tetherSnapped, showTrail } = args;
  const layers: RenderLayerData[] = [];

  layers.push(
    withRenderLayerBacking(
      {
        position: { x: 0, y: -blockHeight * 0.5 },
        angle: 0,
        shape: {
          type: ShapeTypes.Rectangle,
          width: columnWidth,
          height: blockHeight,
        },
        visible: true,
      },
      createRectLayerBacking(
        SWIMMER_BLOCK_CELL_BACKING_COLOR,
        columnWidth,
        blockHeight,
        { borderRadius: 4 }
      )
    )
  );

  const hingeX = headTransform.hingeX;
  const hingeY = headTransform.hingeY;
  const headLocalX = headTransform.centerX;
  const headLocalY = headTransform.centerY;

  if (showTrail && !tetherSnapped) {
    layers.push(
      withRenderLayerBacking(
        {
          position: { x: headLocalX, y: headLocalY },
          angle: 0,
          shape: {
            type: ShapeTypes.Rectangle,
            width: headTransform.widthPx,
            height: headTransform.heightPx,
          },
          visible: true,
          opacity: 0.3,
        },
        createRectLayerBacking(
          PENDULUM_TRAIL_COLOR,
          headTransform.widthPx,
          headTransform.heightPx,
          { borderRadius: 4 }
        )
      )
    );
  }

  if (!tetherSnapped && hingeX * hingeX + hingeY * hingeY > 1) {
    const tetherLen = Math.sqrt(hingeX * hingeX + hingeY * hingeY);
    const tetherAngle = Math.atan2(hingeX, hingeY);
    layers.push(
      withRenderLayerBacking(
        {
          position: { x: hingeX * 0.5, y: hingeY * 0.5 },
          angle: tetherAngle,
          shape: {
            type: ShapeTypes.Rectangle,
            width: 2,
            height: tetherLen,
          },
          visible: true,
        },
        createRectLayerBacking(PENDULUM_TETHER_COLOR, 2, tetherLen, {
          borderRadius: 1,
        })
      )
    );
  }

  layers.push(
    withRenderLayerBacking(
      {
        position: { x: headLocalX, y: headLocalY },
        angle: 0,
        shape: {
          type: ShapeTypes.Rectangle,
          width: headTransform.widthPx,
          height: headTransform.heightPx,
        },
        visible: true,
      },
      createRectLayerBacking(
        PENDULUM_HEAD_COLOR,
        headTransform.widthPx,
        headTransform.heightPx,
        { borderRadius: 6 }
      )
    )
  );

  return layers;
}
