import { getColumnCenterX, LAYOUT_CONSTANTS } from '@/Layout';
import { swimmerPhysicsTuning } from '@/config/swimmerTuning';
import { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { ObstacleRowComponentData } from '@/Game/ecs-components/ObstacleRowComponent';

/** Axis-aligned bounding box in world pixels. */
export type AABB = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type CollisionRow = {
  y: number;
  gaps: readonly number[];
  solidColumnCentersX?: readonly number[];
};

export type ContainerLayout = {
  centerX: number;
  width: number;
  columnCount?: number;
};

export type BlockSize = {
  width: number;
  height: number;
};

export type ResolveSwimmerInput = {
  x: number;
  y: number;
  halfWidth: number;
  halfHeight: number;
  /** Render tilt (radians). Expands the collision AABB so visuals cannot clip solids. */
  angle?: number;
  deltaX: number;
  /** Negative = up (buoyancy rise). */
  deltaY: number;
  /** World-space Y delta applied to obstacle rows this frame (positive = down). */
  rowDeltaY: number;
  rows: readonly CollisionRow[];
  container: ContainerLayout;
  blockSize: BlockSize;
  /** Block hitbox scale relative to grid cell (default 1.0). */
  hitboxScale?: number;
  minX: number;
  maxX: number;
  /** Compact navigation core for pin release after sliding out from under a ceiling. */
  releaseHalfWidth?: number;
  releaseHalfHeight?: number;
  /** Frame-start pin anchor X (world px). */
  pinAnchorX?: number;
  /** Persisted ceiling column from prior frame while pinned. */
  pinnedCeilingMinX?: number;
  pinnedCeilingMaxX?: number;
  /**
   * Legacy flag from the pre-swept pipeline. Horizontal row solids are always
   * swept; this field is retained for API compatibility and ignored.
   */
  kinematicHorizontal?: boolean;
};

export type ResolveSwimmerResult = {
  x: number;
  y: number;
  isPinnedFromAbove: boolean;
  isSideBlocked: boolean;
  /** When horizontal motion was stopped: -1 = left, 1 = right. */
  sideBlockedDirection: -1 | 0 | 1;
  isColliding: boolean;
  /** Underside ceiling contact without ending pinned — skill brush signal. */
  ceilingBrushContact: boolean;
  pinnedCeilingMinX?: number;
  pinnedCeilingMaxX?: number;
};

const DEFAULT_HITBOX_SCALE = 1.0;
const SKIN_EPSILON = 0.5;

export function aabbFromCenter(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number
): AABB {
  'worklet';
  return {
    minX: cx - halfW,
    maxX: cx + halfW,
    minY: cy - halfH,
    maxY: cy + halfH,
  };
}

/** Axis-aligned bounds of a rotated rectangle (conservative, no penetration at max tilt). */
export function tiltedAabbHalfExtents(
  halfWidth: number,
  halfHeight: number,
  angleRadians: number
): { halfWidth: number; halfHeight: number } {
  'worklet';
  const c = Math.abs(Math.cos(angleRadians));
  const s = Math.abs(Math.sin(angleRadians));
  return {
    halfWidth: halfWidth * c + halfHeight * s,
    halfHeight: halfWidth * s + halfHeight * c,
  };
}

function overlapDepths(
  mover: AABB,
  solid: AABB
): { overlapX: number; overlapY: number } {
  'worklet';
  return {
    overlapX: Math.min(mover.maxX - solid.minX, solid.maxX - mover.minX),
    overlapY: Math.min(mover.maxY - solid.minY, solid.maxY - mover.minY),
  };
}

export function aabbOverlap(a: AABB, b: AABB): boolean {
  'worklet';
  return (
    a.minX < b.maxX &&
    a.maxX > b.minX &&
    a.minY < b.maxY &&
    a.maxY > b.minY
  );
}

/**
 * Time of impact in [0, 1] for a moving AABB vs a static AABB along displacement `velocity`.
 * Returns null when there is no collision along the segment.
 */
export function sweptAabbTOI(
  mover: AABB,
  staticBox: AABB,
  velocity: { x: number; y: number }
): number | null {
  'worklet';
  const vx = velocity.x;
  const vy = velocity.y;

  let entryX = Number.NEGATIVE_INFINITY;
  let exitX = Number.POSITIVE_INFINITY;
  let entryY = Number.NEGATIVE_INFINITY;
  let exitY = Number.POSITIVE_INFINITY;

  if (vx > 0) {
    entryX = (staticBox.minX - mover.maxX) / vx;
    exitX = (staticBox.maxX - mover.minX) / vx;
  } else if (vx < 0) {
    entryX = (staticBox.maxX - mover.minX) / vx;
    exitX = (staticBox.minX - mover.maxX) / vx;
  } else if (mover.maxX <= staticBox.minX || mover.minX >= staticBox.maxX) {
    return null;
  }

  if (vy > 0) {
    entryY = (staticBox.minY - mover.maxY) / vy;
    exitY = (staticBox.maxY - mover.minY) / vy;
  } else if (vy < 0) {
    entryY = (staticBox.maxY - mover.minY) / vy;
    exitY = (staticBox.minY - mover.maxY) / vy;
  } else if (mover.maxY <= staticBox.minY || mover.minY >= staticBox.maxY) {
    return null;
  }

  const entry = Math.max(entryX, entryY);
  const exit = Math.min(exitX, exitY);

  if (entry > exit || entry > 1 || exit < 0) {
    return null;
  }

  return Math.max(0, entry);
}

/** Swept TOI when both boxes move: `velocity` is mover displacement; static moves by `staticVelocity`. */
export function sweptAabbTOIRelative(
  mover: AABB,
  staticBox: AABB,
  velocity: { x: number; y: number },
  staticVelocity: { x: number; y: number }
): number | null {
  'worklet';
  const relative = {
    x: velocity.x - staticVelocity.x,
    y: velocity.y - staticVelocity.y,
  };
  const staticAtEnd: AABB = {
    minX: staticBox.minX + staticVelocity.x,
    minY: staticBox.minY + staticVelocity.y,
    maxX: staticBox.maxX + staticVelocity.x,
    maxY: staticBox.maxY + staticVelocity.y,
  };
  return sweptAabbTOI(mover, staticAtEnd, relative);
}

export function selectRowsNearSwimmer(
  rows: readonly CollisionRow[],
  swimmerY: number,
  swimmerHalfHeight: number,
  rowHeight: number,
  verticalSweepPx = 0
): CollisionRow[] {
  'worklet';
  const band =
    rowHeight + swimmerHalfHeight + rowHeight + Math.abs(verticalSweepPx);
  const out: CollisionRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (Math.abs(row.y - swimmerY) < band) {
      out.push(row);
    }
  }
  return out;
}

