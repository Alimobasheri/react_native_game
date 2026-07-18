import {
  RenderLayerData,
  ShapeTypes,
  createRectLayerBacking,
  withRenderLayerBacking,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { pistonHazardTuning } from '@/config/pistonHazardTuning';
import type { PistonPose } from '@/Game/hazards/pistonMotion';

/**
 * Layers are parent-local with origin at (headCenterX, mountY) world →
 * caller sets RenderComponent.position to mount column X / mount Y.
 *
 * PS-TODO-010: base sparks / dust trail at piston base while moving.
 * PS-TODO-011: foam burst particles on bounce (owned by strike FX, not here).
 */
export type PistonHazardRenderArgs = {
  pose: PistonPose;
  columnWidth: number;
};

export function buildPistonHazardRenderLayers(
  args: PistonHazardRenderArgs
): RenderLayerData[] {
  'worklet';
  const { pose, columnWidth } = args;
  const layers: RenderLayerData[] = [];

  const trackWidth = Math.max(
    2,
    pistonHazardTuning.TRACK_WIDTH_PX * (columnWidth / 60)
  );
  const trackLen = Math.abs(pose.trackTipY - pose.trackBaseY);
  // Local: mount at y=0; tip is negative (floor) or positive (ceiling).
  const tipLocalY = pose.trackTipY - pose.mountY;
  const trackMidY = tipLocalY * 0.5;

  layers.push(
    withRenderLayerBacking(
      {
        position: { x: 0, y: trackMidY },
        angle: 0,
        shape: {
          type: ShapeTypes.Rectangle,
          width: trackWidth,
          height: Math.max(trackLen, 1),
        },
        visible: true,
      },
      createRectLayerBacking(
        pistonHazardTuning.TRACK_COLOR,
        trackWidth,
        Math.max(trackLen, 1),
        { borderRadius: 1 }
      )
    )
  );

  const headLocalY = pose.headCenterY - pose.mountY;
  const pulse = pose.telegraphPulse01;
  const headColor =
    pulse > 0.05
      ? pistonHazardTuning.HEAD_TELEGRAPH_COLOR
      : pistonHazardTuning.HEAD_COLOR;
  const headOpacity = pulse > 0.05 ? 0.75 + 0.25 * pulse : 1;

  layers.push(
    withRenderLayerBacking(
      {
        position: { x: 0, y: headLocalY },
        angle: 0,
        shape: {
          type: ShapeTypes.Rectangle,
          width: pose.widthPx,
          height: pose.heightPx,
        },
        visible: true,
        opacity: headOpacity,
      },
      createRectLayerBacking(headColor, pose.widthPx, pose.heightPx, {
        borderRadius: Math.min(pose.widthPx, pose.heightPx) * 0.45,
      })
    )
  );

  return layers;
}
