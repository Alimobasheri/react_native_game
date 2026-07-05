import {
  RenderLayerData,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  swimmerWaterFxTuning,
  type SwimmerContactFoamKind,
} from '@/config/swimmerWaterFxTuning';
import {
  computeSurfaceLocalYOffsetPx,
  type WaterGapSpan,
  type WaterSurfaceProfileParams,
} from '@/Game/water/waterSurfaceProfile';

/** Worklet-local alias — Reanimated cannot close over import default params. */
const FX = swimmerWaterFxTuning;
const FX_FILL_COLOR = FX.fillColor;
const FX_WATER_CONTACT_MARGIN_PX = FX.waterContactMarginPx;

export type FoamLayerMode = 'all' | 'spinesOnly' | 'blobsOnly';

const smoothstep01 = (t: number): number => {
  'worklet';
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

const easeOutCubic = (t: number): number => {
  'worklet';
  const c = Math.max(0, Math.min(1, t));
  const inv = 1 - c;
  return 1 - inv * inv * inv;
};

const hash01 = (seed: number): number => {
  'worklet';
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
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

type FoamBlobDraw = {
  x: number;
  y: number;
  radius: number;
  opacity: number;
};

const anchorJitter = (
  foamSeed: number,
  seed: number,
  axis: 'along' | 'across'
): number => {
  'worklet';
  const base =
    axis === 'along'
      ? FX.localBandWidthPx * 0.018
      : FX.bandHeightPx * 0.04;
  const amp = base * rowRange(foamSeed, 27.8, [0.45, 1.05]);
  const salt = axis === 'along' ? 9.7 : 6.3;
  return (hash01(seed + foamSeed + salt) - 0.5) * 2 * amp;
};

export const swimmerXToNormSpan = (
  x: number,
  containerCenterX: number,
  containerWidth: number,
  halfWidthNorm: number
): WaterGapSpan => {
  'worklet';
  const left = containerCenterX - containerWidth / 2;
  const xNorm = (x - left) / Math.max(1, containerWidth);
  return {
    startNorm: Math.max(0, xNorm - halfWidthNorm),
    endNorm: Math.min(1, xNorm + halfWidthNorm),
    flow: 0,
  };
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

/** True when swimmer body still contacts the water surface (not pinned dry above gap). */
export const isSwimmerContactingWaterSurface = (
  swimmerY: number,
  waterSurfaceY: number,
  swimmerHalfHeight: number,
  marginPx?: number
): boolean => {
  'worklet';
  const margin = marginPx ?? FX_WATER_CONTACT_MARGIN_PX;
  const bottomY = swimmerY + swimmerHalfHeight;
  return bottomY >= waterSurfaceY - margin;
};

/** Stricter than contact — center must reach float depth; blocked while pinned. */
export const isSwimmerAtWaterForCollarFoam = (
  swimmerY: number,
  waterSurfaceY: number,
  swimmerVisualHeight: number,
  isPinnedFromAbove: boolean,
  minCenterSubmergeRatio?: number,
  slopPx?: number
): boolean => {
  'worklet';
  if (isPinnedFromAbove) {
    return false;
  }
  const ratio = minCenterSubmergeRatio ?? FX.collar.minCenterSubmergeRatio;
  const slop = slopPx ?? FX.collar.surfaceCenterSlopPx;
  const minDepth = swimmerVisualHeight * ratio;
  return swimmerY - waterSurfaceY >= minDepth - slop;
};

/** Band-local X → shader surface local Y (up = negative), same as gap-span foam. */
export const surfaceLocalYAtBandX = (
  profileBase: Omit<WaterSurfaceProfileParams, 'xNorm'>,
  bandCenterX: number,
  localX: number,
  containerCenterX: number,
  containerWidth: number,
  containerHeight: number
): number => {
  'worklet';
  const left = containerCenterX - containerWidth / 2;
  const worldX = bandCenterX + localX;
  const xNorm = Math.max(0, Math.min(1, (worldX - left) / Math.max(1, containerWidth)));
  return computeSurfaceLocalYOffsetPx(
    buildProfileAtX(profileBase, xNorm),
    containerHeight
  );
};

type SurfaceContactContext = {
  bandCenterX: number;
  profileBase: Omit<WaterSurfaceProfileParams, 'xNorm'>;
  containerCenterX: number;
  containerWidth: number;
  containerHeight: number;
};

const waterContactYAtLocalX = (
  localX: number,
  ctx: SurfaceContactContext
): number => {
  'worklet';
  return (
    surfaceLocalYAtBandX(
      ctx.profileBase,
      ctx.bandCenterX,
      localX,
      ctx.containerCenterX,
      ctx.containerWidth,
      ctx.containerHeight
    ) + FX.blobYOffsetPx
  );
};

const pushSpineSegment = (
  layers: RenderLayerData[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  spineW: number,
  opacity: number,
  fillColor: string
): void => {
  'worklet';
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 1 || opacity < FX.minDrawOpacity) {
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
    fillColor,
    opacity,
    visible: true,
  });
};

const pushFoamDropletLayer = (
  layers: RenderLayerData[],
  blob: FoamBlobDraw,
  fillColor: string
): void => {
  'worklet';
  if (blob.opacity < FX.minDrawOpacity || blob.radius < 1) {
    return;
  }
  layers.push({
    position: { x: blob.x, y: blob.y },
    shape: { type: ShapeTypes.Circle, radius: blob.radius },
    fillColor,
    opacity: blob.opacity,
    visible: true,
  });
};

const spineOpacityFor = (
  life01: number,
  strength: number,
  scale = 1
): number => {
  'worklet';
  return (
    life01 *
    FX.spineOpacity *
    scale *
    (0.65 + strength * 0.35)
  );
};

const buildCollarOutwardBlobs = (
  layers: RenderLayerData[],
  foamSeed: number,
  foamAge: number,
  strength: number,
  fillColor: string,
  surfaceCtx: SurfaceContactContext,
  collarSpawnActive: boolean,
  collarDrain01: number,
  collarRegrow01: number
): void => {
  'worklet';
  const collar = FX.collar;
  const loop = FX.loop;
  const globalMul =
    (collarSpawnActive ? 1 : Math.max(0, collarDrain01)) *
    Math.max(0, collarRegrow01);

  if (globalMul <= 0.01 || foamAge < 0) {
    return;
  }

  const emitInterval = Math.max(0.08, collar.emitIntervalSec);
  const lifetime = Math.max(0.2, collar.rippleLifetimeSec);
  const expandSpeed = collar.expandSpeedPxPerSec;
  const maxRipples = Math.max(1, collar.maxRipples);
  const maxRadius = collar.maxRadiusPx;
  const startRadius = collar.startRadiusPx;
  const blobsPerRing = collar.blobsPerRing;
  const ringBand = collar.ringBandPx;
  const fadePower = collar.temporalFadePower;
  const bodyClear = collar.bodyClearancePx;
  const arcMinSin = collar.arcMinSin;

  const latestEmitIndex = Math.floor(foamAge / emitInterval);
  const oldestEmitIndex = Math.max(0, latestEmitIndex - maxRipples + 1);

  for (let emitIndex = oldestEmitIndex; emitIndex <= latestEmitIndex; emitIndex++) {
    const rippleAge = foamAge - emitIndex * emitInterval;
    if (rippleAge < 0 || rippleAge > lifetime) {
      continue;
    }

    const rippleSlot = latestEmitIndex - emitIndex;

    const life01 = 1 - rippleAge / lifetime;
    const temporal = Math.pow(Math.max(0, life01), fadePower);
    const radius = startRadius + rippleAge * expandSpeed;
    if (radius > maxRadius) {
      continue;
    }

    const farT = Math.max(
      0,
      (radius - maxRadius * 0.72) / Math.max(1, maxRadius * 0.28)
    );
    const spatial = 1 - easeOutCubic(farT);
    const rippleStrength = temporal * spatial * globalMul;
    if (rippleStrength <= 0.02) {
      continue;
    }

    for (let b = 0; b < blobsPerRing; b++) {
      const seed = foamSeed * 0.173 + rippleSlot * 97.3 + b * 13.1;
      const angle =
        (b / Math.max(1, blobsPerRing)) * Math.PI * 2 +
        (hash01(seed + 1.3) - 0.5) * 0.45;

      if (Math.sin(angle) < arcMinSin) {
        continue;
      }

      const radialJitter = (hash01(seed + 2.7) - 0.5) * ringBand;
      const ringR = radius + radialJitter;
      const localX = Math.cos(angle) * ringR * loop.horizontalStretch;
      if (Math.abs(localX) < bodyClear) {
        continue;
      }

      const localY =
        waterContactYAtLocalX(localX, surfaceCtx) +
        Math.sin(angle) * ringR * loop.verticalSquash * 0.12 +
        anchorJitter(foamSeed, seed, 'across') * 0.25;

      const blobRadius = lerp(
        collar.minBlobRadiusPx,
        collar.maxBlobRadiusPx,
        hash01(seed + 11.2)
      );

      const opacity =
        rippleStrength *
        FX.maxBlobOpacity *
        (0.58 + strength * 0.42) *
        rowRange(foamSeed, seed, [0.82, 1.04]);

      if (opacity < FX.minDrawOpacity || blobRadius < 0.85) {
        continue;
      }

      pushFoamDropletLayer(
        layers,
        { x: localX, y: localY, radius: blobRadius, opacity },
        fillColor
      );
    }
  }
};

/** Chaotic micro-droplet burst — shared ballistic spray for splash / pivot / pin. */
const buildBallisticSpray = (
  layers: RenderLayerData[],
  foamSeed: number,
  foamAge: number,
  life01: number,
  strength: number,
  direction: -1 | 0 | 1,
  fillColor: string,
  surfaceCtx: SurfaceContactContext,
  config: {
    particleCount: number;
    launchSpeedMinPx: number;
    launchSpeedMaxPx: number;
    gravityPxPerSec2: number;
    fanSpreadRad: number;
    directionalBiasRad: number;
    lateralKickPx: number;
    minRadiusPx: number;
    maxRadiusPx: number;
    staggerSecMax: number;
    opacityScale: number;
  },
  shape: 'stroke' | 'pivot' | 'dome'
): void => {
  'worklet';
  const contactY = waterContactYAtLocalX(0, surfaceCtx);
  const gravity = config.gravityPxPerSec2;
  const dir = direction !== 0 ? direction : 1;
  const strengthScale = lerp(0.88, 1.22, Math.min(1.35, strength));

  for (let i = 0; i < config.particleCount; i++) {
    const seed = foamSeed * 0.191 + i * 53.7;
    const stagger = hash01(seed + 1.7) * config.staggerSecMax;
    const t = Math.max(0, foamAge - stagger);
    if (t < 0.008) {
      continue;
    }

    let upAngle: number;
    if (shape === 'dome') {
      upAngle =
        -Math.PI * 0.5 + (hash01(seed + 4.2) - 0.5) * config.fanSpreadRad * 2.2;
    } else if (shape === 'pivot') {
      const angleJitter = (hash01(seed + 4.2) - 0.5) * config.fanSpreadRad * 1.6;
      upAngle =
        -Math.PI * 0.5 +
        angleJitter +
        dir * config.directionalBiasRad * lerp(0.5, 1, hash01(seed + 8.1));
    } else {
      const angleJitter = (hash01(seed + 4.2) - 0.5) * config.fanSpreadRad * 2.1;
      upAngle =
        -Math.PI * 0.5 +
        angleJitter -
        dir * config.directionalBiasRad * lerp(0.35, 1, hash01(seed + 8.1));
    }

    const launch =
      lerp(config.launchSpeedMinPx, config.launchSpeedMaxPx, hash01(seed + 3.1)) *
      strengthScale *
      lerp(0.82, 1.18, hash01(seed + 19.4));
    const lateralScale = shape === 'dome' ? 0.55 : shape === 'pivot' ? 0.85 : 1;
    const vx =
      Math.cos(upAngle) * launch +
      dir * config.lateralKickPx * (hash01(seed + 6.4) - 0.28) * lateralScale;
    const vy = Math.sin(upAngle) * launch;

    const x =
      vx * t +
      (hash01(seed + 11.3) - 0.5) * 3.2 +
      anchorJitter(foamSeed, seed, 'along') * 0.25;
    const y = contactY + vy * t + 0.5 * gravity * t * t;

    const heightAboveSurface = contactY - y;
    const burstIn = smoothstep01(t / 0.022);
    const descentFade =
      heightAboveSurface < -3
        ? 1 - smoothstep01((-heightAboveSurface - 3) / 14)
        : 1;
    const particleLife = life01 * burstIn * descentFade;

    const radius =
      lerp(config.minRadiusPx, config.maxRadiusPx, hash01(seed + 15.7)) *
      lerp(0.7, 1.08, hash01(seed + 27.2));
    const opacity =
      particleLife *
      FX.maxBlobOpacity *
      config.opacityScale *
      lerp(0.68, 1.05, strength) *
      rowRange(foamSeed, seed, [0.78, 1.08]);

    if (opacity < FX.minDrawOpacity || radius < 0.45) {
      continue;
    }

    pushFoamDropletLayer(layers, { x, y, radius, opacity }, fillColor);
  }
};

const buildSplashParticles = (
  layers: RenderLayerData[],
  foamSeed: number,
  foamAge: number,
  life01: number,
  strength: number,
  direction: -1 | 0 | 1,
  fillColor: string,
  surfaceCtx: SurfaceContactContext
): void => {
  'worklet';
  buildBallisticSpray(
    layers,
    foamSeed,
    foamAge,
    life01,
    strength,
    direction,
    fillColor,
    surfaceCtx,
    FX.splashArc,
    'stroke'
  );
};

const buildPivotBurstParticles = (
  layers: RenderLayerData[],
  foamSeed: number,
  foamAge: number,
  life01: number,
  strength: number,
  direction: -1 | 0 | 1,
  fillColor: string,
  surfaceCtx: SurfaceContactContext
): void => {
  'worklet';
  buildBallisticSpray(
    layers,
    foamSeed,
    foamAge,
    life01,
    strength,
    direction,
    fillColor,
    surfaceCtx,
    FX.pivotBurst,
    'pivot'
  );
};

const buildPinnedBurstParticles = (
  layers: RenderLayerData[],
  foamSeed: number,
  foamAge: number,
  life01: number,
  strength: number,
  fillColor: string,
  surfaceCtx: SurfaceContactContext
): void => {
  'worklet';
  buildBallisticSpray(
    layers,
    foamSeed,
    foamAge,
    life01,
    strength,
    0,
    fillColor,
    surfaceCtx,
    FX.pinnedBurstArc,
    'dome'
  );
};

/** Single wake-trail droplet — drifts backward and curls up as foamAge advances. */
const buildWakeTrailDroplet = (
  layers: RenderLayerData[],
  foamSeed: number,
  foamAge: number,
  life01: number,
  strength: number,
  direction: -1 | 0 | 1,
  fillColor: string,
  surfaceCtx: SurfaceContactContext
): void => {
  'worklet';
  const wake = FX.wakeCurl;
  const wakeMaxAge = FX.preset.wake.maxAge;
  const dir = direction !== 0 ? direction : 1;
  const drift = FX.wakeDriftPxPerSec * foamAge;
  const spawnOffset = wake.spawnOffsetPx;
  const x =
    -dir * (spawnOffset + drift) + (hash01(foamSeed + 8.3) - 0.5) * 3.2;
  const curlProgress = smoothstep01(foamAge / wakeMaxAge);
  const curl =
    wake.upwardCurlPx *
    curlProgress *
    (0.45 + hash01(foamSeed + 11.6) * 0.55);
  const y = waterContactYAtLocalX(x, surfaceCtx) - curl;
  const radius =
    lerp(wake.minRadiusPx, wake.maxRadiusPx, hash01(foamSeed + 15.2)) *
    lerp(0.82, 1.04, life01);
  const birthFade = smoothstep01(foamAge / 0.028);
  const opacity =
    life01 *
    birthFade *
    lerp(0.55, 1, strength) *
    wake.opacityScale *
    FX.maxBlobOpacity *
    rowRange(foamSeed, foamSeed, [0.72, 1]);

  if (opacity < FX.minDrawOpacity || radius < 0.65) {
    return;
  }

  pushFoamDropletLayer(layers, { x, y, radius, opacity }, fillColor);
};

const buildDentSpines = (
  layers: RenderLayerData[],
  foamSeed: number,
  foamAge: number,
  life01: number,
  strength: number,
  direction: -1 | 0 | 1,
  fillColor: string,
  surfaceCtx: SurfaceContactContext
): void => {
  'worklet';
  const preset = FX.preset.dent;
  const spineW = FX.spineWidthPx;
  const opacity = spineOpacityFor(life01, strength, 0.85);
  const shrink = Math.max(0.25, 1 - foamAge * 2.8);
  const dir = direction !== 0 ? direction : 1;
  const contactY = waterContactYAtLocalX(0, surfaceCtx);

  for (let i = 0; i < preset.spineCount; i++) {
    const t = preset.spineCount <= 1 ? 0.5 : i / (preset.spineCount - 1);
    const angle = dir * 0.25 + (t - 0.5) * 0.4;
    const len = 5 * shrink * lerp(0.8, 1.1, hash01(foamSeed + i * 7.1));
    const x0 = Math.cos(angle) * len * dir;
    const y0 = waterContactYAtLocalX(x0, surfaceCtx);
    pushSpineSegment(layers, x0, y0, 0, contactY, spineW, opacity, fillColor);
  }
};

export type BuildSwimmerContactFoamLayersArgs = {
  kind: SwimmerContactFoamKind;
  span: WaterGapSpan;
  foamAge: number;
  life01: number;
  foamSeed: number;
  foamStrength: number;
  bandCenterX: number;
  profileBase: Omit<WaterSurfaceProfileParams, 'xNorm'>;
  containerWidth: number;
  containerHeight: number;
  containerCenterX: number;
  fillColor?: string;
  direction?: -1 | 0 | 1;
  layerMode?: FoamLayerMode;
  /** When false, collar only renders blobs already in their fade-out phase. */
  collarSpawnActive?: boolean;
  /** 1 → 0 global fade multiplier when swimmer leaves water. */
  collarDrain01?: number;
  /** 0 → 1 ease-in after re-entry from pin / drain. */
  collarRegrow01?: number;
};

export const getPresetForKind = (
  kind: SwimmerContactFoamKind
): (typeof FX.preset)[SwimmerContactFoamKind] => {
  'worklet';
  return FX.preset[kind];
};

export function buildSwimmerContactFoamLayers(
  args: BuildSwimmerContactFoamLayersArgs
): RenderLayerData[] {
  'worklet';
  const {
    kind,
    life01,
    foamSeed,
    foamStrength,
    foamAge,
    fillColor: fillColorArg,
    direction = 0,
    layerMode = 'all',
    bandCenterX,
    profileBase,
    containerCenterX,
    containerWidth,
    containerHeight,
    collarSpawnActive = true,
    collarDrain01 = 1,
    collarRegrow01 = 1,
  } = args;

  const fillColor = fillColorArg ?? FX_FILL_COLOR;

  if (life01 <= 0.02 || foamStrength < 0.05) {
    return [];
  }

  const surfaceCtx: SurfaceContactContext = {
    bandCenterX,
    profileBase,
    containerCenterX,
    containerWidth,
    containerHeight,
  };

  const strength = Math.min(1.5, foamStrength);
  const layers: RenderLayerData[] = [];
  const includeSpines = layerMode === 'all' || layerMode === 'spinesOnly';
  const includeBlobs = layerMode === 'all' || layerMode === 'blobsOnly';

  if (includeSpines) {
    if (kind === 'dent') {
      buildDentSpines(
        layers,
        foamSeed,
        foamAge,
        life01,
        strength,
        direction,
        fillColor,
        surfaceCtx
      );
    }
  }

  if (includeBlobs) {
    if (kind === 'collar' || kind === 'dangerEdge') {
      buildCollarOutwardBlobs(
        layers,
        foamSeed,
        foamAge,
        strength,
        fillColor,
        surfaceCtx,
        collarSpawnActive,
        collarDrain01,
        collarRegrow01
      );
    } else if (kind === 'splash') {
      buildSplashParticles(
        layers,
        foamSeed,
        foamAge,
        life01,
        strength,
        direction,
        fillColor,
        surfaceCtx
      );
    } else if (kind === 'wake') {
      buildWakeTrailDroplet(
        layers,
        foamSeed,
        foamAge,
        life01,
        strength,
        direction,
        fillColor,
        surfaceCtx
      );
    } else if (kind === 'pivotFan') {
      buildPivotBurstParticles(
        layers,
        foamSeed,
        foamAge,
        life01,
        strength,
        direction,
        fillColor,
        surfaceCtx
      );
    } else if (kind === 'pinnedBurst') {
      buildPinnedBurstParticles(
        layers,
        foamSeed,
        foamAge,
        life01,
        strength,
        fillColor,
        surfaceCtx
      );
    } else if (kind === 'wallBump') {
      buildPivotBurstParticles(
        layers,
        foamSeed,
        foamAge,
        life01,
        strength,
        direction,
        fillColor,
        surfaceCtx
      );
    }
  }

  return layers;
}

/** Blend hex colors for near-pin danger tint (simple RGB lerp). */
export const blendFoamFillColors = (
  base: string,
  danger: string,
  danger01: number
): string => {
  'worklet';
  const t = Math.max(0, Math.min(1, danger01));
  if (t <= 0) {
    return base;
  }
  if (t >= 1) {
    return danger;
  }
  const parse = (hex: string): [number, number, number] => {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return [r, g, b];
  };
  const [r0, g0, b0] = parse(base);
  const [r1, g1, b1] = parse(danger);
  const r = Math.round(lerp(r0, r1, t));
  const g = Math.round(lerp(g0, g1, t));
  const b = Math.round(lerp(b0, b1, t));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
