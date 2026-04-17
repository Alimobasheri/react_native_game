import {
  System,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  WaterComponentName,
  WaterComponentData,
} from '@/Game/ecs-components/Water';
import {
  SwimmerComponentName,
  SwimmerComponentData,
} from '@/Game/ecs-components/Swimmer';
import { ObstacleRowComponentName, ObstacleRowComponentData } from '@/Game/ecs-components/ObstacleRowComponent';
import { RenderComponentData, RenderComponentName } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { ContainerComponentData, ContainerComponentName } from '@/Game/ecs-components/Container';
import { LAYOUT_CONSTANTS } from '@/Layout';

// Water difficulty progression - slowly increase water/obstacle speed over time
// to create a gentle but noticeable rise in challenge, like a hyper-casual game.
const WATER_SPEED_ACCELERATION_PER_SECOND = 3; // px/s² - +90 px/s after ~30s
const WATER_SPEED_MAX = 260; // clamp to avoid impossible speeds
const FLOW_DIRECTION_SMOOTH_PER_SECOND = 6;
const GAP_BLEND_SPEED_PER_SECOND = 3.6;
const SURGE_DECAY_PER_SECOND = 6;
const SURFACE_CENTER_SMOOTH_PER_SECOND = 10;
const BAND_HEIGHT_SMOOTH_PER_SECOND = 8;
const PEAK_SHAPE_SMOOTH_PER_SECOND = 1;
const MIN_BAND_HALF_HEIGHT = 0.04;
const MAX_BAND_HALF_HEIGHT = 0.11;

/**
 * WaterPhysicsSystem - Owns water gameplay properties (speed, difficulty ramp).
 *
 * Responsibilities:
 * - Keeps water "conceptual speed" (`Water.raisingSpeed`) progressing over time.
 * - Drives difficulty curve used by swimmer physics and obstacle movement/spawning.
 * - Only ramps speed once the game has exited the initial rising phase.
 *
 * NOTE: Visual shader logic remains in `WaterShaderSystem`, and swimmer movement
 * remains in `SwimmerPhysicsSystem`. This system only mutates `Water` data.
 */