export function selectRowsNearSwimmerFromComponentStore(
  rowStore: ComponentStore<ObstacleRowComponentData>,
  swimmerY: number,
  swimmerHalfHeight: number,
  rowHeight: number,
  verticalSweepPx = 0
): CollisionRow[] {
  'worklet';
  const band =
    rowHeight + swimmerHalfHeight + rowHeight + Math.abs(verticalSweepPx);
  const out: CollisionRow[] = [];
  rowStore.forEach((_entity, rowData) => {
    if (Math.abs(rowData.y - swimmerY) >= band) {
      return;
    }
    out.push({
      y: rowData.y,
      gaps: rowData.effectiveGaps ?? rowData.gaps,
      solidColumnCentersX:
        rowData.effectiveSolidColumnCentersX ?? rowData.solidColumnCentersX,
    });
  });
  return out;
}

export function solidAABBsFromRow(
  row: CollisionRow,
  container: ContainerLayout,
  blockSize: BlockSize,
  hitboxScale: number
): AABB[] {
  'worklet';
  const halfW = (blockSize.width * hitboxScale) / 2;
  const halfH = (blockSize.height * hitboxScale) / 2;

  if (row.solidColumnCentersX && row.solidColumnCentersX.length > 0) {
    const solids: AABB[] = [];
    const centers = row.solidColumnCentersX;
    for (let i = 0; i < centers.length; i++) {
      const cx = centers[i];
      solids.push({
        minX: cx - halfW,
        maxX: cx + halfW,
        minY: row.y - halfH,
        maxY: row.y + halfH,
      });
    }
    return solids;
  }

  const columnCount = container.columnCount ?? LAYOUT_CONSTANTS.COLUMNS;
  const gapSet = new Set<number>();
  for (let g = 0; g < row.gaps.length; g++) {
    gapSet.add(row.gaps[g]);
  }

  const solids: AABB[] = [];
  for (let col = 0; col < columnCount; col++) {
    if (gapSet.has(col)) {
      continue;
    }
    const cx = getColumnCenterX(col, container.centerX, container.width);
    solids.push({
      minX: cx - halfW,
      maxX: cx + halfW,
      minY: row.y - halfH,
      maxY: row.y + halfH,
    });
  }
  return solids;
}

function collectSolidAABBs(
  rows: readonly CollisionRow[],
  container: ContainerLayout,
  blockSize: BlockSize,
  hitboxScale: number
): AABB[] {
  'worklet';
  const all: AABB[] = [];
  for (let i = 0; i < rows.length; i++) {
    const solids = solidAABBsFromRow(rows[i], container, blockSize, hitboxScale);
    for (let j = 0; j < solids.length; j++) {
      all.push(solids[j]);
    }
  }
  return all;
}

function isSwimmerUnderBlockColumn(swimmerX: number, block: AABB): boolean {
  'worklet';
  return (
    swimmerX >= block.minX - SKIN_EPSILON &&
    swimmerX <= block.maxX + SKIN_EPSILON
  );
}

