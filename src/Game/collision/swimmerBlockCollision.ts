import { getColumnCenterX, LAYOUT_CONSTANTS } from '@/Layout';
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
  /** Matches Matter hitbox inflation in ObstacleSystem (default 1.05). */
  hitboxScale?: number;
  minX: number;
  maxX: number;
  /**
   * When true, horizontal motion is kinematic (full velocity * dt, wall-clamped) like the
   * pre-Matter pipeline; only depenetration blocks sides. Swept horizontal blocking is skipped.
   */
  kinematicHorizontal?: boolean;
};

export type ResolveSwimmerResult = {
  x: number;
  y: number;
  isPinnedFromAbove: boolean;
  isSideBlocked: boolean;
  isColliding: boolean;
};

const DEFAULT_HITBOX_SCALE = 1.05;
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
  rowHeight: number
): CollisionRow[] {
  'worklet';
  const band = rowHeight + swimmerHalfHeight + rowHeight;
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
  entities: readonly Entity[],
  rowStore: ComponentStore<ObstacleRowComponentData>,
  swimmerY: number,
  swimmerHalfHeight: number,
  rowHeight: number
): CollisionRow[] {
  'worklet';
  const band = rowHeight + swimmerHalfHeight + rowHeight;
  const out: CollisionRow[] = [];
  for (let i = 0; i < entities.length; i++) {
    const rowData = rowStore.get(entities[i]);
    if (!rowData) {
      continue;
    }
    if (Math.abs(rowData.y - swimmerY) >= band) {
      continue;
    }
    out.push({
      y: rowData.y,
      gaps: rowData.gaps,
      solidColumnCentersX: rowData.solidColumnCentersX,
    });
  }
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

function isPinnedUnderBlock(
  swimmerX: number,
  swimmerY: number,
  swimmerHalfWidth: number,
  swimmerHalfHeight: number,
  block: AABB
): boolean {
  'worklet';
  const swimmerTopY = swimmerY - swimmerHalfHeight;
  const swimmerLeftX = swimmerX - swimmerHalfWidth;
  const swimmerRightX = swimmerX + swimmerHalfWidth;
  const blockBottomY = block.maxY;
  const blockTopY = block.minY;

  const horizontalOverlap =
    swimmerLeftX < block.maxX + SKIN_EPSILON &&
    swimmerRightX > block.minX - SKIN_EPSILON;
  if (!horizontalOverlap) {
    return false;
  }

  // Ceiling contact: swimmer top is at/near the block underside (not a deep side overlap).
  const topToBlockBottom = swimmerTopY - blockBottomY;
  if (
    topToBlockBottom < -swimmerHalfHeight * 0.2 ||
    topToBlockBottom > swimmerHalfHeight * 0.15
  ) {
    return false;
  }

  // Swimmer center must be at or below the block underside (hanging under, not beside).
  if (swimmerY < blockBottomY - SKIN_EPSILON) {
    return false;
  }

  // Block must extend above the swimmer top (true ceiling, not a floor).
  if (blockTopY > swimmerTopY + SKIN_EPSILON) {
    return false;
  }

  return true;
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
export function resolveSwimmerAgainstRows(
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

  const tiltedExtents = tiltedAabbHalfExtents(
    input.halfWidth,
    input.halfHeight,
    input.angle ?? 0
  );
  let x = input.x;
  let y = input.y;
  let isPinnedFromAbove = false;
  let isSideBlocked = false;
  let isColliding = false;

  const halfW = tiltedExtents.halfWidth;
  const halfH = tiltedExtents.halfHeight;
  const staticBlockVel = { x: 0, y: input.rowDeltaY };

  // --- Vertical: buoyancy rise or settle down ---
  if (input.deltaY !== 0) {
    const mover = aabbFromCenter(x, y, halfW, halfH);
    let earliest: number | null = null;

    for (let i = 0; i < solids.length; i++) {
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
          if (isPinnedUnderBlock(x, y, halfW, halfH, solids[i])) {
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
      if (isPinnedUnderBlock(x, y, halfW, halfH, solids[i])) {
        isPinnedFromAbove = true;
        isColliding = true;
        break;
      }
    }
  }

  // Ceiling carry: block descent moves pinned swimmer down with it.
  if (isPinnedFromAbove && input.rowDeltaY !== 0) {
    y += input.rowDeltaY;
  }

  // --- Horizontal ---
  const horizontalDelta = input.deltaX;
  let targetX = Math.max(input.minX, Math.min(input.maxX, x + horizontalDelta));
  const kinematicHorizontal = input.kinematicHorizontal ?? false;

  if (horizontalDelta !== 0 && !kinematicHorizontal) {
    const mover = aabbFromCenter(x, y, halfW, halfH);
    let earliest: number | null = null;

    for (let i = 0; i < solids.length; i++) {
      if (isPinnedUnderBlock(x, y, halfW, halfH, solids[i])) {
        continue;
      }
      const toi = sweptAabbTOIRelative(
        mover,
        solids[i],
        { x: horizontalDelta, y: 0 },
        staticBlockVel
      );
      if (toi !== null && (earliest === null || toi < earliest)) {
        earliest = toi;
      }
    }

    if (earliest !== null && earliest < 1) {
      if (earliest > 0.0001) {
        targetX =
          x +
          horizontalDelta * earliest -
          SKIN_EPSILON * Math.sign(horizontalDelta || 1);
      } else {
        targetX = x;
      }
      isSideBlocked = true;
      isColliding = true;
    }
  }

  x = Math.max(input.minX, Math.min(input.maxX, targetX));

  // Depenetration passes (resting contact / numeric drift).
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    const mover = aabbFromCenter(x, y, halfW, halfH);

    for (let i = 0; i < solids.length; i++) {
      if (!aabbOverlap(mover, solids[i])) {
        continue;
      }

      isColliding = true;
      const ceilingContact = isPinnedUnderBlock(x, y, halfW, halfH, solids[i]);
      const pushX = resolveAxisPenetration(mover, solids[i], 'x');
      const pushY = resolveAxisPenetration(mover, solids[i], 'y');
      const { overlapX, overlapY } = overlapDepths(mover, solids[i]);
      const preferSideResolution =
        !ceilingContact &&
        overlapX > 0 &&
        (overlapX <= overlapY || overlapY <= 0);

      if (preferSideResolution && Math.abs(pushX) > 0) {
        x += pushX;
        isSideBlocked = true;
        moved = true;
      } else if (ceilingContact && Math.abs(pushY) > 0) {
        y += pushY;
        if (pushY < 0) {
          isPinnedFromAbove = true;
        }
        moved = true;
      } else if (Math.abs(pushX) > 0 && Math.abs(pushX) <= Math.abs(pushY)) {
        x += pushX;
        isSideBlocked = true;
        moved = true;
      } else if (Math.abs(pushY) > 0) {
        y += pushY;
        if (ceilingContact && pushY < 0) {
          isPinnedFromAbove = true;
        }
        moved = true;
      }

      mover.minX = x - halfW;
      mover.maxX = x + halfW;
      mover.minY = y - halfH;
      mover.maxY = y + halfH;
    }

    if (!moved) {
      break;
    }
  }

  x = Math.max(input.minX, Math.min(input.maxX, x));

  if (!isPinnedFromAbove) {
    for (let i = 0; i < solids.length; i++) {
      if (isPinnedUnderBlock(x, y, halfW, halfH, solids[i])) {
        isPinnedFromAbove = true;
        break;
      }
    }
  }

  return {
    x,
    y,
    isPinnedFromAbove,
    isSideBlocked,
    isColliding,
  };
}