export const WaterPhysicsSystem: System = {
  requiredComponents: [WaterComponentName],
  process: ({ entities, components, deltaTime, ecs }) => {
    'worklet';

    if (entities.length === 0) {
      return;
    }

    const deltaSeconds = deltaTime / 1000;

    // Determine game phase based on first swimmer (they should all be in sync).
    // We only start ramping difficulty after the initial water rising phase.
    const swimmerEntities = ecs.getEntitiesWithComponents([
      SwimmerComponentName,
    ]);

    let isInInitialPhase = true;
    if (swimmerEntities.length > 0) {
      const firstSwimmer = components[SwimmerComponentName]?.get(
        swimmerEntities[0]
      ) as SwimmerComponentData | undefined;
      if (firstSwimmer) {
        isInInitialPhase = firstSwimmer.isInInitialPhase;
      }
    }

    if (isInInitialPhase) {
      return;
    }

    const containerEntities = ecs.getEntitiesWithComponents([
      ContainerComponentName,
    ]);
    if (containerEntities.length === 0) {
      return;
    }
    const containerData = components[ContainerComponentName]?.get(
      containerEntities[0]
    ) as ContainerComponentData | undefined;
    if (!containerData || containerData.height <= 0) {
      return;
    }
    const containerTop = containerData.centerY - containerData.height / 2;
    const rowHeightNorm = (containerData.width / LAYOUT_CONSTANTS.COLUMNS) / containerData.height;

    const getGapRangeNorm = (row: ObstacleRowComponentData | null): [number, number] => {
      'worklet';
      if (!row) {
        return [1 / LAYOUT_CONSTANTS.COLUMNS, (LAYOUT_CONSTANTS.COLUMNS - 1) / LAYOUT_CONSTANTS.COLUMNS];
      }
      const gaps = row.gaps;
      if (!gaps || gaps.length === 0) {
        return [1 / LAYOUT_CONSTANTS.COLUMNS, (LAYOUT_CONSTANTS.COLUMNS - 1) / LAYOUT_CONSTANTS.COLUMNS];
      }
      const startCol = Math.min(...gaps);
      const endCol = Math.max(...gaps);
      const start = Math.max(0, Math.min(1, startCol / LAYOUT_CONSTANTS.COLUMNS));
      const end = Math.max(start + 0.01, Math.min(1, (endCol + 1) / LAYOUT_CONSTANTS.COLUMNS));
      return [start, end];
    };

    entities.forEach((waterEntity) => {
      const waterData = components[WaterComponentName]?.get(
        waterEntity
      ) as WaterComponentData | undefined;

      if (!waterData) {
        return;
      }

      const currentSpeed = waterData.baseSpeed ?? 0;
      const acceleratedSpeed =
        currentSpeed + WATER_SPEED_ACCELERATION_PER_SECOND * deltaSeconds;
      const clampedSpeed = Math.min(WATER_SPEED_MAX, acceleratedSpeed);
      const activeRow = waterData.centerRowEntity
        ? components[ObstacleRowComponentName].get(waterData.centerRowEntity) as ObstacleRowComponentData | undefined
        : undefined;
      const prevRow = activeRow?.prevRowEntity
        ? components[ObstacleRowComponentName].get(activeRow.prevRowEntity) as ObstacleRowComponentData | undefined
        : undefined;
      const [gapStartNorm, gapEndNorm] = getGapRangeNorm(activeRow ?? null);
      const [prevGapStartNorm, prevGapEndNorm] = getGapRangeNorm(prevRow ?? null);
      const gapWidthNorm = Math.max(0.01, gapEndNorm - gapStartNorm);
      const gapCenterNorm = (gapStartNorm + gapEndNorm) / 2;

      const prevGapCenterNorm = (prevGapStartNorm + prevGapEndNorm) / 2;
      const targetFlowDirection = gapCenterNorm === prevGapCenterNorm ? 0 : gapCenterNorm < prevGapCenterNorm ? -1 : 1;
      const currentFlowDirection = waterData.flowDirection ?? 0;
      const flowStep = FLOW_DIRECTION_SMOOTH_PER_SECOND * deltaSeconds;
      const flowDirection =
        targetFlowDirection < currentFlowDirection
          ? Math.max(targetFlowDirection, currentFlowDirection - flowStep)
          : Math.min(targetFlowDirection, currentFlowDirection + flowStep);

      const currentRowEntity = activeRow ? waterData.centerRowEntity : undefined;
      const hasRowChanged =
        typeof currentRowEntity === 'number' &&
        currentRowEntity !== waterData.lastCenterRowEntity;
      const gapCenterDelta = Math.abs(gapCenterNorm - prevGapCenterNorm);
      const pressureFromWidth = 1 - Math.min(1, gapWidthNorm);
      const pressure = Math.max(0, Math.min(1, pressureFromWidth * 0.7 + gapCenterDelta * 1.5 * 0.3));
      const widthDelta = (prevGapEndNorm - prevGapStartNorm) - gapWidthNorm;
      const narrowing = Math.max(0, widthDelta);
      const widening = Math.max(0, -widthDelta);
      const nextSurge = hasRowChanged
        ? 1
        : Math.max(0, (waterData.surgePhase ?? 0) - SURGE_DECAY_PER_SECOND * deltaSeconds);
      const nextGapBlend = hasRowChanged
        ? 0
        : Math.min(1, (waterData.gapBlend ?? 1) + GAP_BLEND_SPEED_PER_SECOND * deltaSeconds);

      const surfaceBandCenterYRaw = activeRow
        ? 1 - (activeRow.y - containerTop) / containerData.height
        : 1 - (containerData.waterSurfaceY - containerTop) / containerData.height;
      const surfaceBandCenterY = Math.max(0, Math.min(1, surfaceBandCenterYRaw));
      const dynamicBandHalfHeight = Math.max(
        MIN_BAND_HALF_HEIGHT,
        Math.min(MAX_BAND_HALF_HEIGHT, rowHeightNorm * (0.75 + pressure * 0.7))
      );

      const gapsLength = activeRow?.gaps?.length ?? 0;
      let multiply = gapsLength / LAYOUT_CONSTANTS.COLUMNS;
      multiply = 1 / (multiply || 1);

      ecs.updateComponent<WaterComponentData>(
        waterEntity,
        WaterComponentName,
        (water) => {
          const oldGapStart = water.currentGapStartNorm ?? prevGapStartNorm;
          const oldGapEnd = water.currentGapEndNorm ?? prevGapEndNorm;
          const oldBandCenter = water.surfaceBandCenterY ?? surfaceBandCenterY;
          const oldBandHalfHeight = water.surfaceBandHalfHeight ?? dynamicBandHalfHeight;
          const oldPeakHeight = water.peakHeight ?? 0.008;
          const oldPeakSharpness = water.peakSharpness ?? 1.1;
          const oldTroughDepth = water.troughDepth ?? 0.006;
          const oldFlowWaveSpeedScale = water.flowWaveSpeedScale ?? 0.00025;
          water.baseSpeed = clampedSpeed;
          water.centerRowEntity = currentRowEntity;
          water.lastCenterRowEntity = currentRowEntity;
          water.forceDirection = flowDirection;
          water.flowDirection = flowDirection;
          water.currentGapStartNorm = gapStartNorm;
          water.currentGapEndNorm = gapEndNorm;
          water.prevGapStartNorm = hasRowChanged ? oldGapStart : (water.prevGapStartNorm ?? prevGapStartNorm);
          water.prevGapEndNorm = hasRowChanged ? oldGapEnd : (water.prevGapEndNorm ?? prevGapEndNorm);
          water.gapCenterNorm = gapCenterNorm;
          water.gapWidthNorm = gapWidthNorm;
          water.gapBlend = hasRowChanged ? 0 : nextGapBlend;
          water.surgePhase = hasRowChanged ? 0.65 + pressure * 0.35 : nextSurge;
          const centerStep = Math.min(1, SURFACE_CENTER_SMOOTH_PER_SECOND * deltaSeconds);
          water.surfaceBandCenterY = oldBandCenter + (surfaceBandCenterY - oldBandCenter) * centerStep;
          const bandHeightStep = Math.min(1, BAND_HEIGHT_SMOOTH_PER_SECOND * deltaSeconds);
          water.surfaceBandHalfHeight =
            oldBandHalfHeight + (dynamicBandHalfHeight - oldBandHalfHeight) * bandHeightStep;

          const peakBoost = pressure * 0.03 + narrowing * 0.08;
          const widenFlatten = widening * 0.03;
          const peakHeightTarget = Math.max(0.002, Math.min(0.06, 0.004 + peakBoost - widenFlatten));
          const peakSharpnessTarget = Math.max(1.0, Math.min(2.2, 1.0 + pressure * 0.6 + narrowing * 2.5));
          const troughDepthTarget = Math.max(0.001, Math.min(0.035, 0.002 + pressure * 0.016 + narrowing * 0.018));
          const flowWaveSpeedScaleTarget = Math.max(0.00012, Math.min(0.0008, 0.00015 + Math.abs(flowDirection) * 0.00045 + nextSurge * 0.0002));
          const peakStep = Math.min(1, PEAK_SHAPE_SMOOTH_PER_SECOND * deltaSeconds);
          water.peakHeight = oldPeakHeight + (peakHeightTarget - oldPeakHeight) * peakStep;
          water.peakSharpness = oldPeakSharpness + (peakSharpnessTarget - oldPeakSharpness) * peakStep;
          water.troughDepth = oldTroughDepth + (troughDepthTarget - oldTroughDepth) * peakStep;
          water.flowWaveSpeedScale =
            oldFlowWaveSpeedScale + (flowWaveSpeedScaleTarget - oldFlowWaveSpeedScale) * peakStep;

          const targetSpeed = water.baseSpeed * (1 + multiply * 0.1);
          const diff = targetSpeed - water.baseSpeed;
          if (diff > 0) {
            water.raisingSpeed = Math.min(water.raisingSpeed + diff * 0.1, targetSpeed);
          } else if (diff < 0) {
            water.raisingSpeed = Math.max(water.raisingSpeed + diff * 0.1, targetSpeed);
          }
        }
      );
      ecs.updateComponent<RenderComponentData>(
        waterEntity,
        RenderComponentName,
        (renderComponent) => {
          'worklet';
          if (!renderComponent.shader) return;
        }
      );
    });
  },
};