/** True when a depenetration push opposes this frame's intended horizontal travel. */
function pushBlocksHorizontalIntent(
  pushX: number,
  horizontalDelta: number
): boolean {
  'worklet';
  if (horizontalDelta === 0 || pushX === 0) {
    return false;
  }
  return Math.sign(pushX) !== Math.sign(horizontalDelta);
}

/**
 * True only when the swimmer is hanging under a block underside (ceiling pin).
 * Side pillar scrapes while floating must not count as pinned.
 */
function isPinnedUnderBlock(
  swimmerX: number,
  swimmerY: number,
  swimmerHalfWidth: number,
  swimmerHalfHeight: number,
  block: AABB,
  rowDeltaY = 0
): boolean {
  'worklet';
  const swimmerTopY = swimmerY - swimmerHalfHeight;
  const swimmerBottomY = swimmerY + swimmerHalfHeight;
  const swimmerLeftX = swimmerX - swimmerHalfWidth;
  const swimmerRightX = swimmerX + swimmerHalfWidth;
  const blockBottomY = block.maxY;
  const blockTopY = block.minY;

  if (!isSwimmerUnderBlockColumn(swimmerX, block)) {
    return false;
  }

  const horizontalOverlap =
    swimmerLeftX < block.maxX + SKIN_EPSILON &&
    swimmerRightX > block.minX - SKIN_EPSILON;
  if (!horizontalOverlap) {
    return false;
  }

  const overlapW =
    Math.min(swimmerRightX, block.maxX) - Math.max(swimmerLeftX, block.minX);
  const overlapH =
    Math.min(swimmerBottomY, block.maxY) - Math.max(swimmerTopY, block.minY);
  const topToBlockBottom = swimmerTopY - blockBottomY;
  const descendingSlack = Math.max(0, rowDeltaY);
  const carriedWithDescendingCeiling =
    descendingSlack > 0 &&
    topToBlockBottom >= -SKIN_EPSILON &&
    topToBlockBottom <= descendingSlack + SKIN_EPSILON;
  const touchingUnderside =
    carriedWithDescendingCeiling ||
    Math.abs(topToBlockBottom) <= SKIN_EPSILON + descendingSlack * 0.2;
  if (overlapW <= 0 || (overlapH <= 0 && !touchingUnderside)) {
    return false;
  }

  // Side scrape along a pillar face — tall vertical overlap, narrow horizontal band.
  if (overlapH > overlapW * 1.2) {
    return false;
  }

  // Swimmer top must have reached the block underside (no early pin while rising below).
  if (
    topToBlockBottom < -SKIN_EPSILON - descendingSlack * 0.2 ||
    (!carriedWithDescendingCeiling &&
      topToBlockBottom > SKIN_EPSILON + descendingSlack)
  ) {
    return false;
  }

  // Center hangs below the ceiling plane, not beside it.
  if (swimmerY < blockBottomY - SKIN_EPSILON) {
    return false;
  }

  // True ceiling: block extends above the swimmer top.
  if (blockTopY > swimmerTopY + SKIN_EPSILON) {
    return false;
  }

  return true;
}

const CEILING_BRUSH_EPSILON = SKIN_EPSILON * 4;

/**
 * Forgiving underside proximity — brush credit without full pin latch.
 */
function isCeilingUndersideBrush(
  swimmerX: number,
  swimmerY: number,
  swimmerHalfWidth: number,
  swimmerHalfHeight: number,
  block: AABB,
  rowDeltaY = 0
): boolean {
  'worklet';
  if (isPinnedUnderBlock(swimmerX, swimmerY, swimmerHalfWidth, swimmerHalfHeight, block, rowDeltaY)) {
    return false;
  }
  const swimmerTopY = swimmerY - swimmerHalfHeight;
  const swimmerBottomY = swimmerY + swimmerHalfHeight;
  const swimmerLeftX = swimmerX - swimmerHalfWidth;
  const swimmerRightX = swimmerX + swimmerHalfWidth;
  const blockBottomY = block.maxY;
  const blockTopY = block.minY;

  if (!isSwimmerUnderBlockColumn(swimmerX, block)) {
    return false;
  }

  const horizontalOverlap =
    swimmerLeftX < block.maxX + CEILING_BRUSH_EPSILON &&
    swimmerRightX > block.minX - CEILING_BRUSH_EPSILON;
  if (!horizontalOverlap) {
    return false;
  }

  const topToBlockBottom = swimmerTopY - blockBottomY;
  const descendingSlack = Math.max(0, rowDeltaY);
  if (Math.abs(topToBlockBottom) > CEILING_BRUSH_EPSILON + descendingSlack * 0.35) {
    return false;
  }

  if (blockTopY <= swimmerTopY + SKIN_EPSILON) {
    return false;
  }

  const overlapW =
    Math.min(swimmerRightX, block.maxX) - Math.max(swimmerLeftX, block.minX);
  const overlapH =
    Math.min(swimmerBottomY, block.maxY) - Math.max(swimmerTopY, block.minY);
  if (overlapH > overlapW * 1.35) {
    return false;
  }

  return swimmerY >= blockBottomY - CEILING_BRUSH_EPSILON;
}

