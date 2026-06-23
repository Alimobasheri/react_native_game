import {
  RenderLayerData,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { blockFoamTuning } from '@/config/blockFoamTuning';
import type { BlockFoamContact, BlockFoamContactSide } from '@/Game/visual/blockFoamContacts';

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

const isHorizontalEdge = (side: BlockFoamContactSide): boolean => {
  'worklet';
  return side === 'top' || side === 'bottom';
};

const sideSeedOffset = (side: BlockFoamContactSide): number => {
  'worklet';
  if (side === 'left') {
    return 3.1;
  }
  if (side === 'right') {
    return 7.4;
  }
  if (side === 'top') {
    return 11.8;
  }
  return 15.6;
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

export const computeRowFoamSeed = (
  rowEntity: number,
  gaps: readonly number[],
  rowY: number
): number => {
  'worklet';
  let gapMix = 0;
  for (let i = 0; i < gaps.length; i++) {
    gapMix += gaps[i] * (i + 1) * 13.71;
  }
  return rowEntity * 17.317 + rowY * 0.0413 + gapMix;
};

type RowFoamProfile = {
  climbBandPx: number;
  fadeInSeconds: number;
  blobCountBias: number;
  staggerScale: number;
  lifeScale: number;
  radiusScale: number;
  opacityScale: number;
};

const deriveRowFoamProfile = (rowSeed: number): RowFoamProfile => {
  'worklet';
  return {
    climbBandPx:
      blockFoamTuning.foamClimbBandPx *
      rowRange(rowSeed, 2.1, blockFoamTuning.rowClimbBandVariance),
    fadeInSeconds:
      blockFoamTuning.rowFadeInSeconds *
      rowRange(rowSeed, 5.4, blockFoamTuning.rowFadeVariance),
    blobCountBias: rowRange(rowSeed, 8.6, blockFoamTuning.rowBlobCountVariance),
    staggerScale: rowRange(rowSeed, 11.3, [0.72, 1.35]),
    lifeScale: rowRange(rowSeed, 14.9, [0.82, 1.28]),
    opacityScale: rowRange(rowSeed, 21.7, [0.78, 1.08]),
    radiusScale: rowRange(rowSeed, 24.2, [0.86, 1.18]),
  };
};

const contactBlobCount = (rowSeed: number, contact: BlockFoamContact): number => {
  'worklet';
  const profile = deriveRowFoamProfile(rowSeed);
  const edgeBias =
    0.82 + hash01(rowSeed + contact.col * 7.13 + sideSeedOffset(contact.side) * 2.7) * 0.48;
  return Math.max(
    4,
    Math.round(blockFoamTuning.blobsPerEdge * profile.blobCountBias * edgeBias)
  );
};

const shouldSkipBlob = (rowSeed: number, seed: number): boolean => {
  'worklet';
  const skipChance =
    blockFoamTuning.rowBlobSkipChance * rowRange(rowSeed, 31.5, [0.55, 1.35]);
  return hash01(seed + 44.8) < skipChance;
};

const estimateDropletRadius = (seed: number, rowSeed: number): number => {
  'worklet';
  const profile = deriveRowFoamProfile(rowSeed);
  return (
    (blockFoamTuning.minRadiusPx +
      hash01(seed + 11) *
        (blockFoamTuning.maxRadiusPx - blockFoamTuning.minRadiusPx)) *
    profile.radiusScale
  );
};

const anchorJitter = (
  rowSeed: number,
  seed: number,
  axis: 'along' | 'across'
): number => {
  'worklet';
  const base =
    axis === 'along'
      ? blockFoamTuning.rowAnchorJitterAlongPx
      : blockFoamTuning.rowAnchorJitterAcrossPx;
  const amp = base * rowRange(rowSeed, 27.8, [0.45, 1.1]);
  const salt = axis === 'along' ? 9.7 : 6.3;
  return (hash01(seed + rowSeed + salt) - 0.5) * 2 * amp;
};

type DropletAnchor = { anchorX: number; anchorY: number; seed: number };

const columnLocalCenterX = (
  col: number,
  rowLength: number,
  blockWidth: number
): number => {
  'worklet';
  const rowWidth = rowLength * blockWidth;
  const leftEdge = -rowWidth * 0.5;
  return leftEdge + (col + 0.5) * blockWidth;
};

const columnLocalBounds = (
  col: number,
  rowLength: number,
  blockWidth: number
): { left: number; right: number } => {
  'worklet';
  const center = columnLocalCenterX(col, rowLength, blockWidth);
  const half = blockWidth * 0.5;
  return { left: center - half, right: center + half };
};

const blockRowBounds = (blockHeight: number): { top: number; bottom: number } => {
  'worklet';
  const halfH = blockHeight * 0.5;
  return { top: -halfH, bottom: halfH };
};

const waterFaceLocalX = (
  contact: BlockFoamContact,
  colBounds: { left: number; right: number },
  blockWidth: number
): number => {
  'worklet';
  const inset = blockWidth * blockFoamTuning.edgeAnchorInsetFraction;
  return contact.side === 'right' ? colBounds.right - inset : colBounds.left + inset;
};

const exposedFaceLocalY = (
  side: 'top' | 'bottom',
  rowBounds: { top: number; bottom: number },
  blockHeight: number
): number => {
  'worklet';
  const inset = blockHeight * blockFoamTuning.edgeAnchorInsetFraction;
  return side === 'bottom' ? rowBounds.bottom - inset : rowBounds.top + inset;
};

const buildEdgeDropletAnchors = (
  contact: BlockFoamContact,
  rowSeed: number,
  colBounds: { left: number; right: number },
  rowBounds: { top: number; bottom: number },
  blockWidth: number,
  blockHeight: number,
  bandBottom: number,
  bandHeight: number,
  horizontal: boolean
): DropletAnchor[] => {
  'worklet';
  const colSeed = contact.col * 19.17 + sideSeedOffset(contact.side);
  const targetCount = contactBlobCount(rowSeed, contact);
  const anchors: DropletAnchor[] = [];
  const spacingBias =
    blockFoamTuning.dropletSpacingRatio *
    rowRange(rowSeed, 36.2, [0.88, 1.12]);

  if (horizontal) {
    const pad = 2;
    const span = Math.max(4, blockWidth - pad * 2);
    const faceY = exposedFaceLocalY(contact.side, rowBounds, blockHeight);
    let along = hash01(rowSeed + colSeed) * 2.5;
    for (let i = 0; i < targetCount; i++) {
      const seed = rowSeed * 0.173 + colSeed + i * 41.3;
      if (shouldSkipBlob(rowSeed, seed)) {
        continue;
      }
      const radius = estimateDropletRadius(seed, rowSeed);
      along += radius * 2 * spacingBias * (0.82 + hash01(seed + 2.4) * 0.28);
      if (along > span + radius) {
        break;
      }
      anchors.push({
        anchorX:
          colBounds.left + pad + along + anchorJitter(rowSeed, seed, 'along'),
        anchorY: faceY + anchorJitter(rowSeed, seed, 'across'),
        seed,
      });
    }
    return anchors;
  }

  const faceX = waterFaceLocalX(contact, colBounds, blockWidth);
  let along = hash01(rowSeed + colSeed + 4.2) * 2;
  for (let i = 0; i < targetCount; i++) {
    const seed = rowSeed * 0.173 + colSeed + i * 41.3;
    if (shouldSkipBlob(rowSeed, seed)) {
      continue;
    }
    const radius = estimateDropletRadius(seed, rowSeed);
    along += radius * 2 * spacingBias * (0.82 + hash01(seed + 2.4) * 0.28);
    if (along > bandHeight + radius) {
      break;
    }
    anchors.push({
      anchorX: faceX + anchorJitter(rowSeed, seed, 'across'),
      anchorY: bandBottom - along + anchorJitter(rowSeed, seed, 'along'),
      seed,
    });
  }
  return anchors;
};

const clampFoamCenterX = (
  x: number,
  radius: number,
  colBounds: { left: number; right: number },
  side: 'left' | 'right'
): number => {
  'worklet';
  const pad = 2;
  const onBlockInset = radius * blockFoamTuning.minOnBlockRadiusFraction;

  if (side === 'right') {
    const minX = colBounds.left + pad + radius;
    const maxTowardWater = colBounds.right - onBlockInset;
    if (maxTowardWater <= minX) {
      return (colBounds.left + colBounds.right) * 0.5;
    }
    return Math.max(minX, Math.min(maxTowardWater, x));
  }

  const maxX = colBounds.right - pad - radius;
  const minTowardWater = colBounds.left + onBlockInset;
  if (maxX <= minTowardWater) {
    return (colBounds.left + colBounds.right) * 0.5;
  }
  return Math.max(minTowardWater, Math.min(maxX, x));
};

const clampFoamCenterXOnColumn = (
  x: number,
  radius: number,
  colBounds: { left: number; right: number }
): number => {
  'worklet';
  const pad = 2;
  const minX = colBounds.left + pad + radius;
  const maxX = colBounds.right - pad - radius;
  if (maxX <= minX) {
    return (colBounds.left + colBounds.right) * 0.5;
  }
  return Math.max(minX, Math.min(maxX, x));
};

const clampFoamCenterY = (
  y: number,
  radius: number,
  rowBounds: { top: number; bottom: number },
  side: 'top' | 'bottom'
): number => {
  'worklet';
  const pad = 2;
  const onBlockInset = radius * blockFoamTuning.minOnBlockRadiusFraction;

  if (side === 'bottom') {
    const minY = rowBounds.top + pad + radius;
    const maxTowardOpen = rowBounds.bottom - onBlockInset;
    if (maxTowardOpen <= minY) {
      return (rowBounds.top + rowBounds.bottom) * 0.5;
    }
    return Math.max(minY, Math.min(maxTowardOpen, y));
  }

  const maxY = rowBounds.bottom - pad - radius;
  const minTowardOpen = rowBounds.top + onBlockInset;
  if (maxY <= minTowardOpen) {
    return (rowBounds.top + rowBounds.bottom) * 0.5;
  }
  return Math.max(minTowardOpen, Math.min(maxY, y));
};

type FoamBlobDraw = {
  x: number;
  y: number;
  radius: number;
  opacity: number;
};

const evalFoamPopScale = (lifeT: number): number => {
  'worklet';
  const growEnd = blockFoamTuning.blobPopGrowEndFraction;
  const holdEnd = blockFoamTuning.blobPopHoldEndFraction;
  if (lifeT < growEnd) {
    const grow = smoothstep01(lifeT / growEnd);
    return (
      blockFoamTuning.blobScaleStart +
      grow * (blockFoamTuning.blobScaleOvershoot - blockFoamTuning.blobScaleStart)
    );
  }
  if (lifeT < holdEnd) {
    const settle = smoothstep01((lifeT - growEnd) / Math.max(0.001, holdEnd - growEnd));
    return (
      blockFoamTuning.blobScaleOvershoot +
      settle * (blockFoamTuning.blobScaleSettle - blockFoamTuning.blobScaleOvershoot)
    );
  }
  const fade = smoothstep01((lifeT - holdEnd) / Math.max(0.001, 1 - holdEnd));
  return (
    blockFoamTuning.blobScaleSettle +
    fade * (blockFoamTuning.blobScalePop - blockFoamTuning.blobScaleSettle)
  );
};

const evalFoamPopAlpha = (lifeT: number, cycleAge: number, seed: number): number => {
  'worklet';
  const growEnd = blockFoamTuning.blobPopGrowEndFraction;
  const holdEnd = blockFoamTuning.blobPopHoldEndFraction;
  if (lifeT < growEnd) {
    return smoothstep01(lifeT / growEnd) * blockFoamTuning.settledOpacity;
  }
  if (lifeT < holdEnd) {
    return (
      blockFoamTuning.settledOpacity +
      blockFoamTuning.settledBreatheAmplitude *
        Math.sin(cycleAge * 1.05 + seed * 0.31)
    );
  }
  const fade = smoothstep01((lifeT - holdEnd) / Math.max(0.001, 1 - holdEnd));
  return blockFoamTuning.settledOpacity * (1 - fade);
};

const pushFoamDropletLayer = (
  layers: RenderLayerData[],
  blob: FoamBlobDraw
): void => {
  'worklet';
  if (blob.opacity < blockFoamTuning.minDrawOpacity || blob.radius < 1) {
    return;
  }
  layers.push({
    position: { x: blob.x, y: blob.y },
    shape: { type: ShapeTypes.Circle, radius: blob.radius },
    fillColor: blockFoamTuning.fillColor,
    opacity: blob.opacity,
    visible: true,
  });
};

/** Straight white backbone along the wet face — merged with droplets for a continuous surf line. */
const pushFoamSpineLayer = (
  layers: RenderLayerData[],
  contact: BlockFoamContact,
  colBounds: { left: number; right: number },
  rowBounds: { top: number; bottom: number },
  blockWidth: number,
  blockHeight: number,
  bandBottom: number,
  bandTop: number,
  horizontal: boolean,
  rowFade: number
): void => {
  'worklet';
  const spineW = blockFoamTuning.spineWidthPx;
  const opacity = blockFoamTuning.spineOpacity * rowFade;
  if (opacity < blockFoamTuning.minDrawOpacity) {
    return;
  }
  const cap = spineW * 0.5;

  if (horizontal) {
    const pad = 2;
    const span = Math.max(4, blockWidth - pad * 2);
    const faceY = exposedFaceLocalY(contact.side, rowBounds, blockHeight);
    layers.push({
      position: { x: colBounds.left + pad + span * 0.5, y: faceY },
      shape: {
        type: ShapeTypes.Rectangle,
        width: span,
        height: spineW,
        borderRadius: cap,
      },
      fillColor: blockFoamTuning.fillColor,
      opacity,
      visible: true,
    });
    return;
  }

  const faceX = waterFaceLocalX(contact, colBounds, blockWidth);
  const span = Math.max(4, bandBottom - bandTop);
  layers.push({
    position: { x: faceX, y: bandTop + span * 0.5 },
    shape: {
      type: ShapeTypes.Rectangle,
      width: spineW,
      height: span,
      borderRadius: cap,
    },
    fillColor: blockFoamTuning.fillColor,
    opacity,
    visible: true,
  });
};

/** Wet foam droplet: pop → hold → fade; drifts along the contact edge. */
const evalFoamBlobLifecycle = (
  seed: number,
  rowSeed: number,
  anchorX: number,
  anchorY: number,
  foamAge: number,
  speedFactor: number,
  blockWidth: number,
  blockHeight: number,
  side: BlockFoamContactSide,
  colBounds: { left: number; right: number },
  rowBounds: { top: number; bottom: number },
  rowFade: number
): FoamBlobDraw | null => {
  'worklet';
  const profile = deriveRowFoamProfile(rowSeed);
  const spawnDelay =
    hash01(seed + 7.1) *
    blockFoamTuning.blobSpawnStaggerSeconds *
    profile.staggerScale;
  const localAge = foamAge - spawnDelay;
  if (localAge <= 0) {
    return null;
  }

  const lifeSpan =
    ((blockFoamTuning.blobLifeMinSeconds +
      hash01(seed + 3.7) *
        (blockFoamTuning.blobLifeMaxSeconds - blockFoamTuning.blobLifeMinSeconds)) /
      Math.max(0.55, speedFactor)) *
    profile.lifeScale;
  const cycleOffset = hash01(seed + 19.2) * lifeSpan;
  const cycleAge = (localAge + cycleOffset) % lifeSpan;
  const lifeT = cycleAge / lifeSpan;

  const alpha = evalFoamPopAlpha(lifeT, cycleAge, seed);
  if (alpha < 0.08 && lifeT < blockFoamTuning.blobPopGrowEndFraction * 0.45) {
    return null;
  }

  const scale = evalFoamPopScale(lifeT);
  const bulgeStrength =
    lifeT < blockFoamTuning.blobPopHoldEndFraction
      ? blockFoamTuning.settledSpillStrength
      : blockFoamTuning.settledSpillStrength *
        (1 -
          smoothstep01(
            (lifeT - blockFoamTuning.blobPopHoldEndFraction) /
              Math.max(0.001, 1 - blockFoamTuning.blobPopHoldEndFraction)
          ) *
            0.65);

  const driftFactor =
    lifeT < blockFoamTuning.blobPopHoldEndFraction
      ? 1 -
        (lifeT / Math.max(0.001, blockFoamTuning.blobPopHoldEndFraction)) * 0.35
      : 0;

  const maxRadius =
    (blockFoamTuning.minRadiusPx +
      hash01(seed + 11) * (blockFoamTuning.maxRadiusPx - blockFoamTuning.minRadiusPx)) *
    profile.radiusScale;
  const radius = maxRadius * scale;

  const driftRate =
    blockFoamTuning.edgeDriftPxPerSec * (0.7 + hash01(seed + 5) * 0.45);
  const drift = Math.min(blockFoamTuning.maxEdgeDriftPx, cycleAge * driftRate * driftFactor);
  const bob =
    Math.sin(cycleAge * 3.4 + seed * 0.73) * blockFoamTuning.edgeBobPx;
  const shimmerScale = lifeT < blockFoamTuning.blobPopHoldEndFraction ? 0.4 : 0.15;

  const opacity =
    rowFade * blockFoamTuning.maxBlobOpacity * alpha * profile.opacityScale;
  if (opacity < blockFoamTuning.minDrawOpacity) {
    return null;
  }

  if (isHorizontalEdge(side)) {
    const outwardDirY = side === 'bottom' ? 1 : -1;
    const bulgeY =
      outwardDirY * blockHeight * blockFoamTuning.spillBulgeFraction * bulgeStrength;
    const alongDirX = hash01(seed + 9.3) < 0.5 ? -1 : 1;
    const driftAlongEdge = drift * alongDirX;
    const shimmerX =
      blockFoamTuning.shimmerPx *
      Math.sin(cycleAge * 0.85 + seed) *
      shimmerScale;

    const x = clampFoamCenterXOnColumn(
      anchorX + driftAlongEdge + shimmerX,
      radius,
      colBounds
    );
    const y = clampFoamCenterY(
      anchorY + bulgeY + bob,
      radius,
      rowBounds,
      side
    );

    return { x, y, radius, opacity };
  }

  const outwardDirX = side === 'right' ? 1 : -1;
  const bulgeX =
    outwardDirX * blockWidth * blockFoamTuning.spillBulgeFraction * bulgeStrength;
  const alongDirY = hash01(seed + 9.3) < 0.5 ? -1 : 1;
  const driftAlongEdge = drift * alongDirY;
  const shimmerX =
    outwardDirX *
    blockFoamTuning.shimmerPx *
    0.35 *
    Math.sin(cycleAge * 0.85 + seed) *
    shimmerScale;

  const x = clampFoamCenterX(
    anchorX + bulgeX + shimmerX,
    radius,
    colBounds,
    side
  );

  return {
    x,
    y: anchorY + driftAlongEdge + bob,
    radius,
    opacity,
  };
};

export type BuildBlockFoamRenderLayersArgs = {
  contacts: readonly BlockFoamContact[];
  rowLength: number;
  blockWidth: number;
  blockHeight: number;
  foamAge: number;
  waterRaiseSpeed: number;
  contactLocalY: number;
  rowSeed: number;
};

const computeFoamContactBand = (
  contactLocalY: number,
  blockHeight: number,
  climbBandPx: number
): { bandBottom: number; bandTop: number } => {
  'worklet';
  const halfH = blockHeight * 0.5;
  const bandBottom = Math.min(halfH - 2, Math.max(-halfH + 2, contactLocalY));
  const bandTop = Math.max(-halfH + 2, bandBottom - climbBandPx);
  return { bandBottom, bandTop };
};

export function buildBlockFoamRenderLayers(
  args: BuildBlockFoamRenderLayersArgs
): RenderLayerData[] {
  'worklet';
  const {
    contacts,
    rowLength,
    blockWidth,
    blockHeight,
    foamAge,
    waterRaiseSpeed,
    contactLocalY,
    rowSeed,
  } = args;

  if (contacts.length === 0) {
    return [];
  }

  const profile = deriveRowFoamProfile(rowSeed);
  const { bandBottom, bandTop } = computeFoamContactBand(
    contactLocalY,
    blockHeight,
    profile.climbBandPx
  );
  const bandHeight = Math.max(4, bandBottom - bandTop);
  const rowBounds = blockRowBounds(blockHeight);
  const rowFade = Math.min(1, foamAge / Math.max(0.001, profile.fadeInSeconds));
  const speedFactor = Math.max(
    0.55,
    waterRaiseSpeed / blockFoamTuning.speedReference
  );
  const layers: RenderLayerData[] = [];

  for (let c = 0; c < contacts.length; c++) {
    const contact = contacts[c];
    const colBounds = columnLocalBounds(contact.col, rowLength, blockWidth);
    const horizontal = isHorizontalEdge(contact.side);
    pushFoamSpineLayer(
      layers,
      contact,
      colBounds,
      rowBounds,
      blockWidth,
      blockHeight,
      bandBottom,
      bandTop,
      horizontal,
      rowFade
    );
    const dropletAnchors = buildEdgeDropletAnchors(
      contact,
      rowSeed,
      colBounds,
      rowBounds,
      blockWidth,
      blockHeight,
      bandBottom,
      bandHeight,
      horizontal
    );

    for (let i = 0; i < dropletAnchors.length; i++) {
      const { anchorX, anchorY, seed } = dropletAnchors[i];

      const blob = evalFoamBlobLifecycle(
        seed,
        rowSeed,
        anchorX,
        anchorY,
        foamAge,
        speedFactor,
        blockWidth,
        blockHeight,
        contact.side,
        colBounds,
        rowBounds,
        rowFade
      );
      if (!blob) {
        continue;
      }

      pushFoamDropletLayer(layers, blob);
    }
  }

  return layers;
}
