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
import { ContainerComponentData, ContainerComponentName } from '@/Game/ecs-components/Container';
import { LAYOUT_CONSTANTS } from '@/Layout';

// Water difficulty progression - slowly increase water/obstacle speed over time
// to create a gentle but noticeable rise in challenge, like a hyper-casual game.
const WATER_SPEED_ACCELERATION_PER_SECOND = 3; // px/s² - +90 px/s after ~30s
const WATER_SPEED_MAX = 260; // clamp to avoid impossible speeds
const FLOW_ACCEL_PER_SECOND = 3.4;
const FLOW_IMPULSE_ON_ROW_CHANGE = 3.2;
const FLOW_IMPULSE_BLEND_PER_SECOND = 3.4;
const FLOW_DRAG_PER_SECOND = 0.2;
const FLOW_OFFSET_SCALE = 6.8;
const FLOW_OFFSET_RETURN_PER_SECOND = 1.8;
const GAP_BLEND_SPEED_PER_SECOND = 5.4;
const SURGE_RISE_PER_SECOND = 2.1;
const SURGE_DECAY_PER_SECOND = 0.2;
const SURFACE_CENTER_SMOOTH_PER_SECOND = 1.2;
const CURVE_AMP_SMOOTH_PER_SECOND = 0.9;
const CURVE_TILT_SMOOTH_PER_SECOND = 1.3;
const CALMNESS_SMOOTH_PER_SECOND = 9;
const BAND_HEIGHT_SMOOTH_PER_SECOND = 8;
const MIN_BAND_HALF_HEIGHT = 0.01;
const MAX_BAND_HALF_HEIGHT = 0.5;

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
    const clamp01 = (value: number) => {
      'worklet';
      return Math.max(0, Math.min(1, value));
    };
    const clampSigned = (value: number, absMax: number) => {
      'worklet';
      return Math.max(-absMax, Math.min(absMax, value));
    };
    const smoothStep01 = (t: number) => {
      'worklet';
      const c = clamp01(t);
      return c * c * (3 - 2 * c);
    };

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
      const currentRowEntity = activeRow ? waterData.centerRowEntity : undefined;
      const hasRowChanged =
        typeof currentRowEntity === 'number' &&
        currentRowEntity !== waterData.lastCenterRowEntity;
      const gapCenterDelta = Math.abs(gapCenterNorm - prevGapCenterNorm);
      const pressureFromWidth = clamp01((1 - gapWidthNorm) * 1.15);
      const pressure = clamp01(pressureFromWidth * 0.75 + gapCenterDelta * 1.25);
      const widthDelta = (prevGapEndNorm - prevGapStartNorm) - gapWidthNorm;
      const narrowing = Math.max(0, widthDelta);
      const oldFlowVelocity = waterData.flowVelocity ?? waterData.flowDirection ?? 0;
      const referenceCenter = waterData.surfaceCurveCenterNorm ?? gapCenterNorm;
      const gapDirectionDelta = gapCenterNorm - referenceCenter;
      const normalizedDirectionDelta = clampSigned(
        gapDirectionDelta / Math.max(gapWidthNorm, 0.08),
        1
      );
      const targetFlowDirection = clampSigned(normalizedDirectionDelta * 1.9, 1);
      const rowChangeImpulse = hasRowChanged
        ? clampSigned(normalizedDirectionDelta * FLOW_IMPULSE_ON_ROW_CHANGE, 1.2)
        : 0;
      let flowVelocity =
        oldFlowVelocity +
        (targetFlowDirection - oldFlowVelocity) * FLOW_ACCEL_PER_SECOND * deltaSeconds +
        rowChangeImpulse * Math.min(1, FLOW_IMPULSE_BLEND_PER_SECOND * deltaSeconds);
      flowVelocity *= Math.exp(-FLOW_DRAG_PER_SECOND * deltaSeconds);
      flowVelocity = clampSigned(flowVelocity, 1.25);
      let flowOffset = (waterData.flowOffset ?? 0) + flowVelocity * deltaSeconds * FLOW_OFFSET_SCALE;
      const oldSurgeEnergy = waterData.surgeEnergy ?? waterData.surgePhase ?? 0;
      const surgeTarget = hasRowChanged
        ? clamp01(0.5 + pressure * 0.4 + Math.abs(normalizedDirectionDelta) * 0.2)
        : clamp01(pressure * 0.16 + Math.abs(flowVelocity) * 0.1);
      const nextSurgeEnergy = surgeTarget > oldSurgeEnergy
        ? oldSurgeEnergy +
        (surgeTarget - oldSurgeEnergy) *
        Math.min(1, SURGE_RISE_PER_SECOND * deltaSeconds)
        : Math.max(
          0,
          oldSurgeEnergy - SURGE_DECAY_PER_SECOND * deltaSeconds * (0.55 + pressure * 0.45)
        );
      flowOffset *= Math.exp(
        -FLOW_OFFSET_RETURN_PER_SECOND * deltaSeconds * (0.5 + clamp01(1 - nextSurgeEnergy) * 0.5)
      );
      flowOffset = clampSigned(flowOffset, 1.0);
      const rowHeightPx = containerData.width / LAYOUT_CONSTANTS.COLUMNS;
      const lockAheadY = containerData.waterSurfaceY - rowHeightPx * 0.42;
      const transitionTargetY = lockAheadY - rowHeightPx * 0.28;
      const transitionStartY = transitionTargetY - rowHeightPx * 0.48;
      const transitionEndY = transitionTargetY + rowHeightPx * 0.36;
      const geometricBlend = activeRow
        ? smoothStep01(
          (activeRow.y - transitionStartY) /
          Math.max(0.0001, transitionEndY - transitionStartY)
        )
        : 1;
      const timeBlend = hasRowChanged
        ? 0
        : Math.min(1, (waterData.gapBlend ?? 1) + GAP_BLEND_SPEED_PER_SECOND * deltaSeconds);
      const nextGapBlend = Math.min(geometricBlend, timeBlend);
      const blendedGapStart = prevGapStartNorm + (gapStartNorm - prevGapStartNorm) * nextGapBlend;
      const blendedGapEnd = prevGapEndNorm + (gapEndNorm - prevGapEndNorm) * nextGapBlend;
      const blendedGapWidth = Math.max(0.02, blendedGapEnd - blendedGapStart);
      const blendedGapCenter = (blendedGapStart + blendedGapEnd) / 2;

      const surfaceBandCenterYRaw = activeRow
        ? 1 - (activeRow.y - containerTop) / containerData.height
        : 1 - (containerData.waterSurfaceY - containerTop) / containerData.height;
      const surfaceBandCenterY = Math.max(0, Math.min(1, surfaceBandCenterYRaw));
      const dynamicBandHalfHeight = Math.max(
        MIN_BAND_HALF_HEIGHT,
        Math.min(MAX_BAND_HALF_HEIGHT, rowHeightNorm * (0.75 + pressure * 0.7))
      );
      const wideGap = clamp01((gapWidthNorm - 0.22) / 0.56);
      const lowFlow = 1 - clamp01(Math.abs(flowVelocity) / 0.65);
      const lowSurge = 1 - clamp01(nextSurgeEnergy / 0.75);
      const calmnessTarget = clamp01(wideGap * 0.62 + lowFlow * 0.23 + lowSurge * 0.15);

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
          const oldCalmness = water.calmness ?? calmnessTarget;
          const oldCurveCenter = water.surfaceCurveCenterNorm ?? gapCenterNorm;
          const oldCurveAmp = water.surfaceCurveAmp ?? 0.008;
          const oldCurveTilt = water.surfaceCurveTilt ?? 0;
          water.baseSpeed = clampedSpeed;
          water.centerRowEntity = currentRowEntity;
          water.lastCenterRowEntity = currentRowEntity;
          water.forceDirection = flowVelocity;
          water.flowDirection = flowVelocity;
          water.flowVelocity = flowVelocity;
          water.flowOffset = flowOffset;
          water.currentGapStartNorm = gapStartNorm;
          water.currentGapEndNorm = gapEndNorm;
          water.prevGapStartNorm = hasRowChanged ? oldGapStart : (water.prevGapStartNorm ?? prevGapStartNorm);
          water.prevGapEndNorm = hasRowChanged ? oldGapEnd : (water.prevGapEndNorm ?? prevGapEndNorm);
          water.gapCenterNorm = gapCenterNorm;
          water.gapWidthNorm = gapWidthNorm;
          water.gapBlend = hasRowChanged ? 0 : nextGapBlend;
          water.surgePhase = nextSurgeEnergy;
          water.surgeEnergy = nextSurgeEnergy;
          const centerStep = Math.min(1, SURFACE_CENTER_SMOOTH_PER_SECOND * deltaSeconds);
          water.surfaceBandCenterY = oldBandCenter + (surfaceBandCenterY - oldBandCenter) * centerStep;
          const bandHeightStep = Math.min(0.01, BAND_HEIGHT_SMOOTH_PER_SECOND * deltaSeconds);
          water.surfaceBandHalfHeight =
            oldBandHalfHeight + (dynamicBandHalfHeight - oldBandHalfHeight) * bandHeightStep;
          const calmnessStep = Math.min(1, CALMNESS_SMOOTH_PER_SECOND * deltaSeconds);
          const calmness = oldCalmness + (calmnessTarget - oldCalmness) * calmnessStep;
          water.calmness = calmness;
          const centerMargin = Math.max(0.01, Math.min(0.08, blendedGapWidth * 0.2));
          const flowCarry = blendedGapWidth * (0.28 + nextSurgeEnergy * 0.24);
          const curveCenterTarget = Math.max(
            blendedGapStart - flowCarry * 0.45,
            Math.min(blendedGapEnd + flowCarry * 0.45, blendedGapCenter + flowOffset * flowCarry)
          );
          const curveAmpTarget = Math.max(
            0.002,
            Math.min(0.03, (0.003 + pressure * 0.012 + nextSurgeEnergy * 0.009 + narrowing * 0.022) * (1 - calmness * 0.46))
          ) * 2;
          const curveTiltTarget = flowVelocity * (0.008 + nextSurgeEnergy * 0.015) * (0.6 + pressure * 0.65);
          const curveCenterStep = Math.min(1, SURFACE_CENTER_SMOOTH_PER_SECOND * deltaSeconds);
          const curveAmpStep = Math.min(1, CURVE_AMP_SMOOTH_PER_SECOND * deltaSeconds);
          const curveTiltStep = Math.min(1, CURVE_TILT_SMOOTH_PER_SECOND * deltaSeconds);
          const curveCenter = oldCurveCenter + (curveCenterTarget - oldCurveCenter) * curveCenterStep;
          const curveAmp = oldCurveAmp + (curveAmpTarget - oldCurveAmp) * curveAmpStep;
          const curveTilt = oldCurveTilt + (curveTiltTarget - oldCurveTilt) * curveTiltStep;
          water.surfaceCurveCenterNorm = curveCenter;
          water.surfaceCurveAmp = curveAmp;
          water.surfaceCurveTilt = curveTilt;
          // Keep legacy parameters coherent while shader migration settles.
          water.peakHeight = curveAmp * 0.85;
          water.peakSharpness = 1.15 + pressure * 0.7;
          water.troughDepth = 0.001 + pressure * 0.01;
          water.flowWaveSpeedScale = 0.00014 + Math.abs(flowVelocity) * 0.00035 + nextSurgeEnergy * 0.0002;

          const targetSpeed = water.baseSpeed * (1 + multiply * 0.1);
          const diff = targetSpeed - water.baseSpeed;
          if (diff > 0) {
            water.raisingSpeed = Math.min(water.raisingSpeed + diff * 0.1, targetSpeed);
          } else if (diff < 0) {
            water.raisingSpeed = Math.max(water.raisingSpeed + diff * 0.1, targetSpeed);
          }
        }
      );
    });
  },
};