/** Ceiling block at the column where the swimmer was pinned this frame. */
function isAnchoredPinnedCeiling(
  pinAnchorX: number,
  swimmerY: number,
  swimmerHalfWidth: number,
  swimmerHalfHeight: number,
  block: AABB,
  rowDeltaY = 0
): boolean {
  'worklet';
  if (!isSwimmerUnderBlockColumn(pinAnchorX, block)) {
    return false;
  }
  return isPinnedUnderBlock(
    pinAnchorX,
    swimmerY,
    swimmerHalfWidth,
    swimmerHalfHeight,
    block,
    rowDeltaY
  );
}

function isMovingAwayFromSolid(
  swimmerX: number,
  solid: AABB,
  horizontalDelta: number
): boolean {
  'worklet';
  if (horizontalDelta === 0) {
    return false;
  }
  const solidCenterX = (solid.minX + solid.maxX) * 0.5;
  return Math.sign(horizontalDelta) === Math.sign(swimmerX - solidCenterX);
}

function flagSideBlockIfNeeded(
  pushX: number,
  horizontalDelta: number,
  swimmerX: number,
  solid: AABB
): -1 | 0 | 1 {
  'worklet';
  if (!pushBlocksHorizontalIntent(pushX, horizontalDelta)) {
    return 0;
  }
  if (isMovingAwayFromSolid(swimmerX, solid, horizontalDelta)) {
    return 0;
  }
  return horizontalDelta > 0 ? 1 : -1;
}

function motionAabbForSideContact(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  pinnedUnderCeiling: boolean,
  uprightHalfH: number,
  horizontalSlide: boolean
): AABB {
  'worklet';
  const contactHalfH =
    pinnedUnderCeiling && !horizontalSlide
      ? Math.max(halfH, uprightHalfH)
      : halfH;
  return {
    minX: cx - halfW,
    maxX: cx + halfW,
    minY: cy - contactHalfH - SKIN_EPSILON,
    maxY: cy + contactHalfH + SKIN_EPSILON,
  };
}

function isPinnedUnderAnySolid(
  swimmerX: number,
  swimmerY: number,
  swimmerHalfWidth: number,
  swimmerHalfHeight: number,
  solids: readonly AABB[],
  rowDeltaY: number
): boolean {
  'worklet';
  for (let i = 0; i < solids.length; i++) {
    if (
      isPinnedUnderBlock(
        swimmerX,
        swimmerY,
        swimmerHalfWidth,
        swimmerHalfHeight,
        solids[i],
        rowDeltaY
      )
    ) {
      return true;
    }
  }
  return false;
}

function findAnchoredCeilingBlock(
  anchorX: number,
  swimmerY: number,
  swimmerHalfWidth: number,
  swimmerHalfHeight: number,
  solids: readonly AABB[],
  rowDeltaY: number
): AABB | null {
  'worklet';
  for (let i = 0; i < solids.length; i++) {
    if (
      isAnchoredPinnedCeiling(
        anchorX,
        swimmerY,
        swimmerHalfWidth,
        swimmerHalfHeight,
        solids[i],
        rowDeltaY
      )
    ) {
      return solids[i];
    }
  }
  return null;
}

/**
 * Pin acquire: fair upright collider under a ceiling underside.
 * Pin release: swimmer center leaves the anchored ceiling column (horizontal slide-out).
 */
function resolvePinnedState(
  swimmerX: number,
  swimmerY: number,
  pinAnchorX: number,
  horizontalSlide: boolean,
  upHalfW: number,
  upHalfH: number,
  solids: readonly AABB[],
  rowDeltaY: number,
  currentlyPinned: boolean,
  persistedCeilingMinX?: number,
  persistedCeilingMaxX?: number
): { isPinned: boolean; ceilingMinX?: number; ceilingMaxX?: number } {
  'worklet';
  const anchored = findAnchoredCeilingBlock(
    pinAnchorX,
    swimmerY,
    upHalfW,
    upHalfH,
    solids,
    rowDeltaY
  );

  const columnBounds =
    anchored ??
    (persistedCeilingMinX !== undefined && persistedCeilingMaxX !== undefined
      ? {
          minX: persistedCeilingMinX,
          maxX: persistedCeilingMaxX,
          minY: Number.NEGATIVE_INFINITY,
          maxY: Number.POSITIVE_INFINITY,
        }
      : null);

  if (currentlyPinned && columnBounds && horizontalSlide) {
    if (!isSwimmerUnderBlockColumn(swimmerX, columnBounds)) {
      return { isPinned: false };
    }
  }

  if (currentlyPinned) {
    const stillPinned = anchored
      ? isPinnedUnderBlock(
          swimmerX,
          swimmerY,
          upHalfW,
          upHalfH,
          anchored,
          rowDeltaY
        )
      : isPinnedUnderAnySolid(
          swimmerX,
          swimmerY,
          upHalfW,
          upHalfH,
          solids,
          rowDeltaY
        );
    if (!stillPinned) {
      return { isPinned: false };
    }
    const bounds = anchored ?? columnBounds;
    return {
      isPinned: true,
      ceilingMinX: bounds?.minX,
      ceilingMaxX: bounds?.maxX,
    };
  }

  const acquired = isPinnedUnderAnySolid(
    swimmerX,
    swimmerY,
    upHalfW,
    upHalfH,
    solids,
    rowDeltaY
  );
  if (!acquired) {
    return { isPinned: false };
  }
  const found =
    anchored ??
    findAnchoredCeilingBlock(
      swimmerX,
      swimmerY,
      upHalfW,
      upHalfH,
      solids,
      rowDeltaY
    );
  return {
    isPinned: true,
    ceilingMinX: found?.minX,
    ceilingMaxX: found?.maxX,
  };
}

