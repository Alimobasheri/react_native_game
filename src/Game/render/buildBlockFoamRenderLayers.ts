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

type FoamBlobDraw = {
  x: number;
  y: number;
  radius: number;
  opacity: number;
};

/** Foam blob: slow swell → brief cling → slow fade → gentle reappear. */
const evalFoamBlobLifecycle = (
  seed: number,
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
  const spawnDelay =
    hash01(seed + 7.1) * blockFoamTuning.blobSpawnStaggerSeconds;
  const localAge = foamAge - spawnDelay;
  if (localAge <= 0) {
    return null;
  }

  const lifeSpan =
    (blockFoamTuning.blobLifeMinSeconds +
      hash01(seed + 3.7) *
        (blockFoamTuning.blobLifeMaxSeconds - blockFoamTuning.blobLifeMinSeconds)) /
    Math.max(0.55, speedFactor);
  const cycleOffset = hash01(seed + 19.2) * lifeSpan;
  const cycleAge = (localAge + cycleOffset) % lifeSpan;
  const lifeT = cycleAge / lifeSpan;

  const growDuration =
    blockFoamTuning.blobGrowSeconds / Math.max(0.55, speedFactor);
  const growEnd = Math.min(0.28, growDuration / lifeSpan);
  const fadeStart = blockFoamTuning.blobFadeStartFraction;

  let alpha = 0;
  let scale = blockFoamTuning.minSettledScale;
  let bulgeStrength = 0;
  let creepFactor = 0;

  if (lifeT < growEnd) {
    const grow = smoothstep01(lifeT / growEnd);
    alpha = grow * blockFoamTuning.settledOpacity;
    scale = blockFoamTuning.minSettledScale + grow * (1 - blockFoamTuning.minSettledScale);
    bulgeStrength = grow * blockFoamTuning.settledSpillStrength;
    creepFactor = grow * 0.65;
  } else if (lifeT < fadeStart) {
    const hold = (lifeT - growEnd) / Math.max(0.001, fadeStart - growEnd);
    const breathe =
      blockFoamTuning.settledBreatheAmplitude *
      Math.sin(cycleAge * 1.05 + seed * 0.31);
    alpha = blockFoamTuning.settledOpacity + breathe;
    scale = 1;
    bulgeStrength = blockFoamTuning.settledSpillStrength;
    creepFactor = 1 - hold * 0.75;
  } else {
    const fade = smoothstep01((lifeT - fadeStart) / Math.max(0.001, 1 - fadeStart));
    alpha = blockFoamTuning.settledOpacity * (1 - fade);
    scale = 1 - fade * 0.22;
    bulgeStrength = blockFoamTuning.settledSpillStrength * (1 - fade * 0.6);
    creepFactor = 0;
  }

  if (alpha < 0.08 && lifeT < growEnd * 0.5) {
    return null;
  }

  const maxRadius =
    blockFoamTuning.minRadiusPx +
    hash01(seed + 11) * (blockFoamTuning.maxRadiusPx - blockFoamTuning.minRadiusPx);
  const radius = maxRadius * scale;

  const creepRate =
    blockFoamTuning.creepSpeedPxPerSec * (0.65 + hash01(seed + 5) * 0.35);
  const creep = Math.min(
    blockFoamTuning.maxCreepPx,
    cycleAge * creepRate * creepFactor
  );
  const shimmerScale = lifeT < fadeStart ? 0.35 : 0.12;

  const opacity = rowFade * blockFoamTuning.maxBlobOpacity * alpha;
  if (opacity < blockFoamTuning.minDrawOpacity) {
    return null;
  }

  if (isHorizontalEdge(side)) {
    const outwardDirY = side === 'bottom' ? 1 : -1;
    const bulgeY =
      outwardDirY * blockHeight * blockFoamTuning.spillBulgeFraction * bulgeStrength;
    const creepDirX = hash01(seed + 9.3) < 0.5 ? -1 : 1;
    const creepX = creep * creepDirX;
    const shimmerX =
      blockFoamTuning.shimmerPx *
      Math.sin(cycleAge * 0.85 + seed) *
      shimmerScale;
    const shimmerY =
      outwardDirY *
      blockFoamTuning.shimmerPx *
      0.4 *
      Math.sin(cycleAge * 0.65 + seed * 1.07) *
      shimmerScale;

    const x = clampFoamCenterXOnColumn(anchorX + creepX + shimmerX, radius, colBounds);
    const y = clampFoamCenterY(anchorY + bulgeY + shimmerY, radius, rowBounds, side);

    return { x, y, radius, opacity };
  }

  const outwardDirX = side === 'right' ? 1 : -1;
  const bulgeX =
    outwardDirX * blockWidth * blockFoamTuning.spillBulgeFraction * bulgeStrength;
  const shimmerX =
    outwardDirX *
    blockFoamTuning.shimmerPx *
    Math.sin(cycleAge * 0.85 + seed) *
    shimmerScale;
  const shimmerY =
    blockFoamTuning.shimmerPx *
    0.4 *
    Math.sin(cycleAge * 0.65 + seed * 1.07) *
    shimmerScale;

  const x = clampFoamCenterX(
    anchorX + bulgeX + shimmerX,
    radius,
    colBounds,
    side
  );

  return {
    x,
    y: anchorY - creep + shimmerY,
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
};

const computeFoamContactBand = (
  contactLocalY: number,
  blockHeight: number
): { bandBottom: number; bandTop: number } => {
  'worklet';
  const halfH = blockHeight * 0.5;
  const bandBottom = Math.min(halfH - 2, Math.max(-halfH + 2, contactLocalY));
  const bandTop = Math.max(
    -halfH + 2,
    bandBottom - blockFoamTuning.foamClimbBandPx
  );
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
  } = args;

  if (contacts.length === 0) {
    return [];
  }

  const { bandBottom, bandTop } = computeFoamContactBand(
    contactLocalY,
    blockHeight
  );
  const bandHeight = Math.max(4, bandBottom - bandTop);
  const rowBounds = blockRowBounds(blockHeight);
  const rowFade = Math.min(
    1,
    foamAge / Math.max(0.001, blockFoamTuning.rowFadeInSeconds)
  );
  const speedFactor = Math.max(
    0.55,
    waterRaiseSpeed / blockFoamTuning.speedReference
  );
  const layers: RenderLayerData[] = [];

  for (let c = 0; c < contacts.length; c++) {
    const contact = contacts[c];
    const colBounds = columnLocalBounds(contact.col, rowLength, blockWidth);
    const colSeed = contact.col * 19.17 + sideSeedOffset(contact.side);
    const horizontal = isHorizontalEdge(contact.side);

    for (let i = 0; i < blockFoamTuning.blobsPerEdge; i++) {
      const seed = colSeed + i * 41.3;
      const slotT = (i + hash01(seed + 2)) / blockFoamTuning.blobsPerEdge;

      let anchorX: number;
      let anchorY: number;
      if (horizontal) {
        const pad = 2;
        const span = Math.max(4, blockWidth - pad * 2);
        anchorX = colBounds.left + pad + slotT * span;
        anchorY = exposedFaceLocalY(contact.side, rowBounds, blockHeight);
      } else {
        anchorX = waterFaceLocalX(contact, colBounds, blockWidth);
        anchorY = bandBottom - slotT * bandHeight;
      }

      const blob = evalFoamBlobLifecycle(
        seed,
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

      layers.push({
        position: { x: blob.x, y: blob.y },
        shape: { type: ShapeTypes.Circle, radius: blob.radius },
        fillColor: blockFoamTuning.fillColor,
        opacity: blob.opacity,
        visible: true,
      });
    }
  }

  return layers;
}
