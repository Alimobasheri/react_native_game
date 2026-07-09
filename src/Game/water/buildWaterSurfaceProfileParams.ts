import type { ContainerComponentData } from '@/Game/ecs-components/Container';
import type { WaterComponentData } from '@/Game/ecs-components/Water';
import type { WaterSurfaceProfileParams } from '@/Game/water/waterSurfaceProfile';

const DEFAULT_GAP: [number, number] = [1 / 6, 5 / 6];

export const readShaderUniformNumber = (
  uniforms: Record<string, unknown>,
  key: string,
  fallback: number
): number => {
  'worklet';
  const value = uniforms[key];
  return typeof value === 'number' ? value : fallback;
};

const buildSharedWaterProfileFields = (
  water: WaterComponentData,
  uniforms: Record<string, unknown>
): Omit<WaterSurfaceProfileParams, 'xNorm' | 'waterLevel'> => {
  'worklet';
  return {
    iTime: readShaderUniformNumber(uniforms, 'iTime', 0),
    frequency: readShaderUniformNumber(uniforms, 'frequency', 3.4),
    speed: readShaderUniformNumber(uniforms, 'speed', 0.02),
    amplitude: readShaderUniformNumber(uniforms, 'amplitude', 0.0035),
    visualIntensity: readShaderUniformNumber(
      uniforms,
      'uVisualIntensity',
      water.visualIntensity ?? 1
    ),
    gapBlend: water.gapBlend ?? 1,
    gapCurrent: [
      water.currentGapStartNorm ?? DEFAULT_GAP[0],
      water.currentGapEndNorm ?? DEFAULT_GAP[1],
    ],
    gapPrev: [
      water.prevGapStartNorm ?? DEFAULT_GAP[0],
      water.prevGapEndNorm ?? DEFAULT_GAP[1],
    ],
    gapCurr01: water.gapRangesCurr01 ?? [
      water.currentGapStartNorm ?? DEFAULT_GAP[0],
      water.currentGapEndNorm ?? DEFAULT_GAP[1],
      0,
      0,
    ],
    gapCurr23: water.gapRangesCurr23 ?? [0, 0, 0, 0],
    gapPrev01: water.gapRangesPrev01 ?? [
      water.prevGapStartNorm ?? DEFAULT_GAP[0],
      water.prevGapEndNorm ?? DEFAULT_GAP[1],
      0,
      0,
    ],
    gapPrev23: water.gapRangesPrev23 ?? [0, 0, 0, 0],
    hybridGapMaskStrength: readShaderUniformNumber(
      uniforms,
      'uHybridGapMaskStrength',
      0.9
    ),
    curveCenter: water.surfaceCurveCenterNorm ?? water.gapCenterNorm ?? 0.5,
    curveAmp: water.surfaceCurveAmp ?? 0.008,
    curveTilt: water.surfaceCurveTilt ?? 0,
    calmness: water.calmness ?? 0.5,
    flowVelocity:
      water.flowVelocity ??
      water.flowDirection ??
      readShaderUniformNumber(uniforms, 'uFlowVelocity', 0),
    flowPerRange: water.flowPerRange,
    surgeEnergy:
      water.surgeEnergy ??
      water.surgePhase ??
      readShaderUniformNumber(uniforms, 'uSurgeEnergy', 0),
    surfaceBandCenterY:
      water.surfaceBandCenterY ??
      readShaderUniformNumber(uniforms, 'uSurfaceBandCenterY', 0.3),
    surfaceBandHalfHeight:
      water.surfaceBandHalfHeight ??
      readShaderUniformNumber(uniforms, 'uSurfaceBandHalfHeight', 0.04),
  };
};

/**
 * FX systems: waterLevel from shader uniform — matches what the player sees on screen.
 *
 * @see docs/game-design/swimmer-physics-flow.md#water-surface-lock
 */
export const buildProfileFromShaderUniforms = (
  water: WaterComponentData,
  uniforms: Record<string, unknown>
): Omit<WaterSurfaceProfileParams, 'xNorm'> => {
  'worklet';
  return {
    ...buildSharedWaterProfileFields(water, uniforms),
    waterLevel: readShaderUniformNumber(uniforms, 'waterLevel', 0.3),
  };
};

/**
 * Swimmer physics: waterLevel from container geometry — flat rest line in world space.
 *
 * @see docs/game-design/swimmer-physics-flow.md#water-surface-lock
 */
export const buildProfileFromContainerGeometry = (
  water: WaterComponentData,
  container: ContainerComponentData,
  uniforms: Record<string, unknown>
): Omit<WaterSurfaceProfileParams, 'xNorm'> => {
  'worklet';
  const containerTop = container.centerY - container.height / 2;
  const waterLevelNorm = Math.max(
    0,
    Math.min(
      1,
      1 -
        (container.waterSurfaceY - containerTop) /
          Math.max(0.0001, container.height)
    )
  );
  return {
    ...buildSharedWaterProfileFields(water, uniforms),
    waterLevel: waterLevelNorm,
    surfaceBandCenterY: water.surfaceBandCenterY ?? waterLevelNorm,
    surfaceBandHalfHeight: water.surfaceBandHalfHeight ?? 0.08,
  };
};