function resolveAxisPenetration(
  mover: AABB,
  solid: AABB,
  axis: 'x' | 'y'
): number {
  'worklet';
  const overlapX = Math.min(mover.maxX - solid.minX, solid.maxX - mover.minX);
  const overlapY = Math.min(mover.maxY - solid.minY, solid.maxY - mover.minY);
  if (overlapX <= 0 || overlapY <= 0) {
    return 0;
  }

  if (axis === 'x') {
    const moverCenterX = (mover.minX + mover.maxX) * 0.5;
    const solidCenterX = (solid.minX + solid.maxX) * 0.5;
    return moverCenterX < solidCenterX ? -overlapX : overlapX;
  }

  const moverCenterY = (mover.minY + mover.maxY) * 0.5;
  const solidCenterY = (solid.minY + solid.maxY) * 0.5;
  return moverCenterY < solidCenterY ? -overlapY : overlapY;
}

/**
 * Kinematic resolver: swimmer vs row-grid solids with swept vertical/horizontal motion.
 * Blocks are axis-aligned; swimmer hitbox is axis-aligned (visual tilt is render-only).
 */
function resolveSwimmerAgainstRowsStep(
  input: ResolveSwimmerInput
): ResolveSwimmerResult {
  'worklet';

  const hitboxScale = input.hitboxScale ?? DEFAULT_HITBOX_SCALE;
  const solids = collectSolidAABBs(
    input.rows,
    input.container,
    input.blockSize,
    hitboxScale
  );

  const uprightHalf = tiltedAabbHalfExtents(
    input.halfWidth,
    input.halfHeight,
    0
  );
  const motionHalf = tiltedAabbHalfExtents(
    input.halfWidth,
    input.halfHeight,
    input.angle ?? 0
  );
  let x = input.x;
  let y = input.y;
  const startX = x;
  const pinAnchorX = input.pinAnchorX ?? x;
  let isPinnedFromAbove = false;
  let isSideBlocked = false;
  let sideBlockedDirection: -1 | 0 | 1 = 0;
  let isColliding = false;

  const upHalfW = uprightHalf.halfWidth;
  const upHalfH = uprightHalf.halfHeight;
  const motHalfW = motionHalf.halfWidth;
  const motHalfH = motionHalf.halfHeight;
  const rowDeltaY = input.rowDeltaY;
  const staticBlockVel = { x: 0, y: rowDeltaY };
  const horizontalDelta = input.deltaX;
  const horizontalSlide = horizontalDelta !== 0;
  const startedOverlappingSideSolid = (() => {
    const probe = motionAabbForSideContact(
      startX,
      y,
      motHalfW,
      motHalfH,
      false,
      upHalfH,
      horizontalSlide
    );
    for (let i = 0; i < solids.length; i++) {
      if (aabbOverlap(probe, solids[i])) {
        return true;
      }
    }
    return false;
  })();

  const clearSideBlockIfEscaped = (appliedDx: number, horizontalDelta: number) => {
    if (horizontalDelta === 0 || appliedDx === 0) {
      return;
    }
    if (Math.sign(appliedDx) !== Math.sign(horizontalDelta)) {
      return;
    }
    if (startedOverlappingSideSolid) {
      sideBlockedDirection = 0;
      isSideBlocked = false;
      return;
    }
    if (Math.abs(appliedDx) >= Math.abs(horizontalDelta) * 0.85) {
      sideBlockedDirection = 0;
      isSideBlocked = false;
    }
  };

  // --- Vertical: buoyancy rise or settle down (upright core; gap-safe) ---
  if (input.deltaY !== 0) {
    const mover = aabbFromCenter(x, y, upHalfW, upHalfH);
    let earliest: number | null = null;

    for (let i = 0; i < solids.length; i++) {
      if (!isSwimmerUnderBlockColumn(x, solids[i])) {
        continue;
      }
      const toi = sweptAabbTOIRelative(
        mover,
        solids[i],
        { x: 0, y: input.deltaY },
        staticBlockVel
      );
      if (toi !== null && (earliest === null || toi < earliest)) {
        earliest = toi;
      }
    }

    if (earliest !== null && earliest < 1) {
      if (earliest > 0.0001) {
        y += input.deltaY * earliest - SKIN_EPSILON * Math.sign(input.deltaY || 1);
      }
      isColliding = true;
      if (input.deltaY < 0) {
        for (let i = 0; i < solids.length; i++) {
          if (isPinnedUnderBlock(x, y, upHalfW, upHalfH, solids[i], rowDeltaY)) {
            isPinnedFromAbove = true;
            break;
          }
        }
      }
    } else {
      y += input.deltaY;
    }
  }

  // Pin check after vertical move (resting contact under ceiling).
  if (!isPinnedFromAbove) {
    for (let i = 0; i < solids.length; i++) {
      if (isPinnedUnderBlock(x, y, upHalfW, upHalfH, solids[i], rowDeltaY)) {
        isPinnedFromAbove = true;
        isColliding = true;
        break;
      }
    }
  }

  // Ceiling carry: block descent moves pinned swimmer down with it.
  if (isPinnedFromAbove && rowDeltaY !== 0) {
    y += rowDeltaY;
  }

  // --- Horizontal (tilted bounds — lean reaches walls before visual clips) ---
  const pinnedUnderCeiling = isPinnedFromAbove;
  const useReleaseSlide =
    pinnedUnderCeiling &&
    horizontalDelta !== 0 &&
    input.releaseHalfWidth !== undefined &&
    input.releaseHalfHeight !== undefined;
  const slideHalfW = useReleaseSlide ? input.releaseHalfWidth! : motHalfW;
  const slideHalfH = useReleaseSlide ? input.releaseHalfHeight! : motHalfH;
  let targetX = Math.max(input.minX, Math.min(input.maxX, x + horizontalDelta));

  if (horizontalDelta !== 0) {
    const mover = motionAabbForSideContact(
      x,
      y,
      slideHalfW,
      slideHalfH,
      pinnedUnderCeiling,
      upHalfH,
      horizontalSlide
    );
    let earliest: number | null = null;
    let blockHitSolid: AABB | null = null;

    for (let i = 0; i < solids.length; i++) {
      if (
        pinnedUnderCeiling &&
        isAnchoredPinnedCeiling(
          pinAnchorX,
          y,
          upHalfW,
          upHalfH,
          solids[i],
          rowDeltaY
        )
      ) {
        continue;
      }
      const alreadyOverlapping = aabbOverlap(mover, solids[i]);
      if (
        alreadyOverlapping &&
        isMovingAwayFromSolid(x, solids[i], horizontalDelta)
      ) {
        continue;
      }
      const toi = sweptAabbTOIRelative(
        mover,
        solids[i],
        { x: horizontalDelta, y: 0 },
        staticBlockVel
      );
      if (toi !== null && toi < 1 && (earliest === null || toi < earliest)) {
        earliest = toi;
        blockHitSolid = solids[i];
      }
    }

    if (
      earliest !== null &&
      earliest < 1 &&
      blockHitSolid !== null &&
      !isMovingAwayFromSolid(x, blockHitSolid, horizontalDelta)
    ) {
      if (earliest > 0.0001) {
        targetX =
          x +
          horizontalDelta * earliest -
          SKIN_EPSILON * Math.sign(horizontalDelta || 1);
      } else {
        targetX = x;
      }
      isSideBlocked = true;
      sideBlockedDirection = horizontalDelta > 0 ? 1 : -1;
      isColliding = true;
    }
  }

  x = Math.max(input.minX, Math.min(input.maxX, targetX));

  // Depenetration passes (resting contact / numeric drift).
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    const contactHalfW = horizontalDelta !== 0 ? slideHalfW : motHalfW;
    const contactHalfH = horizontalDelta !== 0 ? slideHalfH : motHalfH;
    const motionMover = motionAabbForSideContact(
      x,
      y,
      contactHalfW,
      contactHalfH,
      pinnedUnderCeiling,
      upHalfH,
      horizontalSlide
    );
    const uprightMover = aabbFromCenter(x, y, upHalfW, upHalfH);

    for (let i = 0; i < solids.length; i++) {
      if (!aabbOverlap(motionMover, solids[i])) {
        continue;
      }

      const underColumn = isSwimmerUnderBlockColumn(x, solids[i]);
      const { overlapX, overlapY } = overlapDepths(motionMover, solids[i]);

      // Gap skim: center in gap column, only vertical brush on a pillar — no push.
      if (!underColumn) {
        if (overlapX <= 0 || overlapY > overlapX * 1.2) {
          continue;
        }
        const pushX = resolveAxisPenetration(motionMover, solids[i], 'x');
        if (Math.abs(pushX) > 0) {
          const escaping = isMovingAwayFromSolid(x, solids[i], horizontalDelta);
          const blockDir = flagSideBlockIfNeeded(
            pushX,
            horizontalDelta,
            x,
            solids[i]
          );
          if (blockDir !== 0) {
            isSideBlocked = true;
            sideBlockedDirection = blockDir;
          }
          if (
            !escaping ||
            horizontalDelta === 0 ||
            Math.sign(pushX) === Math.sign(horizontalDelta)
          ) {
            x += pushX;
          }
          isColliding = true;
          moved = true;
          motionMover.minX = x - contactHalfW;
          motionMover.maxX = x + contactHalfW;
          uprightMover.minX = x - upHalfW;
          uprightMover.maxX = x + upHalfW;
        }
        continue;
      }

      isColliding = true;
      const ceilingContact = pinnedUnderCeiling
        ? isAnchoredPinnedCeiling(
            pinAnchorX,
            y,
            upHalfW,
            upHalfH,
            solids[i],
            rowDeltaY
          )
        : isPinnedUnderBlock(
            x,
            y,
            upHalfW,
            upHalfH,
            solids[i],
            rowDeltaY
          );
      const pushX = resolveAxisPenetration(motionMover, solids[i], 'x');
      const pushY = resolveAxisPenetration(uprightMover, solids[i], 'y');
      const preferSideResolution =
        !ceilingContact &&
        overlapX > 0 &&
        (overlapX <= overlapY || overlapY <= 0);

      if (preferSideResolution && Math.abs(pushX) > 0) {
        const escaping = isMovingAwayFromSolid(x, solids[i], horizontalDelta);
        const blockDir = flagSideBlockIfNeeded(
          pushX,
          horizontalDelta,
          x,
          solids[i]
        );
        if (blockDir !== 0) {
          isSideBlocked = true;
          sideBlockedDirection = blockDir;
        }
        if (
          !escaping ||
          horizontalDelta === 0 ||
          Math.sign(pushX) === Math.sign(horizontalDelta)
        ) {
          x += pushX;
        }
        moved = true;
      } else if (ceilingContact && Math.abs(pushY) > 0) {
        if (!pinnedUnderCeiling || pushY >= 0) {
          y += pushY;
          isPinnedFromAbove = true;
          moved = true;
        }
      } else if (Math.abs(pushX) > 0 && Math.abs(pushX) <= Math.abs(pushY)) {
        const escaping = isMovingAwayFromSolid(x, solids[i], horizontalDelta);
        const blockDir = flagSideBlockIfNeeded(
          pushX,
          horizontalDelta,
          x,
          solids[i]
        );
        if (blockDir !== 0) {
          isSideBlocked = true;
          sideBlockedDirection = blockDir;
        }
        if (
          !escaping ||
          horizontalDelta === 0 ||
          Math.sign(pushX) === Math.sign(horizontalDelta)
        ) {
          x += pushX;
        }
        moved = true;
      } else if (Math.abs(pushY) > 0) {
        y += pushY;
        moved = true;
      }

      motionMover.minX = x - contactHalfW;
      motionMover.maxX = x + contactHalfW;
      motionMover.minY = y - Math.max(motHalfH, pinnedUnderCeiling ? upHalfH : motHalfH) - SKIN_EPSILON;
      motionMover.maxY = y + Math.max(motHalfH, pinnedUnderCeiling ? upHalfH : motHalfH) + SKIN_EPSILON;
      uprightMover.minX = x - upHalfW;
      uprightMover.maxX = x + upHalfW;
      uprightMover.minY = y - upHalfH;
      uprightMover.maxY = y + upHalfH;
    }

    if (!moved) {
      break;
    }
  }

  x = Math.max(input.minX, Math.min(input.maxX, x));

  const pinState = resolvePinnedState(
    x,
    y,
    pinAnchorX,
    horizontalSlide,
    upHalfW,
    upHalfH,
    solids,
    rowDeltaY,
    isPinnedFromAbove,
    input.pinnedCeilingMinX,
    input.pinnedCeilingMaxX
  );
  isPinnedFromAbove = pinState.isPinned;

  if (horizontalDelta !== 0) {
    clearSideBlockIfEscaped(x - startX, horizontalDelta);
  }

  let ceilingBrushContact = false;
  if (!isPinnedFromAbove) {
    for (let i = 0; i < solids.length; i++) {
      if (
        isCeilingUndersideBrush(
          x,
          y,
          upHalfW,
          upHalfH,
          solids[i],
          rowDeltaY
        )
      ) {
        ceilingBrushContact = true;
        break;
      }
    }
  }

  return {
    x,
    y,
    isPinnedFromAbove,
    isSideBlocked,
    sideBlockedDirection,
    isColliding,
    ceilingBrushContact,
    pinnedCeilingMinX: pinState.ceilingMinX,
    pinnedCeilingMaxX: pinState.ceilingMaxX,
  };
}

