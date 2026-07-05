import {
  System,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { firstDataFromStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
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
import {
  groupGapsToRanges,
  matchRanges,
  packRangesToVec4Pairs,
  pickUpToFourByWidth,
  rangeCenter,
  rangesColToNorm,
  rangeWidth,
} from '@/Game/water/gapRanges';
import { platformShaftTuning } from '@/config/platformShaftTuning';
import { gameSessionTuning, waterPhysicsTuning } from '@/config/swimmerTuning';
import { getGameSession, isStartReady, isGameOverPhase } from '@/Game/session/gameSessionQuery';
import { waterTransitionBandFromSurface } from '@/Game/grid/waterTransitionBand';
import { syncWaterShaderGameplayUniforms } from '@/Game/water/syncWaterShaderGameplayUniforms';
import {
  RenderComponentData,
  RenderComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';

/**
 * Row spawned earlier sits lower on screen (larger `y`). When `prevRowEntity` still
 * references a removed entity, gap blending falls back as if there were no previous
 * row — surface/current can disagree with real stones. Pick the live row with the
 * smallest positive (y_prev - y_active).
 */
function resolvePrevObstacleRowForWater(
  rowStore: ComponentStore<ObstacleRowComponentData> | undefined,
  centerRowEntity: Entity | undefined,
  activeRow: ObstacleRowComponentData | undefined
): ObstacleRowComponentData | undefined {
  'worklet';
  if (!activeRow || !rowStore) {
    return undefined;
  }
  const linkedId = activeRow.prevRowEntity;
  if (typeof linkedId === 'number') {
    const linked = rowStore.get(linkedId);
    if (linked) {
      return linked;
    }
  }
  let best: ObstacleRowComponentData | undefined;
  let bestDy = Number.POSITIVE_INFINITY;
  const y0 = activeRow.y;
  rowStore.forEach((entity, rowData) => {
    if (entity === centerRowEntity) {
      return;
    }
    const dy = rowData.y - y0;
    if (dy > 0 && dy < bestDy) {
      bestDy = dy;
      best = rowData;
    }
  });
  return best;
}

/**
 * WaterPhysicsSystem - Owns water gameplay properties (gap flow, calmness, shader inputs).
 *
 * Responsibilities:
 * - Drives gap blend, lateral flow, calmness, and surface curve state on `Water`.
 * - Macro `raisingSpeed` / `baseSpeed` are owned by StageSpeedSystem.
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

    const firstSwimmer = firstDataFromStore(components[SwimmerComponentName]) as
      | SwimmerComponentData
      | undefined;
    const isInInitialPhase = firstSwimmer?.isInInitialPhase ?? true;
    const session = getGameSession(components);

    if (isInInitialPhase || isStartReady(session) || isGameOverPhase(session)) {
      return;
    }

    if (
      session &&
      session.speedRampStartMs > 0 &&
      Date.now() - session.speedRampStartMs < gameSessionTuning.SPEED_RAMP_MS
    ) {
      return;
    }

    const containerData = firstDataFromStore(
      components[ContainerComponentName]
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

    const rowGaps = (row: ObstacleRowComponentData | null | undefined): number[] | undefined => {
      'worklet';
      if (!row) return undefined;
      return row.effectiveGaps ?? row.gaps;
    };

    const getGapRangeNorm = (row: ObstacleRowComponentData | null): [number, number] => {
      'worklet';
      if (!row) {
        return [1 / LAYOUT_CONSTANTS.COLUMNS, (LAYOUT_CONSTANTS.COLUMNS - 1) / LAYOUT_CONSTANTS.COLUMNS];
      }
      const gaps = rowGaps(row);
      if (!gaps || gaps.length === 0) {
        return [1 / LAYOUT_CONSTANTS.COLUMNS, (LAYOUT_CONSTANTS.COLUMNS - 1) / LAYOUT_CONSTANTS.COLUMNS];
      }
      const startCol = Math.min(...gaps);
      const endCol = Math.max(...gaps);
      const start = Math.max(0, Math.min(1, startCol / LAYOUT_CONSTANTS.COLUMNS));
      const end = Math.max(start + 0.01, Math.min(1, (endCol + 1) / LAYOUT_CONSTANTS.COLUMNS));
      return [start, end];
    };

    const lerp4 = (
      from: [number, number, number, number],
      to: [number, number, number, number],
      t: number
    ): [number, number, number, number] => {
      'worklet';
      const c = clamp01(t);
      return [
        from[0] + (to[0] - from[0]) * c,
        from[1] + (to[1] - from[1]) * c,
        from[2] + (to[2] - from[2]) * c,
        from[3] + (to[3] - from[3]) * c,
      ];
    };

    entities.forEach((waterEntity) => {
      const waterData = components[WaterComponentName]?.get(
        waterEntity
      ) as WaterComponentData | undefined;

      if (!waterData) {
        return;
      }

      const centerEnt = waterData.centerRowEntity;
      const activeRow =
        typeof centerEnt === 'number'
          ? (components[ObstacleRowComponentName].get(centerEnt) as ObstacleRowComponentData | undefined)
          : undefined;
      const prevRow = resolvePrevObstacleRowForWater(
        components[ObstacleRowComponentName],
        centerEnt,
        activeRow
      );

      // --- Multi-gap derived state (max 4 ranges) ---
      const currRangesCol = groupGapsToRanges(rowGaps(activeRow), LAYOUT_CONSTANTS.COLUMNS);
      const prevRangesCol = groupGapsToRanges(rowGaps(prevRow), LAYOUT_CONSTANTS.COLUMNS);
      const currRanges = pickUpToFourByWidth(
        rangesColToNorm(currRangesCol, LAYOUT_CONSTANTS.COLUMNS)
      );
      const prevRanges = pickUpToFourByWidth(
        rangesColToNorm(prevRangesCol, LAYOUT_CONSTANTS.COLUMNS)
      );
      const links = matchRanges(currRanges, prevRanges);
      const packedCurr = packRangesToVec4Pairs(currRanges);
      const packedPrev = packRangesToVec4Pairs(prevRanges);
      const prevFlow = waterData.flowPerRange ?? [0, 0, 0, 0];
      const nextFlow: [number, number, number, number] = [
        prevFlow[0],
        prevFlow[1],
        prevFlow[2],
        prevFlow[3],
      ];
      const platformFlow = waterData.platformFlowPerRange ?? [0, 0, 0, 0];
      const platformPressFlow = platformFlow[0];

      // Per-range target flow based on (currCenter - relatedPrevCenter) in normalized gap space.
      for (let i = 0; i < 4; i++) {
        if (i >= currRanges.length || currRanges.length === 0 || prevRanges.length === 0) {
          const v = nextFlow[i] * Math.exp(-waterPhysicsTuning.FLOW_DRAG_PER_SECOND * deltaSeconds);
          nextFlow[i] = clampSigned(v, 1.25);
          continue;
        }
        const c = currRanges[i];
        const link = links[i];
        const prevA = prevRanges[link.prevA] ?? prevRanges[0];
        const prevB = typeof link.prevB === 'number' ? prevRanges[link.prevB] : undefined;
        const blendA = typeof link.blendA === 'number' ? clamp01(link.blendA) : 1;
        const prevCenter = prevB
          ? rangeCenter(prevA) * blendA + rangeCenter(prevB) * (1 - blendA)
          : rangeCenter(prevA);
        const cCenter = rangeCenter(c);
        const cWidth = Math.max(0.08, rangeWidth(c));
        const normalizedDirectionDelta = clampSigned((cCenter - prevCenter) / cWidth, 1);
        const targetFlowDirection = clampSigned(normalizedDirectionDelta * 1.9, 1);
        let v =
          nextFlow[i] +
          (targetFlowDirection - nextFlow[i]) * waterPhysicsTuning.FLOW_ACCEL_PER_SECOND * deltaSeconds;
        v *= Math.exp(-waterPhysicsTuning.FLOW_DRAG_PER_SECOND * deltaSeconds);
        nextFlow[i] = clampSigned(v, 1.25);
      }

      // Per-range crest amplitude budget split by gap width share.
      const widths = [
        currRanges[0] ? rangeWidth(currRanges[0]) : 0,
        currRanges[1] ? rangeWidth(currRanges[1]) : 0,
        currRanges[2] ? rangeWidth(currRanges[2]) : 0,
        currRanges[3] ? rangeWidth(currRanges[3]) : 0,
      ] as const;
      const totalOpen = widths[0] + widths[1] + widths[2] + widths[3];
      const avgAbsFlow =
        (Math.abs(nextFlow[0]) +
          Math.abs(nextFlow[1]) +
          Math.abs(nextFlow[2]) +
          Math.abs(nextFlow[3]) +
          Math.abs(platformPressFlow)) /
        Math.max(1, currRanges.length);
      const pressureTotal = clamp01((1 - Math.min(1, totalOpen)) * 0.72 + clamp01(avgAbsFlow / 1.25) * 0.28);
      const ampTotal = Math.max(0.002, Math.min(0.03, 0.003 + pressureTotal * 0.016));
      const ampPerRange: [number, number, number, number] = [
        totalOpen > 0 ? ampTotal * (widths[0] / totalOpen) : 0,
        totalOpen > 0 ? ampTotal * (widths[1] / totalOpen) : 0,
        totalOpen > 0 ? ampTotal * (widths[2] / totalOpen) : 0,
        totalOpen > 0 ? ampTotal * (widths[3] / totalOpen) : 0,
      ];
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
      const prevCenterGapWidthNorm = waterData.prevCenterGapWidthNorm;
      const sameRowNarrowing =
        !hasRowChanged && typeof prevCenterGapWidthNorm === 'number'
          ? Math.max(0, prevCenterGapWidthNorm - gapWidthNorm)
          : 0;
      const pressureFromWidth = clamp01((1 - gapWidthNorm) * 1.15);
      const pressure = clamp01(
        pressureFromWidth * 0.75 + gapCenterDelta * 1.25 + sameRowNarrowing * 0.85
      );
      const widthDelta = (prevGapEndNorm - prevGapStartNorm) - gapWidthNorm;
      const narrowing = Math.max(0, widthDelta);
      const effectiveNarrowing = narrowing + sameRowNarrowing;
      const oldFlowVelocity = waterData.forceDirection ?? 0;
      const referenceCenter = waterData.surfaceCurveCenterNorm ?? gapCenterNorm;
      const gapDirectionDelta = gapCenterNorm - referenceCenter;
      const normalizedDirectionDelta = clampSigned(
        gapDirectionDelta / Math.max(gapWidthNorm, 0.08),
        1
      );
      const targetFlowDirection = clampSigned(normalizedDirectionDelta * 1.9, 1);
      const rowChangeImpulse = hasRowChanged
        ? clampSigned(normalizedDirectionDelta * waterPhysicsTuning.FLOW_IMPULSE_ON_ROW_CHANGE, 1.2)
        : 0;
      let flowVelocity =
        oldFlowVelocity +
        (targetFlowDirection - oldFlowVelocity) * waterPhysicsTuning.FLOW_ACCEL_PER_SECOND * deltaSeconds +
        rowChangeImpulse * Math.min(1, waterPhysicsTuning.FLOW_IMPULSE_BLEND_PER_SECOND * deltaSeconds);
      flowVelocity *= Math.exp(-waterPhysicsTuning.FLOW_DRAG_PER_SECOND * deltaSeconds);
      flowVelocity = clampSigned(flowVelocity, 1.25);
      const platformSurgeBump =
        Math.abs(platformPressFlow) > 0.05
          ? Math.abs(platformPressFlow) * platformShaftTuning.FLOW_SURFACE_SURGE_BUMP
          : 0;
      const surfaceFlow = clampSigned(
        flowVelocity + platformPressFlow * platformShaftTuning.FLOW_SURFACE_GAIN,
        1.25
      );
      let flowOffset =
        (waterData.flowOffset ?? 0) + surfaceFlow * deltaSeconds * waterPhysicsTuning.FLOW_OFFSET_SCALE;
      const oldSurgeEnergy = waterData.surgeEnergy ?? waterData.surgePhase ?? 0;
      const surgeTarget = hasRowChanged
        ? clamp01(0.5 + pressure * 0.4 + Math.abs(normalizedDirectionDelta) * 0.2)
        : clamp01(pressure * 0.16 + Math.abs(surfaceFlow) * 0.1 + platformSurgeBump);
      const nextSurgeEnergy = surgeTarget > oldSurgeEnergy
        ? oldSurgeEnergy +
        (surgeTarget - oldSurgeEnergy) *
        Math.min(1, waterPhysicsTuning.SURGE_RISE_PER_SECOND * deltaSeconds)
        : Math.max(
          0,
          oldSurgeEnergy - waterPhysicsTuning.SURGE_DECAY_PER_SECOND * deltaSeconds * (0.55 + pressure * 0.45)
        );
      flowOffset *= Math.exp(
        -waterPhysicsTuning.FLOW_OFFSET_RETURN_PER_SECOND * deltaSeconds * (0.5 + clamp01(1 - nextSurgeEnergy) * 0.5)
      );
      flowOffset = clampSigned(flowOffset, 1.0);
      const rowHeightPx = containerData.width / LAYOUT_CONSTANTS.COLUMNS;
      const transitionBand = waterTransitionBandFromSurface(
        containerData.waterSurfaceY,
        rowHeightPx
      );
      const transitionStartY = transitionBand.transitionStartY;
      const transitionEndY = transitionBand.transitionEndY;
      const geometricBlend = activeRow
        ? smoothStep01(
          (activeRow.y - transitionStartY) /
          Math.max(0.0001, transitionEndY - transitionStartY)
        )
        : 1;
      const timeBlend = hasRowChanged
        ? 0
        : Math.min(1, (waterData.gapBlend ?? 1) + waterPhysicsTuning.GAP_BLEND_SPEED_PER_SECOND * deltaSeconds);
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
        waterPhysicsTuning.MIN_BAND_HALF_HEIGHT,
        Math.min(waterPhysicsTuning.MAX_BAND_HALF_HEIGHT, rowHeightNorm * (0.75 + pressure * 0.7))
      );
      const wideGap = clamp01((gapWidthNorm - 0.22) / 0.56);
      const lowFlow = 1 - clamp01(Math.abs(surfaceFlow) / 0.65);
      const lowSurge = 1 - clamp01(nextSurgeEnergy / 0.75);
      const calmnessTarget = clamp01(wideGap * 0.62 + lowFlow * 0.23 + lowSurge * 0.15);

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
          water.centerRowEntity = currentRowEntity;
          water.lastCenterRowEntity = currentRowEntity;
          water.forceDirection = flowVelocity;
          water.flowDirection = surfaceFlow;
          water.flowVelocity = surfaceFlow;
          water.flowOffset = flowOffset;
          water.gapRangesCurr01 = packedCurr.r01;
          water.gapRangesCurr23 = packedCurr.r23;
          water.gapRangesPrev01 = packedPrev.r01;
          water.gapRangesPrev23 = packedPrev.r23;
          water.gapRangeCount = packedCurr.count;
          for (let pf = 0; pf < 4; pf++) {
            nextFlow[pf] = clampSigned(nextFlow[pf] + platformFlow[pf], 1.25);
          }
          water.flowPerRange = nextFlow;
          water.platformFlowPerRange = [0, 0, 0, 0];
          water.ampPerRange = ampPerRange;
          water.currentGapStartNorm = gapStartNorm;
          water.currentGapEndNorm = gapEndNorm;
          water.prevGapStartNorm = hasRowChanged ? oldGapStart : (water.prevGapStartNorm ?? prevGapStartNorm);
          water.prevGapEndNorm = hasRowChanged ? oldGapEnd : (water.prevGapEndNorm ?? prevGapEndNorm);
          const oldDisplayStart = water.displayGapStartNorm ?? oldGapStart;
          const oldDisplayEnd = water.displayGapEndNorm ?? oldGapEnd;
          const oldDisplayR01 = water.displayGapRangesCurr01 ?? packedCurr.r01;
          const oldDisplayR23 = water.displayGapRangesCurr23 ?? packedCurr.r23;
          if (hasRowChanged) {
            water.displayGapStartNorm = oldGapStart;
            water.displayGapEndNorm = oldGapEnd;
            water.displayGapRangesCurr01 = oldDisplayR01;
            water.displayGapRangesCurr23 = oldDisplayR23;
          }
          const rowTransition = nextGapBlend < 0.999;
          if (rowTransition) {
            water.displayGapStartNorm =
              prevGapStartNorm + (gapStartNorm - prevGapStartNorm) * nextGapBlend;
            water.displayGapEndNorm =
              prevGapEndNorm + (gapEndNorm - prevGapEndNorm) * nextGapBlend;
            water.displayGapRangesCurr01 = lerp4(packedPrev.r01, packedCurr.r01, nextGapBlend);
            water.displayGapRangesCurr23 = lerp4(packedPrev.r23, packedCurr.r23, nextGapBlend);
          } else {
            const edgeStep = Math.min(
              1,
              waterPhysicsTuning.GAP_EDGE_SMOOTH_PER_SECOND * deltaSeconds
            );
            water.displayGapStartNorm = oldDisplayStart + (gapStartNorm - oldDisplayStart) * edgeStep;
            water.displayGapEndNorm = oldDisplayEnd + (gapEndNorm - oldDisplayEnd) * edgeStep;
            water.displayGapRangesCurr01 = lerp4(oldDisplayR01, packedCurr.r01, edgeStep);
            water.displayGapRangesCurr23 = lerp4(oldDisplayR23, packedCurr.r23, edgeStep);
          }
          water.gapCenterNorm = gapCenterNorm;
          water.gapWidthNorm = gapWidthNorm;
          water.prevCenterGapWidthNorm = gapWidthNorm;
          water.gapBlend = hasRowChanged ? 0 : nextGapBlend;
          water.surgePhase = nextSurgeEnergy;
          water.surgeEnergy = nextSurgeEnergy;
          const centerStep = Math.min(1, waterPhysicsTuning.SURFACE_CENTER_SMOOTH_PER_SECOND * deltaSeconds);
          water.surfaceBandCenterY = oldBandCenter + (surfaceBandCenterY - oldBandCenter) * centerStep;
          const bandHeightStep = Math.min(0.01, waterPhysicsTuning.BAND_HEIGHT_SMOOTH_PER_SECOND * deltaSeconds);
          water.surfaceBandHalfHeight =
            oldBandHalfHeight + (dynamicBandHalfHeight - oldBandHalfHeight) * bandHeightStep;
          const calmnessStep = Math.min(1, waterPhysicsTuning.CALMNESS_SMOOTH_PER_SECOND * deltaSeconds);
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
            Math.min(
              0.03,
              (0.003 + pressure * 0.012 + nextSurgeEnergy * 0.009 + effectiveNarrowing * 0.022) *
                (1 - calmness * 0.46)
            )
          ) * 2;
          const curveTiltTarget =
            surfaceFlow * (0.008 + nextSurgeEnergy * 0.015) * (0.6 + pressure * 0.65);
          const curveCenterStep = Math.min(1, waterPhysicsTuning.SURFACE_CENTER_SMOOTH_PER_SECOND * deltaSeconds);
          const curveAmpStep = Math.min(1, waterPhysicsTuning.CURVE_AMP_SMOOTH_PER_SECOND * deltaSeconds);
          const curveTiltStep = Math.min(1, waterPhysicsTuning.CURVE_TILT_SMOOTH_PER_SECOND * deltaSeconds);
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
          water.flowWaveSpeedScale =
            0.00014 + Math.abs(surfaceFlow) * 0.00035 + nextSurgeEnergy * 0.0002;
        }
      );

      const renderData = components[RenderComponentName]?.get(waterEntity) as
        | RenderComponentData
        | undefined;
      const waterAfter = components[WaterComponentName]?.get(waterEntity) as
        | WaterComponentData
        | undefined;
      if (renderData?.shader?.uniforms && waterAfter) {
        ecs.updateComponent<RenderComponentData>(
          waterEntity,
          RenderComponentName,
          (render) => {
            'worklet';
            if (!render.shader?.uniforms) {
              return;
            }
            syncWaterShaderGameplayUniforms(render.shader.uniforms, waterAfter);
          }
        );
      }
    });
  },
};

