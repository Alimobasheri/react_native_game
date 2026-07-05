import {
  RenderLayerData,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { waterSurfaceFoamTuning } from '@/config/waterSurfaceFoamTuning';
import {
  computeSurfaceLocalYOffsetPx,
  type WaterGapSpan,
  type WaterSurfaceProfileParams,
} from '@/Game/water/waterSurfaceProfile';

const hash01 = (seed: number): number => {
  'worklet';
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const smoothstep01 = (t: number): number => {
  'worklet';
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

const lerp = (a: number, b: number, t: number): number => {
  'worklet';
  return a + (b - a) * t;
};

const rowRange = (
  rowSeed: number,
  salt: number,
  range: readonly [number, number]
): number => {
  'worklet';
  return lerp(range[0], range[1], hash01(rowSeed + salt));
};

type DropletAnchor = { anchorX: number; anchorY: number; seed: number };

type FoamBlobDraw = {
  x: number;
  y: number;
  radius: number;
  opacity: number;
};

const normToLocalX = (xNorm: number, containerWidth: number): number => {
  'worklet';
  return xNorm * containerWidth - containerWidth * 0.5;
};

const buildProfileAtX = (
  base: Omit<WaterSurfaceProfileParams, 'xNorm'>,
  xNorm: number
): WaterSurfaceProfileParams => {
  'worklet';
  return {
    waterLevel: base.waterLevel,
    iTime: base.iTime,
    frequency: base.frequency,
    speed: base.speed,
    amplitude: base.amplitude,
    visualIntensity: base.visualIntensity,
    gapBlend: base.gapBlend,
    gapCurrent: base.gapCurrent,
    gapPrev: base.gapPrev,
    gapCurr01: base.gapCurr01,
    gapCurr23: base.gapCurr23,
    gapPrev01: base.gapPrev01,
    gapPrev23: base.gapPrev23,
    hybridGapMaskStrength: base.hybridGapMaskStrength,
    curveCenter: base.curveCenter,
    curveAmp: base.curveAmp,
    curveTilt: base.curveTilt,
    calmness: base.calmness,
    flowVelocity: base.flowVelocity,
    flowPerRange: base.flowPerRange,
    surgeEnergy: base.surgeEnergy,
    surfaceBandCenterY: base.surfaceBandCenterY,
    surfaceBandHalfHeight: base.surfaceBandHalfHeight,
    xNorm,
  };
};

const surfaceLocalYAtNorm = (
  base: Omit<WaterSurfaceProfileParams, 'xNorm'>,
  xNorm: number,
  containerHeight: number
): number => {
  'worklet';
  return computeSurfaceLocalYOffsetPx(buildProfileAtX(base, xNorm), containerHeight);
};

const spanBlobCount = (foamSeed: number, strength: number): number => {
  'worklet';
  const count = Math.round(
    waterSurfaceFoamTuning.blobsPerSpanBase *
      rowRange(foamSeed, 3.2, [0.88, 1.12]) *
      (0.72 + strength * 0.35)
  );
  return Math.max(6, count);
};

const shouldSkipBlob = (foamSeed: number, seed: number, strength: number): boolean => {
  'worklet';
  const skipChance =
    waterSurfaceFoamTuning.blobSkipChance * rowRange(foamSeed, 31.5, [0.55, 1.2]) * (1.15 - strength * 0.35);
  return hash01(seed + 44.8) < skipChance;
};

const anchorJitter = (
  foamSeed: number,
  seed: number,
  axis: 'along' | 'across'
): number => {
  'worklet';
  const base =
    axis === 'along'
      ? waterSurfaceFoamTuning.anchorJitterAlongPx
      : waterSurfaceFoamTuning.anchorJitterAcrossPx;
  const amp = base * rowRange(foamSeed, 27.8, [0.45, 1.05]);
  const salt = axis === 'along' ? 9.7 : 6.3;
  return (hash01(seed + foamSeed + salt) - 0.5) * 2 * amp;
};

const buildSpanDropletAnchors = (
  span: WaterGapSpan,
  foamSeed: number,
  containerWidth: number,
  containerHeight: number,
  profileBase: Omit<WaterSurfaceProfileParams, 'xNorm'>,
  strength: number
): DropletAnchor[] => {
  'worklet';
  const inset = waterSurfaceFoamTuning.spanInsetNorm;
  const startNorm = span.startNorm + inset;
  const endNorm = span.endNorm - inset;
  if (endNorm <= startNorm + 0.004) {
    return [];
  }

  const targetCount = spanBlobCount(foamSeed, strength);
  const anchors: DropletAnchor[] = [];
  for (let i = 0; i < targetCount; i++) {
    const seed = foamSeed * 0.173 + i * 37.1;
    if (shouldSkipBlob(foamSeed, seed, strength)) {
      continue;
    }
    const alongT = hash01(seed * 2.31 + foamSeed * 0.07);
    const xNorm = lerp(startNorm, endNorm, alongT);
    const surfaceY = surfaceLocalYAtNorm(profileBase, xNorm, containerHeight);
    anchors.push({
      anchorX: normToLocalX(xNorm, containerWidth) + anchorJitter(foamSeed, seed, 'along'),
      anchorY: surfaceY + anchorJitter(foamSeed, seed, 'across'),
      seed,
    });
  }
  return anchors;
};

const buildEdgeGatherAnchors = (
  span: WaterGapSpan,
  transitionT: number,
  foamSeed: number,
  containerWidth: number,
  containerHeight: number,
  profileBase: Omit<WaterSurfaceProfileParams, 'xNorm'>,
  strength: number
): DropletAnchor[] => {
  'worklet';
  if (transitionT < 0.06) {
    return [];
  }
  const inset = waterSurfaceFoamTuning.spanInsetNorm;
  const startNorm = span.startNorm + inset;
  const endNorm = span.endNorm - inset;
  if (endNorm <= startNorm + 0.004) {
    return [];
  }

  const band = waterSurfaceFoamTuning.edgeGatherBandNorm;
  const sideCount = Math.max(
    1,
    Math.round(waterSurfaceFoamTuning.edgeGatherBlobs * transitionT * (0.55 + strength * 0.45))
  );
  const anchors: DropletAnchor[] = [];

  for (let side = 0; side < 2; side++) {
    for (let j = 0; j < sideCount; j++) {
      const seed = foamSeed * 0.41 + side * 19.7 + j * 53.1 + 900;
      const edgeInset = band * ((j + 1) / Math.max(1, sideCount));
      const alongT = side === 0 ? edgeInset : 1 - edgeInset;
      const xNorm = lerp(startNorm, endNorm, alongT);
      const surfaceY = surfaceLocalYAtNorm(profileBase, xNorm, containerHeight);
      anchors.push({
        anchorX: normToLocalX(xNorm, containerWidth) + anchorJitter(foamSeed, seed, 'along') * 0.45,
        anchorY: surfaceY + anchorJitter(foamSeed, seed, 'across') * 0.45,
        seed,
      });
    }
  }

  return anchors;
};

const evalPersistentFoamAppear = (localAge: number): number => {
  'worklet';
  return smoothstep01(
    localAge / Math.max(0.001, waterSurfaceFoamTuning.blobFadeInSeconds)
  );
};

const pushFoamDropletLayer = (layers: RenderLayerData[], blob: FoamBlobDraw): void => {
  'worklet';
  if (blob.opacity < waterSurfaceFoamTuning.minDrawOpacity || blob.radius < 1) {
    return;
  }
  layers.push({
    position: { x: blob.x, y: blob.y },
    shape: { type: ShapeTypes.Circle, radius: blob.radius },
    fillColor: waterSurfaceFoamTuning.fillColor,
    opacity: blob.opacity,
    visible: true,
  });
};

const pushCurvedSpineSegment = (
  layers: RenderLayerData[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  opacity: number
): void => {
  'worklet';
  const spineW = waterSurfaceFoamTuning.spineWidthPx;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 1.5 || opacity < waterSurfaceFoamTuning.minDrawOpacity) {
    return;
  }
  layers.push({
    position: { x: (x0 + x1) * 0.5, y: (y0 + y1) * 0.5 },
    angle: Math.atan2(dy, dx),
    shape: {
      type: ShapeTypes.Rectangle,
      width: length + spineW * 0.35,
      height: spineW,
      borderRadius: spineW * 0.5,
    },
    fillColor: waterSurfaceFoamTuning.fillColor,
    opacity,
    visible: true,
  });
};

const pushCurvedSpineAlongSpan = (
  layers: RenderLayerData[],
  span: WaterGapSpan,
  foamSeed: number,
  containerWidth: number,
  containerHeight: number,
  profileBase: Omit<WaterSurfaceProfileParams, 'xNorm'>,
  fade: number,
  strength: number
): void => {
  'worklet';
  const inset = waterSurfaceFoamTuning.spanInsetNorm;
  const startNorm = span.startNorm + inset;
  const endNorm = span.endNorm - inset;
  if (endNorm <= startNorm + 0.004) {
    return;
  }

  const samples = Math.max(4, Math.round(6 + (endNorm - startNorm) * 14));
  const opacity = waterSurfaceFoamTuning.spineOpacity * fade * (0.65 + strength * 0.35);
  let prevX = 0;
  let prevY = 0;
  let hasPrev = false;

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const xNorm = lerp(startNorm, endNorm, t);
    const x = normToLocalX(xNorm, containerWidth);
    const y = surfaceLocalYAtNorm(profileBase, xNorm, containerHeight);
    if (hasPrev) {
      pushCurvedSpineSegment(layers, prevX, prevY, x, y, opacity);
    }
    prevX = x;
    prevY = y;
    hasPrev = true;
  }

  void foamSeed;
};

const evalSurfaceFoamBlob = (
  seed: number,
  foamSeed: number,
  anchorX: number,
  anchorY: number,
  foamAge: number,
  fade: number,
  strength: number
): FoamBlobDraw | null => {
  'worklet';
  const spawnDelay =
    hash01(seed + 7.1) *
    waterSurfaceFoamTuning.blobSpawnStaggerSeconds *
    rowRange(foamSeed, 8.1, [0.85, 1.15]);
  const localAge = foamAge - spawnDelay;
  if (localAge <= 0) {
    return null;
  }

  const appear = evalPersistentFoamAppear(localAge);
  if (appear < 0.04) {
    return null;
  }

  const settled = appear >= 1;
  const baseRadius =
    (waterSurfaceFoamTuning.minRadiusPx +
      hash01(seed + 11) *
        (waterSurfaceFoamTuning.maxRadiusPx - waterSurfaceFoamTuning.minRadiusPx)) *
    rowRange(foamSeed, 24.2, [0.92, 1.08]);
  const scale = settled ? 1 : lerp(waterSurfaceFoamTuning.blobAppearScaleStart, 1, appear);
  const radius = baseRadius * scale;

  const opacity =
    fade *
    waterSurfaceFoamTuning.maxBlobOpacity *
    waterSurfaceFoamTuning.settledOpacity *
    (settled ? 1 : appear) *
    (0.55 + strength * 0.45) *
    rowRange(foamSeed, 21.7, [0.92, 1.02]);

  if (opacity < waterSurfaceFoamTuning.minDrawOpacity) {
    return null;
  }

  return {
    x: anchorX,
    y: anchorY,
    radius,
    opacity,
  };
};

export type BuildWaterSurfaceFoamRenderLayersArgs = {
  spans: readonly WaterGapSpan[];
  containerWidth: number;
  containerHeight: number;
  foamAge: number;
  foamSeed: number;
  foamStrength: number;
  waterRaiseSpeed: number;
  profileBase: Omit<WaterSurfaceProfileParams, 'xNorm'>;
  gapTransitionT?: number;
};

export function buildWaterSurfaceFoamRenderLayers(
  args: BuildWaterSurfaceFoamRenderLayersArgs
): RenderLayerData[] {
  'worklet';
  const {
    spans,
    containerWidth,
    containerHeight,
    foamAge,
    foamSeed,
    foamStrength,
    waterRaiseSpeed: _waterRaiseSpeed,
    profileBase,
    gapTransitionT = 0,
  } = args;

  void _waterRaiseSpeed;

  if (spans.length === 0 || foamStrength < 0.05) {
    return [];
  }

  const fade = Math.min(1, foamAge / Math.max(0.001, waterSurfaceFoamTuning.fadeInSeconds));
  const layers: RenderLayerData[] = [];

  for (let s = 0; s < spans.length; s++) {
    const span = spans[s];
    pushCurvedSpineAlongSpan(
      layers,
      span,
      foamSeed,
      containerWidth,
      containerHeight,
      profileBase,
      fade,
      foamStrength
    );

    const anchors = buildSpanDropletAnchors(
      span,
      foamSeed,
      containerWidth,
      containerHeight,
      profileBase,
      foamStrength
    );
    const edgeAnchors = buildEdgeGatherAnchors(
      span,
      gapTransitionT,
      foamSeed,
      containerWidth,
      containerHeight,
      profileBase,
      foamStrength
    );

    for (let i = 0; i < anchors.length + edgeAnchors.length; i++) {
      const anchor = i < anchors.length ? anchors[i] : edgeAnchors[i - anchors.length];
      const { anchorX, anchorY, seed } = anchor;
      const edgeBoost = i >= anchors.length ? 1 + gapTransitionT * 0.12 : 1;
      const blob = evalSurfaceFoamBlob(
        seed,
        foamSeed,
        anchorX,
        anchorY,
        foamAge,
        fade,
        foamStrength * edgeBoost
      );
      if (!blob) {
        continue;
      }
      pushFoamDropletLayer(layers, blob);
    }
  }

  return layers;
};

export const computeWaterSurfaceFoamStrength = (params: {
  raisingSpeed: number;
  flowVelocity: number;
  surgeEnergy: number;
  gapWidthNorm: number;
  visualIntensity: number;
}): number => {
  'worklet';
  const speedFactor = Math.min(
    1,
    params.raisingSpeed / waterSurfaceFoamTuning.speedReference
  );
  const flow = Math.abs(params.flowVelocity);
  const surge = Math.max(0, Math.min(1, params.surgeEnergy));
  const pressure = Math.max(0, Math.min(1, (1 - params.gapWidthNorm) * 0.72 + flow * 0.28));
  const vi = Math.max(0, Math.min(1, params.visualIntensity));
  const raw =
    waterSurfaceFoamTuning.minFoamStrength +
    (waterSurfaceFoamTuning.maxFoamStrength - waterSurfaceFoamTuning.minFoamStrength) *
      (speedFactor * 0.42 + flow * 0.28 + surge * 0.22 + pressure * 0.32) *
      vi;
  return Math.max(
    waterSurfaceFoamTuning.minFoamStrength * 0.5,
    Math.min(waterSurfaceFoamTuning.maxFoamStrength, raw)
  );
};