export function resolveSwimmerAgainstRows(
  input: ResolveSwimmerInput
): ResolveSwimmerResult {
  'worklet';

  const blockH = Math.max(1, input.blockSize.height);
  const blockW = Math.max(1, input.blockSize.width);
  const maxStep = Math.max(
    4,
    blockH * swimmerPhysicsTuning.COLLISION_SUBSTEP_BLOCK_FRACTION
  );
  const steps = Math.max(
    1,
    Math.ceil(
      Math.max(
        Math.abs(input.deltaY) / maxStep,
        Math.abs(input.deltaX) /
          Math.max(
            4,
            blockW * swimmerPhysicsTuning.MAX_HORIZONTAL_STEP_BLOCK_FRACTION
          ),
        Math.abs(input.rowDeltaY) / maxStep
      )
    )
  );

  if (steps <= 1) {
    return resolveSwimmerAgainstRowsStep(input);
  }

  let x = input.x;
  let y = input.y;
  let isPinnedFromAbove = false;
  let isSideBlocked = false;
  let sideBlockedDirection: -1 | 0 | 1 = 0;
  let isColliding = false;
  let ceilingBrushContact = false;
  let pinnedCeilingMinX = input.pinnedCeilingMinX;
  let pinnedCeilingMaxX = input.pinnedCeilingMaxX;
  const invSteps = 1 / steps;

  for (let step = 0; step < steps; step++) {
    const stepResult = resolveSwimmerAgainstRowsStep({
      ...input,
      x,
      y,
      pinAnchorX: input.x,
      pinnedCeilingMinX,
      pinnedCeilingMaxX,
      deltaX: input.deltaX * invSteps,
      deltaY: input.deltaY * invSteps,
      rowDeltaY: input.rowDeltaY * invSteps,
    });
    x = stepResult.x;
    y = stepResult.y;
    isPinnedFromAbove = isPinnedFromAbove || stepResult.isPinnedFromAbove;
    isSideBlocked = isSideBlocked || stepResult.isSideBlocked;
    if (stepResult.sideBlockedDirection !== 0) {
      sideBlockedDirection = stepResult.sideBlockedDirection;
    }
    isColliding = isColliding || stepResult.isColliding;
    ceilingBrushContact = ceilingBrushContact || stepResult.ceilingBrushContact;
    if (stepResult.pinnedCeilingMinX !== undefined) {
      pinnedCeilingMinX = stepResult.pinnedCeilingMinX;
    }
    if (stepResult.pinnedCeilingMaxX !== undefined) {
      pinnedCeilingMaxX = stepResult.pinnedCeilingMaxX;
    }
  }

  if (input.deltaX !== 0) {
    const tilted = tiltedAabbHalfExtents(
      input.halfWidth,
      input.halfHeight,
      input.angle ?? 0
    );
    const upright = tiltedAabbHalfExtents(input.halfWidth, input.halfHeight, 0);
    const probe = motionAabbForSideContact(
      input.x,
      input.y,
      tilted.halfWidth,
      tilted.halfHeight,
      false,
      upright.halfHeight,
      input.deltaX !== 0
    );
    let startedOverlappingSideSolid = false;
    const solids = collectSolidAABBs(
      input.rows,
      input.container,
      input.blockSize,
      input.hitboxScale ?? DEFAULT_HITBOX_SCALE
    );
    for (let i = 0; i < solids.length; i++) {
      if (aabbOverlap(probe, solids[i])) {
        startedOverlappingSideSolid = true;
        break;
      }
    }
    const appliedDx = x - input.x;
    if (
      startedOverlappingSideSolid &&
      Math.sign(appliedDx) === Math.sign(input.deltaX) &&
      appliedDx !== 0
    ) {
      sideBlockedDirection = 0;
      isSideBlocked = false;
    } else if (
      Math.sign(appliedDx) === Math.sign(input.deltaX) &&
      Math.abs(appliedDx) >= Math.abs(input.deltaX) * 0.85
    ) {
      sideBlockedDirection = 0;
      isSideBlocked = false;
    }
  }

  if (isPinnedFromAbove || input.deltaX !== 0) {
    const upright = tiltedAabbHalfExtents(input.halfWidth, input.halfHeight, 0);
    const solids = collectSolidAABBs(
      input.rows,
      input.container,
      input.blockSize,
      input.hitboxScale ?? DEFAULT_HITBOX_SCALE
    );
    const pinState = resolvePinnedState(
      x,
      y,
      input.x,
      input.deltaX !== 0,
      upright.halfWidth,
      upright.halfHeight,
      solids,
      input.rowDeltaY,
      isPinnedFromAbove,
      pinnedCeilingMinX,
      pinnedCeilingMaxX
    );
    isPinnedFromAbove = pinState.isPinned;
    if (pinState.isPinned) {
      pinnedCeilingMinX = pinState.ceilingMinX;
      pinnedCeilingMaxX = pinState.ceilingMaxX;
    } else {
      pinnedCeilingMinX = undefined;
      pinnedCeilingMaxX = undefined;
    }
  }

  return {
    x,
    y,
    isPinnedFromAbove,
    isSideBlocked,
    sideBlockedDirection,
    isColliding,
    ceilingBrushContact: !isPinnedFromAbove && ceilingBrushContact,
    pinnedCeilingMinX,
    pinnedCeilingMaxX,
  };
}
