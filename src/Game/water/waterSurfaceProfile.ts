import { swimmerWaterLightingTuning } from '@/config/swimmerWaterLightingTuning';

const M_PI = Math.PI;

const clamp01 = (v: number): number => {
  'worklet';
  return Math.max(0, Math.min(1, v));
};

const lerp = (a: number, b: number, t: number): number => {
  'worklet';
  return a + (b - a) * t;
};

const safeRange = (start: number, end: number): { start: number; end: number } | null => {
  'worklet';
  const s = clamp01(start);
  const e = clamp01(end);
  if (e <= s + 0.0005) {
    return null;
  }
  return { start: s, end: Math.max(s + 0.01, e) };
};

const smoothstepEdge = (edge0: number, edge1: number, x: number): number => {
  'worklet';
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(0.0001, edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const softGapInfluence = (
  start: number,
  end: number,
  x: number,
  feather: number
): number => {
  'worklet';
  const left = smoothstepEdge(start - feather, start + feather, x);
  const right = 1 - smoothstepEdge(end - feather, end + feather, x);
  return Math.max(0, Math.min(1, left * right));
};

const softRangeWeight = (start: number, end: number, x: number): number => {
  'worklet';
  const range = safeRange(start, end);
  if (!range) {
    return 0;
  }
  const w = range.end - range.start;
  const feather = Math.max(0.02, Math.min(0.09, w * 0.45));
  return softGapInfluence(range.start, range.end, x, feather);
};

const hardRangeMask = (start: number, end: number, x: number): number => {
  'worklet';
  const range = safeRange(start, end);
  if (!range) {
    return 0;
  }
  const edge = 0.003;
  const left = smoothstepEdge(range.start - edge, range.start + edge, x);
  const right = 1 - smoothstepEdge(range.end - edge, range.end + edge, x);
  return Math.max(0, Math.min(1, left * right));
};

const bandMask = (y: number, center: number, halfH: number): number => {
  'worklet';
  const low = smoothstepEdge(center - halfH - 0.02, center - halfH + 0.01, y);
  const high = 1 - smoothstepEdge(center + halfH - 0.01, center + halfH + 0.02, y);
  return Math.max(0, Math.min(1, low * high));
};

export type WaterGapSpan = {
  startNorm: number;
  endNorm: number;
  flow: number;
};

export type WaterSurfaceProfileParams = {
  xNorm: number;
  waterLevel: number;
  iTime: number;
  frequency: number;
  speed: number;
  amplitude: number;
  visualIntensity: number;
  gapBlend: number;
  gapCurrent: readonly [number, number];
  gapPrev: readonly [number, number];
  gapCurr01: readonly [number, number, number, number];
  gapCurr23: readonly [number, number, number, number];
  gapPrev01: readonly [number, number, number, number];
  gapPrev23: readonly [number, number, number, number];
  hybridGapMaskStrength: number;
  curveCenter: number;
  curveAmp: number;
  curveTilt: number;
  calmness: number;
  flowVelocity: number;
  surgeEnergy: number;
  surfaceBandCenterY: number;
  surfaceBandHalfHeight: number;
};

export const computeIdleSurfaceOffsetNorm = (xNorm: number, iTime: number): number => {
  'worklet';
  const t = swimmerWaterLightingTuning;
  const mainWave =
    Math.sin(xNorm * t.idleWaveSpatialFreq * M_PI * 2 + iTime * t.idleWaveSpeed) *
    t.idleWaveAmplitude;
  const secondaryWave =
    Math.sin(
      xNorm * t.secondaryWaveSpatialFreq * M_PI * 2 -
      iTime * t.secondaryWaveSpeed +
      1.7
    ) * t.secondaryWaveAmplitude;
  const breathing = Math.sin(iTime * t.idleBreathingSpeed) * t.idleBreathingAmount;
  const combined = mainWave + secondaryWave + breathing;
  return Math.max(
    -t.idleMaxCombinedAmplitude,
    Math.min(t.idleMaxCombinedAmplitude, combined)
  );
};

/** Matches shader `finalSurface` in container UV (0 = bottom, 1 = top). */
export const computeFinalSurfaceUv = (params: WaterSurfaceProfileParams): number => {
  'worklet';
  const x = clamp01(params.xNorm);
  const blendT = smoothstepEdge(0, 1, clamp01(params.gapBlend));
  const blendedGapStart = lerp(params.gapPrev[0], params.gapCurrent[0], blendT);
  const blendedGapEnd = lerp(params.gapPrev[1], params.gapCurrent[1], blendT);
  const blendedGap = {
    start: blendedGapStart,
    end: Math.max(blendedGapStart + 0.01, blendedGapEnd),
  };
  const blendedGapWidth = Math.max(0.02, blendedGap.end - blendedGap.start);

  const r0 = {
    start: lerp(params.gapPrev01[0], params.gapCurr01[0], blendT),
    end: lerp(params.gapPrev01[1], params.gapCurr01[1], blendT),
  };
  const r1 = {
    start: lerp(params.gapPrev01[2], params.gapCurr01[2], blendT),
    end: lerp(params.gapPrev01[3], params.gapCurr01[3], blendT),
  };
  const r2 = {
    start: lerp(params.gapPrev23[0], params.gapCurr23[0], blendT),
    end: lerp(params.gapPrev23[1], params.gapCurr23[1], blendT),
  };
  const r3 = {
    start: lerp(params.gapPrev23[2], params.gapCurr23[2], blendT),
    end: lerp(params.gapPrev23[3], params.gapCurr23[3], blendT),
  };

  const w0 = softRangeWeight(r0.start, r0.end, x);
  const w1 = softRangeWeight(r1.start, r1.end, x);
  const w2 = softRangeWeight(r2.start, r2.end, x);
  const w3 = softRangeWeight(r3.start, r3.end, x);
  const softGapAny = Math.max(0, Math.min(1, Math.max(Math.max(w0, w1), Math.max(w2, w3))));
  const activeGapMaskAny = Math.max(
    0,
    Math.min(
      1,
      Math.max(
        Math.max(hardRangeMask(r0.start, r0.end, x), hardRangeMask(r1.start, r1.end, x)),
        Math.max(hardRangeMask(r2.start, r2.end, x), hardRangeMask(r3.start, r3.end, x))
      )
    )
  );

  const hybrid = clamp01(params.hybridGapMaskStrength);
  const activeGapMask = lerp(
    hardRangeMask(blendedGap.start, blendedGap.end, x),
    activeGapMaskAny,
    hybrid
  );
  const gapFeather = Math.max(0.02, Math.min(0.09, blendedGapWidth * 0.45));
  const softGap = lerp(
    softGapInfluence(blendedGap.start, blendedGap.end, x, gapFeather),
    softGapAny,
    hybrid
  );

  const surfaceYForBand =
    params.waterLevel + computeIdleSurfaceOffsetNorm(x, params.iTime);
  const activeBandMask = bandMask(
    surfaceYForBand,
    clamp01(params.surfaceBandCenterY),
    Math.max(0.02, Math.min(0.2, params.surfaceBandHalfHeight))
  );

  const surgeEnergy = Math.max(0, Math.min(1, params.surgeEnergy));
  const calmness = clamp01(params.calmness);
  const flowVelocity = Math.max(-1, Math.min(1, params.flowVelocity));
  const pressure = Math.max(
    0,
    Math.min(1, (1 - blendedGapWidth) * 0.72 + Math.abs(flowVelocity) * 0.28)
  );
  const directionalFlowBoost =
    Math.abs(flowVelocity) * (0.1 + 0.3 * surgeEnergy) * activeGapMask * activeBandMask;

  const curveMargin = Math.max(0.01, Math.min(0.08, blendedGapWidth * 0.2));
  const inertiaTravel = Math.max(0.035, blendedGapWidth * (0.16 + 0.2 * surgeEnergy));
  const curveCenter = Math.max(
    blendedGap.start + curveMargin - inertiaTravel,
    Math.min(blendedGap.end - curveMargin + inertiaTravel, params.curveCenter)
  );
  const gapHalf = Math.max(blendedGapWidth * 0.5, 0.02);
  const centeredNorm = (x - curveCenter) / gapHalf;
  const centerCurve = Math.exp(-centeredNorm * centeredNorm * 2.8) * Math.max(0, params.curveAmp);
  const directionalTilt = Math.max(-1, Math.min(1, centeredNorm)) * params.curveTilt;
  const calmRippleAmp =
    (0.0005 + calmness * 0.0038) * (1 - surgeEnergy) * softGap * activeBandMask;
  const calmRippleA =
    Math.sin(x * params.frequency * 4.5 + params.iTime * params.speed * (0.02 + 0.04 * Math.abs(flowVelocity)));
  const calmRippleB =
    Math.sin(x * params.frequency * 2.8 - params.iTime * params.speed * 0.015 + 1.2);
  const calmRipples = (calmRippleA * 0.65 + calmRippleB * 0.35) * calmRippleAmp;
  const curveInfluence = 0.18 + 0.82 * activeBandMask;
  const edgeBend = (1 - softGap) * activeBandMask * (0.003 + 0.01 * (0.4 + pressure * 0.6));
  const idleOffset = computeIdleSurfaceOffsetNorm(x, params.iTime);
  const visualIntensity = clamp01(params.visualIntensity);
  const gameplayDelta =
    (centerCurve + directionalTilt) * curveInfluence + calmRipples - edgeBend;

  void directionalFlowBoost;

  return Math.max(
    0,
    Math.min(
      1,
      params.waterLevel + idleOffset + gameplayDelta * visualIntensity
    )
  );
};

/** Local Y offset from flat water line (entity centered on flat surface). Up = negative. */
export const computeSurfaceLocalYOffsetPx = (
  params: WaterSurfaceProfileParams,
  containerHeight: number
): number => {
  'worklet';
  const finalUv = computeFinalSurfaceUv(params);
  return -(finalUv - params.waterLevel) * containerHeight;
};

export const collectWaterGapSpans = (
  gapBlend: number,
  gapCurrent: readonly [number, number],
  gapPrev: readonly [number, number],
  gapCurr01: readonly [number, number, number, number],
  gapCurr23: readonly [number, number, number, number],
  gapPrev01: readonly [number, number, number, number],
  gapPrev23: readonly [number, number, number, number],
  flowPerRange: readonly [number, number, number, number] | undefined,
  flowVelocity: number
): WaterGapSpan[] => {
  'worklet';
  const blendT = smoothstepEdge(0, 1, clamp01(gapBlend));
  const pairs: Array<{ start: number; end: number; flowIndex: number }> = [
    {
      start: lerp(gapPrev01[0], gapCurr01[0], blendT),
      end: lerp(gapPrev01[1], gapCurr01[1], blendT),
      flowIndex: 0,
    },
    {
      start: lerp(gapPrev01[2], gapCurr01[2], blendT),
      end: lerp(gapPrev01[3], gapCurr01[3], blendT),
      flowIndex: 1,
    },
    {
      start: lerp(gapPrev23[0], gapCurr23[0], blendT),
      end: lerp(gapPrev23[1], gapCurr23[1], blendT),
      flowIndex: 2,
    },
    {
      start: lerp(gapPrev23[2], gapCurr23[2], blendT),
      end: lerp(gapPrev23[3], gapCurr23[3], blendT),
      flowIndex: 3,
    },
  ];

  const spans: WaterGapSpan[] = [];
  const primary = safeRange(gapCurrent[0], gapCurrent[1]);
  if (primary) {
    spans.push({
      startNorm: lerp(gapPrev[0], gapCurrent[0], blendT),
      endNorm: lerp(gapPrev[1], gapCurrent[1], blendT),
      flow: flowPerRange?.[0] ?? flowVelocity,
    });
  }

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const range = safeRange(pair.start, pair.end);
    if (!range) {
      continue;
    }
    const duplicate = spans.some(
      (span) =>
        Math.abs(span.startNorm - range.start) < 0.002 &&
        Math.abs(span.endNorm - range.end) < 0.002
    );
    if (duplicate) {
      continue;
    }
    spans.push({
      startNorm: range.start,
      endNorm: range.end,
      flow: flowPerRange?.[pair.flowIndex] ?? flowVelocity,
    });
  }

  if (spans.length === 0 && primary) {
    spans.push({
      startNorm: lerp(gapPrev[0], gapCurrent[0], blendT),
      endNorm: lerp(gapPrev[1], gapCurrent[1], blendT),
      flow: flowVelocity,
    });
  }

  return spans;
};

/** Single blended gameplay gap — avoids duplicate multi-range span pops for foam. */
export const getBlendedPrimaryGapSpan = (
  gapBlend: number,
  gapCurrent: readonly [number, number],
  gapPrev: readonly [number, number],
  flowVelocity: number,
  flowPerRange?: readonly [number, number, number, number]
): WaterGapSpan | null => {
  'worklet';
  const blendT = smoothstepEdge(0, 1, clamp01(gapBlend));
  const startNorm = lerp(gapPrev[0], gapCurrent[0], blendT);
  const endNorm = lerp(gapPrev[1], gapCurrent[1], blendT);
  if (endNorm <= startNorm + 0.004) {
    return null;
  }
  return {
    startNorm,
    endNorm,
    flow: flowPerRange?.[0] ?? flowVelocity,
  };
};

export const smoothFoamGapSpan = (
  displayStartNorm: number,
  displayEndNorm: number,
  target: WaterGapSpan,
  deltaSeconds: number,
  smoothPerSecond: number
): { startNorm: number; endNorm: number } => {
  'worklet';
  const smooth = 1 - Math.exp(-smoothPerSecond * Math.max(0, deltaSeconds));
  return {
    startNorm: displayStartNorm + (target.startNorm - displayStartNorm) * smooth,
    endNorm: displayEndNorm + (target.endNorm - displayEndNorm) * smooth,
  };
};

export const computeGapTransitionT = (
  gapBlend: number,
  displayStartNorm: number,
  displayEndNorm: number,
  targetStartNorm: number,
  targetEndNorm: number
): number => {
  'worklet';
  const blendGap = 1 - clamp01(gapBlend);
  const spanDelta =
    Math.abs(displayStartNorm - targetStartNorm) + Math.abs(displayEndNorm - targetEndNorm);
  return Math.max(0, Math.min(1, blendGap * 0.85 + spanDelta * 1.6));
};
