import type { WaterComponentData } from '@/Game/ecs-components/Water';

const defaultGapStart = 1 / 6;
const defaultGapEnd = 5 / 6;

/** Push gameplay gap/flow/surface uniforms — call after WaterPhysics mutates Water. */
export const syncWaterShaderGameplayUniforms = (
  uniforms: Record<string, unknown>,
  water: WaterComponentData
): void => {
  'worklet';
  const targetStart = water.currentGapStartNorm ?? defaultGapStart;
  const targetEnd = water.currentGapEndNorm ?? defaultGapEnd;
  const displayStart = water.displayGapStartNorm ?? targetStart;
  const displayEnd = water.displayGapEndNorm ?? targetEnd;
  const targetR01 = water.gapRangesCurr01 ?? [targetStart, targetEnd, 0, 0];
  const targetR23 = water.gapRangesCurr23 ?? [0, 0, 0, 0];
  const displayR01 = water.displayGapRangesCurr01 ?? targetR01;
  const displayR23 = water.displayGapRangesCurr23 ?? targetR23;

  uniforms.uGapTarget = [targetStart, targetEnd];
  uniforms.uGapTarget01 = targetR01;
  uniforms.uGapTarget23 = targetR23;
  uniforms.uGapCurrent = [displayStart, displayEnd];
  uniforms.uGapPrev = [
    water.prevGapStartNorm ?? defaultGapStart,
    water.prevGapEndNorm ?? defaultGapEnd,
  ];
  uniforms.uGapCurr01 = displayR01;
  uniforms.uGapCurr23 = displayR23;
  uniforms.uGapPrev01 = water.gapRangesPrev01 ?? [
    (uniforms.uGapPrev as number[])[0],
    (uniforms.uGapPrev as number[])[1],
    0,
    0,
  ];
  uniforms.uGapPrev23 = water.gapRangesPrev23 ?? [0, 0, 0, 0];
  uniforms.uFlowPerRange = water.flowPerRange ?? [
    water.flowVelocity ?? water.flowDirection ?? 0,
    0,
    0,
    0,
  ];
  uniforms.uAmpPerRange = water.ampPerRange ?? [water.surfaceCurveAmp ?? 0.008, 0, 0, 0];
  uniforms.uHybridGapMaskStrength =
    (uniforms.uHybridGapMaskStrength as number | undefined) ?? 0.9;
  uniforms.uGapBlend = water.gapBlend ?? 1;
  uniforms.uFlowDir = water.flowDirection ?? 0;
  uniforms.uGapCenter = water.gapCenterNorm ?? 0.5;
  uniforms.uGapWidth = water.gapWidthNorm ?? 2 / 3;
  uniforms.uSurfaceBandCenterY = water.surfaceBandCenterY ?? (uniforms.waterLevel as number) ?? 0.5;
  uniforms.uSurfaceBandHalfHeight = water.surfaceBandHalfHeight ?? 0.08;
  uniforms.uSurge = water.surgeEnergy ?? water.surgePhase ?? 0;
  uniforms.uPeakHeight = water.peakHeight ?? 0.008;
  uniforms.uPeakSharpness = water.peakSharpness ?? 0.1;
  uniforms.uTroughDepth = water.troughDepth ?? 0.006;
  uniforms.uFlowWaveSpeedScale = water.flowWaveSpeedScale ?? 0.00005;
  uniforms.uFlowVelocity = water.flowVelocity ?? water.flowDirection ?? 0;
  uniforms.uFlowOffset = water.flowOffset ?? 0;
  uniforms.uSurgeEnergy = water.surgeEnergy ?? water.surgePhase ?? 0;
  uniforms.uCalmness = water.calmness ?? 0.5;
  uniforms.uCurveCenter = water.surfaceCurveCenterNorm ?? water.gapCenterNorm ?? 0.5;
  uniforms.uCurveAmp = water.surfaceCurveAmp ?? 0.008;
  uniforms.uCurveTilt = water.surfaceCurveTilt ?? 0;
  uniforms.uVisualIntensity = water.visualIntensity ?? 1;
  uniforms.u_pendulumX = water.pendulumXNorm ?? 0.5;
  uniforms.u_pendulumForce = water.pendulumForce ?? 0;
};
