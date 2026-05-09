import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  ShapeTypes,
  createRenderComponent,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { ObstacleComponentData, ObstacleComponentName } from '@/Game/ecs-components/ObstacleComponent';
import {
  ContainerComponentName,
  ContainerComponentData,
} from '@/Game/ecs-components/Container';
import {
  WaterComponentName,
  WaterComponentData,
} from '@/Game/ecs-components/Water';
import {
  SwimmerComponentName,
  SwimmerComponentData,
} from '@/Game/ecs-components/Swimmer';
import {
  createObstacleComponent,
  ObstacleTypes,
} from '@/Game/ecs-components/ObstacleComponent';
import {
  getGridPosition,
  getObstacleWidth,
  getRows,
  LAYOUT_CONSTANTS,
} from '@/Layout';
import { MatterBodyComponentData, MatterBodyComponentName } from '@/containers/ReactNativeSkiaGameEngine/internal/components/matterBody';
import {
  SceneComponentData,
  SceneComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/scene';
import {
  ObstaclesManagerComponentData,
  ObstaclesManagerComponentName,
} from '@/Game/ecs-components/ObstaclesManager';
import {
  RemoveEntityBatchRequest,
  RemoveEntityBatchRequestType,
  RemoveEntityRequest,
  RemoveEntityRequestType,
} from '@/containers/ReactNativeSkiaGameEngine/internal/events/entity';
import { createObstacleRowComponent, ObstacleRowComponentData, ObstacleRowComponentName } from '@/Game/ecs-components/ObstacleRowComponent';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import { TextHeightBehavior } from '@shopify/react-native-skia';
import { RowPathTemplate, TemplateCtx, TemplateInitArgs } from '@/Game/ecs-systems/obstacleSystem';
import {
  getOrCreateTemplateContextEntity,
  TemplateContextComponentData,
  TemplateContextComponentName,
} from '@/Game/ecs-components/TemplateContextComponent';
import { groupGapsToRanges, GapRangeCol } from '@/Game/water/gapRanges';
import { createJsonLevelRowPathTemplate } from '@/Game/templates/obstacles/jsonLevelRowPathTemplate';
import { smilyLevelJson } from '@/Game/templates/obstacles/smily';
import { jellyfishLevelJson } from '@/Game/templates/obstacles/jellyfish';
import { mickyLevelJson } from '@/Game/templates/obstacles/micky';
import { kittyLevelJson } from '@/Game/templates/obstacles/kitty';
import { deadpoolLevelJson } from '@/Game/templates/obstacles/deadpool';
import { megamanLevelJson } from '@/Game/templates/obstacles/megaman';

const OBSTACLE_BLOCK_IMAGES = ['block2', 'block3'] as const;

function getRandomBlockImage(): string {
  'worklet';
  return OBSTACLE_BLOCK_IMAGES[
    Math.floor(Math.random() * OBSTACLE_BLOCK_IMAGES.length)
  ];
}

const COLLISION = {
  containerBoundaryCategory: 0x0002,
  swimmerCategory: 0x0004,
  obstacleCategory: 0x0008,
} as const;

function spawnObstacleEntity(args: {
  ecs: ECS;
  sceneEntity: number;
  x: number;
  y: number;
  width: number;
  height: number;
}): Entity | null {
  'worklet';
  if (!global._RNTGE_?.physics) return null;
  if (typeof global.MatterReanimated === 'undefined') return null;

  const { ecs, sceneEntity, x, y, width: argsWidth, height: argsHeight } = args;

  let width = argsWidth * 1.05
  let height = argsHeight * 1.05

  const entity = ecs.createEntity();

  const obstacleComponent = createObstacleComponent({
    type: ObstacleTypes.Stone,
    width,
    height,
    initialPosition: { x, y },
  });

  const renderComponent = createRenderComponent({
    shape: {
      type: ShapeTypes.Rectangle,
      width,
      height,
    },
    image: getRandomBlockImage(),
    visible: true,
    // Render obstacles behind water and swimmer but above background/container interior
    zIndex: 2,
  });

  ecs.addComponent(entity, obstacleComponent);
  ecs.addComponent(entity, renderComponent);

  const body = global.MatterReanimated.Bodies.rectangle(x, y, width, height, {
    isStatic: true,
    inertia: Infinity,
    restitution: 0,
    friction: 0,
    frictionStatic: 0,
    frictionAir: 0,
    collisionFilter: {
      group: 0x0000,
      category: COLLISION.obstacleCategory,
      mask: COLLISION.containerBoundaryCategory | COLLISION.swimmerCategory,
    },
  });

  global.MatterReanimated.Composite.add(global._RNTGE_.physics.engine.world, [
    body,
  ]);

  ecs.addComponent(entity, {
    name: MatterBodyComponentName,
    data: body,
  });

  ecs.updateComponent(
    sceneEntity,
    SceneComponentName,
    (scene: SceneComponentData) => {
      scene.objects.entities.push(entity);
      scene.objects.matterBodies.push(body.id);
    }
  );

  return entity
}

const generateGaps = (prevGaps: number[], rowLength: number): number[] => {
  'worklet'
  if (prevGaps.length === 0) {
    return [Math.floor(rowLength / 2)]
  } else {
    let nextGaps: number[] = []
    const newDir = Math.random() > 0.5 ? 'left' : 'right'
    if (newDir === 'left') {
      let leftMostGap = Math.min(...prevGaps)
      if (leftMostGap > 0) nextGaps.push(leftMostGap - 1)
      nextGaps.push(leftMostGap)
      if (leftMostGap < rowLength - 1) nextGaps.push(leftMostGap + 1)
    } else {
      let rightMostGap = Math.max(...prevGaps)
      if (rightMostGap < rowLength - 1) nextGaps.push(rightMostGap + 1)
      nextGaps.push(rightMostGap)
      if (rightMostGap > 0) nextGaps.push(rightMostGap - 1)
    }
    return nextGaps
  }
}

const clampInt = (v: number, min: number, max: number) => {
  'worklet';
  return Math.max(min, Math.min(max, Math.round(v)));
};

const rangeWidthCols = (r: GapRangeCol) => {
  'worklet';
  return Math.max(1, r.endCol - r.startCol + 1);
};

const rangeCenterCols = (r: GapRangeCol) => {
  'worklet';
  return (r.startCol + r.endCol) * 0.5;
};

const enforceRangeConstraints = (ranges: GapRangeCol[], rowLength: number) => {
  'worklet';
  if (rowLength <= 0) return [];
  // Normalize: clamp, ensure start<=end, sort by start.
  let normalized = ranges
    .map((r) => {
      const a = clampInt(r.startCol, 0, rowLength - 1);
      const b = clampInt(r.endCol, 0, rowLength - 1);
      return a <= b ? { startCol: a, endCol: b } : { startCol: b, endCol: a };
    })
    .sort((x, y) => x.startCol - y.startCol);

  // Merge overlaps and enforce at least 1 blocked column between ranges.
  const merged: GapRangeCol[] = [];
  for (let i = 0; i < normalized.length; i++) {
    const r = normalized[i];
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push(r);
      continue;
    }
    // If overlapping or touching (no blocked column), merge them.
    if (r.startCol <= last.endCol + 1) {
      last.endCol = Math.max(last.endCol, r.endCol);
    } else {
      merged.push(r);
    }
  }

  // Clamp widths to at least 1.
  for (let i = 0; i < merged.length; i++) {
    merged[i].startCol = clampInt(merged[i].startCol, 0, rowLength - 1);
    merged[i].endCol = clampInt(Math.max(merged[i].endCol, merged[i].startCol), 0, rowLength - 1);
  }

  return merged;
};

const splitRange = (r: GapRangeCol, rowLength: number, minWidth: number): GapRangeCol[] => {
  'worklet';
  const w = rangeWidthCols(r);
  // Need enough width for: minWidth + 1 blocked + minWidth
  if (w < minWidth * 2 + 1) return [r];
  const center = Math.round(rangeCenterCols(r));
  // Split around center, leaving exactly 1 blocked column between children.
  const leftEnd = clampInt(center - 1, r.startCol + minWidth - 1, r.endCol - (minWidth + 1));
  const rightStart = clampInt(leftEnd + 2, r.startCol + minWidth + 1, r.endCol - (minWidth - 1));
  const left = { startCol: r.startCol, endCol: leftEnd };
  const right = { startCol: rightStart, endCol: r.endCol };
  if (rangeWidthCols(left) < minWidth || rangeWidthCols(right) < minWidth) return [r];
  if (right.startCol <= left.endCol + 1) return [r];
  return enforceRangeConstraints([left, right], rowLength);
};

const maybeMutateRanges = (ranges: GapRangeCol[], rowLength: number) => {
  'worklet';
  // Small drift per range: shift center by at most 1 col, widen/narrow by at most 1 col.
  const mutated = ranges.map((r) => {
    const shift = Math.random() < 0.5 ? -1 : 1;
    const doShift = Math.random() < 0.55;
    const doResize = Math.random() < 0.45;
    let start = r.startCol;
    let end = r.endCol;
    if (doShift) {
      start += shift;
      end += shift;
    }
    if (doResize) {
      const widen = Math.random() < 0.5 ? -1 : 1;
      // widen=-1 => widen (start--, end++), widen=1 => narrow (start++, end--)
      if (widen < 0) {
        start -= 1;
        end += 1;
      } else if (rangeWidthCols(r) > 1) {
        start += 1;
        end -= 1;
      }
    }
    return { startCol: start, endCol: end };
  });
  return enforceRangeConstraints(mutated, rowLength);
};

const overlapCols = (a: GapRangeCol, b: GapRangeCol) => {
  'worklet';
  return Math.max(0, Math.min(a.endCol, b.endCol) - Math.max(a.startCol, b.startCol) + 1);
};

const ensureMinWidth = (ranges: GapRangeCol[], rowLength: number, minWidth: number) => {
  'worklet';
  if (!ranges.length) return ranges;
  const expanded = ranges.map((r) => {
    const w = rangeWidthCols(r);
    if (w >= minWidth) return r;
    const start = clampInt(r.startCol, 0, rowLength - 1);
    const end = clampInt(Math.min(rowLength - 1, start + minWidth - 1), 0, rowLength - 1);
    return { startCol: start, endCol: end };
  });
  return enforceRangeConstraints(expanded, rowLength);
};

const ensureEachCurrOverlapsSomePrev = (
  curr: GapRangeCol[],
  prev: GapRangeCol[],
  rowLength: number,
  minOverlapCols: number
) => {
  'worklet';
  if (!curr.length || !prev.length) return curr;
  const fixed = curr.map((r) => ({ ...r }));

  for (let i = 0; i < fixed.length; i++) {
    const r = fixed[i];
    let bestPrev = prev[0];
    let bestDist = Number.POSITIVE_INFINITY;
    const c = rangeCenterCols(r);
    for (let j = 0; j < prev.length; j++) {
      const d = Math.abs(c - rangeCenterCols(prev[j]));
      if (d < bestDist) {
        bestDist = d;
        bestPrev = prev[j];
      }
    }
    const ov = overlapCols(r, bestPrev);
    if (ov >= minOverlapCols) continue;

    // Force overlap by shifting toward bestPrev.
    let shift = 0;
    if (r.endCol < bestPrev.startCol) {
      shift = (bestPrev.startCol + (minOverlapCols - 1)) - r.endCol;
    } else if (r.startCol > bestPrev.endCol) {
      shift = (bestPrev.endCol - (minOverlapCols - 1)) - r.startCol;
    } else {
      shift = clampInt(Math.round(rangeCenterCols(bestPrev) - rangeCenterCols(r)), -1, 1);
    }
    if (shift !== 0) {
      r.startCol = clampInt(r.startCol + shift, 0, rowLength - 1);
      r.endCol = clampInt(r.endCol + shift, 0, rowLength - 1);
      if (r.endCol < r.startCol) r.endCol = r.startCol;
    }
  }

  return enforceRangeConstraints(fixed, rowLength);
};

const ensureContinuityWithPrev = (
  next: GapRangeCol[],
  prev: GapRangeCol[],
  rowLength: number,
  minOverlapCols: number
) => {
  'worklet';
  if (!prev.length || !next.length) return next;
  const fixed = next.map((r) => ({ ...r }));

  for (let i = 0; i < fixed.length; i++) {
    const r = fixed[i];
    // Find closest prev by center.
    let bestJ = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    const c = rangeCenterCols(r);
    for (let j = 0; j < prev.length; j++) {
      const d = Math.abs(c - rangeCenterCols(prev[j]));
      if (d < bestDist) {
        bestDist = d;
        bestJ = j;
      }
    }
    const p = prev[bestJ];
    const ov = overlapCols(r, p);
    if (ov >= minOverlapCols) continue;

    // Shift r toward p so they overlap by at least minOverlapCols.
    // If r is completely left of p -> shift right; if right -> shift left.
    let shift = 0;
    if (r.endCol < p.startCol) {
      shift = (p.startCol + (minOverlapCols - 1)) - r.endCol;
    } else if (r.startCol > p.endCol) {
      shift = (p.endCol - (minOverlapCols - 1)) - r.startCol;
    } else {
      // Partial overlap but too small: nudge toward p center.
      shift = Math.round(rangeCenterCols(p) - rangeCenterCols(r));
      shift = clampInt(shift, -1, 1);
    }
    if (shift !== 0) {
      r.startCol = clampInt(r.startCol + shift, 0, rowLength - 1);
      r.endCol = clampInt(r.endCol + shift, 0, rowLength - 1);
      if (r.endCol < r.startCol) r.endCol = r.startCol;
    }
  }

  return enforceRangeConstraints(fixed, rowLength);
};

const rangesToGaps = (ranges: GapRangeCol[]) => {
  'worklet';
  const gaps: number[] = [];
  for (let i = 0; i < ranges.length; i++) {
    for (let c = ranges[i].startCol; c <= ranges[i].endCol; c++) {
      gaps.push(c);
    }
  }
  return gaps;
};

const generateMultiPathGaps = (prevGaps: number[], rowLength: number): number[] => {
  'worklet';
  const MAX_PATHS = 4;
  const MIN_W = 2;
  const MAX_W = Math.max(MIN_W, Math.min(6, Math.floor(rowLength * 0.6)));
  const MIN_OVERLAP = 1; // at least one shared column across consecutive rows

  let prevRanges = groupGapsToRanges(prevGaps, rowLength);
  if (prevRanges.length === 0) {
    // Seed with 1–2 central-ish ranges.
    const center = Math.floor(rowLength / 2);
    const width = Math.random() < 0.6 ? 3 : 2;
    const startA = clampInt(center - Math.floor(width / 2), 0, rowLength - 1);
    const a: GapRangeCol = {
      startCol: startA,
      endCol: Math.min(rowLength - 1, startA + width - 1),
    };
    const twoPaths = rowLength >= 8 && Math.random() < 0.35;
    if (twoPaths) {
      const offset = Math.max(2, Math.floor(rowLength / 4));
      const bCenter = clampInt(center + (Math.random() < 0.5 ? -offset : offset), 0, rowLength - 1);
      const bStart = clampInt(bCenter - 1, 0, rowLength - 1);
      const b: GapRangeCol = { startCol: bStart, endCol: Math.min(rowLength - 1, bStart + 1) };
      prevRanges = enforceRangeConstraints([a, b], rowLength);
    } else {
      prevRanges = enforceRangeConstraints([a], rowLength);
    }
  }

  // Always start from previous ranges so every path has a "parent" and remains passable.
  let ranges = ensureMinWidth(prevRanges, rowLength, MIN_W);
  ranges = maybeMutateRanges(ranges, rowLength);
  ranges = ensureMinWidth(ranges, rowLength, MIN_W);
  // Critical: each current range must overlap some prev range (prevents dead-end rows).
  ranges = ensureEachCurrOverlapsSomePrev(ranges, prevRanges, rowLength, MIN_OVERLAP);

  // Occasionally split a wide range (adds a path).
  if (ranges.length < MAX_PATHS && Math.random() < 0.25) {
    // Pick widest range.
    let widestIdx = 0;
    let widest = 0;
    for (let i = 0; i < ranges.length; i++) {
      const w = rangeWidthCols(ranges[i]);
      if (w > widest) {
        widest = w;
        widestIdx = i;
      }
    }
    if (widest >= MIN_W * 2 + 1) {
      const children = splitRange(ranges[widestIdx], rowLength, MIN_W);
      if (children.length > 1) {
        const next = [...ranges.slice(0, widestIdx), ...children, ...ranges.slice(widestIdx + 1)];
        ranges = enforceRangeConstraints(next, rowLength);
        ranges = ensureMinWidth(ranges, rowLength, MIN_W);
        ranges = ensureEachCurrOverlapsSomePrev(ranges, prevRanges, rowLength, MIN_OVERLAP);
      }
    }
  }

  // If too many ranges due to weird merges/splits, keep the widest ones.
  if (ranges.length > MAX_PATHS) {
    ranges = [...ranges]
      .sort((a, b) => rangeWidthCols(b) - rangeWidthCols(a))
      .slice(0, MAX_PATHS)
      .sort((a, b) => a.startCol - b.startCol);
  }

  ranges = ensureMinWidth(ranges, rowLength, MIN_W);
  // Clamp maximum width so rows don't become trivial.
  ranges = ranges.map((r) => {
    const w = rangeWidthCols(r);
    if (w <= MAX_W) return r;
    const center = Math.round(rangeCenterCols(r));
    const half = Math.floor(MAX_W / 2);
    const start = clampInt(center - half, 0, rowLength - 1);
    const end = clampInt(start + MAX_W - 1, 0, rowLength - 1);
    return { startCol: start, endCol: end };
  });
  ranges = enforceRangeConstraints(ranges, rowLength);
  ranges = ensureMinWidth(ranges, rowLength, MIN_W);
  ranges = ensureEachCurrOverlapsSomePrev(ranges, prevRanges, rowLength, MIN_OVERLAP);

  return rangesToGaps(ranges);
};

const generateObstacles = ({ gaps, rowLength, y, leftX, obstacleDimension }: {
  rowIndex: number,
  gaps: number[],
  rowLength: number,
  y: number,
  leftX: number,
  obstacleDimension: { width: number, height: number }
}): ObstacleComponentData[] => {
  'worklet'
  let obstacles: ObstacleComponentData[] = []
  for (let i = 0; i < rowLength; i++) {
    if (!gaps.includes(i)) {
      obstacles.push({
        initialPosition: { y: y, x: leftX + (i + 1) * obstacleDimension.width - obstacleDimension.width / 2 },
        type: ObstacleTypes.Stone,
        width: obstacleDimension.width,
        height: obstacleDimension.height
      })
    }
  }
  return obstacles
}

const createObstacleRow: RowPathTemplate['getRow'] = (_ctx, { rowIndex, ecs, sceneEntity, prevRow, prevRowEntity, initialY, rowLength, leftX, obstacleDimension }) => {
  'worklet';
  let gaps: number[] = []
  gaps = generateGaps(!prevRow ? [] : prevRow.gaps, rowLength)
  const obstacleDatas = generateObstacles({
    rowIndex,
    gaps,
    y: !prevRow ? initialY : prevRow.y - obstacleDimension.height,
    rowLength,
    leftX,
    obstacleDimension
  })
  let obstacleEntities: Entity[] = []
  for (let i = 0; i < obstacleDatas.length; i++) {
    const entity = spawnObstacleEntity({
      ecs,
      sceneEntity,
      x: obstacleDatas[i].initialPosition.x,
      y: obstacleDatas[i].initialPosition.y,
      width: obstacleDatas[i].width,
      height: obstacleDatas[i].height
    })
    if (entity !== null) obstacleEntities.push(entity)
  }
  const obstacleRowComp = createObstacleRowComponent({
    y: !prevRow ? initialY : prevRow.y - obstacleDimension.height,
    gaps,
    obstacles: obstacleEntities,
    prevRowEntity
  })
  const obstacleRowEntity = ecs.createEntity()
  ecs.addComponent(obstacleRowEntity, obstacleRowComp)
  ecs.updateComponent(
    sceneEntity,
    SceneComponentName,
    (scene: SceneComponentData) => {
      if (!scene.objects.entities.includes(obstacleRowEntity)) {
        scene.objects.entities.push(obstacleRowEntity);
      }
    }
  );

  return obstacleRowEntity
}

const getRowCount: RowPathTemplate['getRowCount'] = (_ctx) => {
  'worklet'
  return 10 + Math.round(Math.random() * (10 - 1))
}

const BaseRowPathTemplate: RowPathTemplate = {
  getRowCount,
  getRow: createObstacleRow,
}

const baseMultiPathGetRow: RowPathTemplate['getRow'] = (
  _ctx,
  { rowIndex, ecs, sceneEntity, prevRow, prevRowEntity, initialY, rowLength, leftX, obstacleDimension }
) => {
  'worklet';
  const gaps = generateMultiPathGaps(!prevRow ? [] : prevRow.gaps, rowLength);
  const y = !prevRow ? initialY : prevRow.y - obstacleDimension.height;
  const obstacleDatas = generateObstacles({
    rowIndex,
    gaps,
    y,
    rowLength,
    leftX,
    obstacleDimension,
  });
  const obstacleEntities: Entity[] = [];
  for (let i = 0; i < obstacleDatas.length; i++) {
    const entity = spawnObstacleEntity({
      ecs,
      sceneEntity,
      x: obstacleDatas[i].initialPosition.x,
      y: obstacleDatas[i].initialPosition.y,
      width: obstacleDatas[i].width,
      height: obstacleDatas[i].height,
    });
    if (entity !== null) obstacleEntities.push(entity);
  }
  const obstacleRowComp = createObstacleRowComponent({
    y,
    gaps,
    obstacles: obstacleEntities,
    prevRowEntity,
  });
  const obstacleRowEntity = ecs.createEntity();
  ecs.addComponent(obstacleRowEntity, obstacleRowComp);
  ecs.updateComponent(sceneEntity, SceneComponentName, (scene: SceneComponentData) => {
    if (!scene.objects.entities.includes(obstacleRowEntity)) {
      scene.objects.entities.push(obstacleRowEntity);
    }
  });
  return obstacleRowEntity;
};

const BaseMultiPathRowPathTemplate: RowPathTemplate = {
  getRowCount,
  getRow: baseMultiPathGetRow,
};

const restGetRowCount: RowPathTemplate['getRowCount'] = (_ctx) => {
  'worklet'
  return 10 + Math.round(Math.random() * (5 - 1))
}

const restGenerateObstacles = ({ gaps, rowLength, y, leftX, obstacleDimension }: {
  rowIndex: number,
  gaps: number[],
  rowLength: number,
  y: number,
  leftX: number,
  obstacleDimension: { width: number, height: number }
}): ObstacleComponentData[] => {
  'worklet'
  let obstacles: ObstacleComponentData[] = []
  Array.from([0, rowLength - 1]).map(i => {
    obstacles.push({
      initialPosition: { y: y, x: leftX + (i + 1) * obstacleDimension.width - obstacleDimension.width / 2 },
      type: ObstacleTypes.Stone,
      width: obstacleDimension.width,
      height: obstacleDimension.height
    })
  })
  return obstacles
}


const restGetRow: RowPathTemplate['getRow'] = (_ctx, params) => {
  'worklet'
  const { ecs, prevRow, initialY, obstacleDimension, prevRowEntity, rowLength, sceneEntity } = params
  const obstaclesIndexes = restGenerateObstacles({ ...params, y: !prevRow ? initialY : prevRow.y - obstacleDimension.height, gaps: [] })
  let obstacleEntities: Entity[] = []
  for (let i = 0; i < obstaclesIndexes.length; i++) {
    const entity = spawnObstacleEntity({
      ecs,
      sceneEntity,
      x: obstaclesIndexes[i].initialPosition.x,
      y: obstaclesIndexes[i].initialPosition.y,
      width: obstaclesIndexes[i].width,
      height: obstaclesIndexes[i].height
    })
    if (entity !== null) obstacleEntities.push(entity)
  }
  const obstacleRowComp = createObstacleRowComponent({
    y: !prevRow ? initialY : prevRow.y - obstacleDimension.height,
    gaps: [],
    obstacles: obstacleEntities,
    prevRowEntity
  })
  const obstacleRowEntity = ecs.createEntity()
  ecs.addComponent(obstacleRowEntity, obstacleRowComp)
  ecs.updateComponent(
    sceneEntity,
    SceneComponentName,
    (scene: SceneComponentData) => {
      if (!scene.objects.entities.includes(obstacleRowEntity)) {
        scene.objects.entities.push(obstacleRowEntity);
      }
    }
  );

  return obstacleRowEntity
}

const RestRowPathTemplate: RowPathTemplate = {
  getRowCount: restGetRowCount,
  getRow: restGetRow
}

const spawnObstacleBlockFromTemplate = (params: {
  ecs: ECS;
  sceneEntity: number;
  x: number;
  y: number;
  width: number;
  height: number;
}): Entity | null => {
  'worklet';
  return spawnObstacleEntity(params);
};

const SmilyRowPathTemplate: RowPathTemplate = createJsonLevelRowPathTemplate({
  levelJson: smilyLevelJson,
  spawnBlock: spawnObstacleBlockFromTemplate,
});

const JellyfishRowPathTemplate: RowPathTemplate = createJsonLevelRowPathTemplate({
  levelJson: jellyfishLevelJson,
  spawnBlock: spawnObstacleBlockFromTemplate,
});

const MickyRowPathTemplate: RowPathTemplate = createJsonLevelRowPathTemplate({
  levelJson: mickyLevelJson,
  spawnBlock: spawnObstacleBlockFromTemplate,
});

const KittyRowPathTemplate: RowPathTemplate = createJsonLevelRowPathTemplate({
  levelJson: kittyLevelJson,
  spawnBlock: spawnObstacleBlockFromTemplate,
});

const DeadpoolRowPathTemplate: RowPathTemplate = createJsonLevelRowPathTemplate({
  levelJson: deadpoolLevelJson,
  spawnBlock: spawnObstacleBlockFromTemplate,
});

const MegamanRowPathTemplate: RowPathTemplate = createJsonLevelRowPathTemplate({
  levelJson: megamanLevelJson,
  spawnBlock: spawnObstacleBlockFromTemplate,
});

const MappedTemplates: Record<string, RowPathTemplate> = {
  'base': BaseRowPathTemplate,
  'baseMulti': BaseMultiPathRowPathTemplate,
  'rest': RestRowPathTemplate,
  'smily': SmilyRowPathTemplate,
  'jellyfish': JellyfishRowPathTemplate,
  'micky': MickyRowPathTemplate,
  'kitty': KittyRowPathTemplate,
  'deadpool': DeadpoolRowPathTemplate,
  'megaman': MegamanRowPathTemplate
}

function selectTemplate(args: {
  ecs: ECS;
  components: Record<string, any>;
  managerEntity: Entity;
  currentTemplateContextEntity: Entity | null | undefined;
  templateName: string;
  initArgs: TemplateInitArgs;
}): {
  template: RowPathTemplate;
  templateName: string;
  ctxEntity: Entity;
  ctx: TemplateCtx;
  rowCount: number;
  runId: number;
} {
  'worklet';
  const { ecs, components, currentTemplateContextEntity, templateName, initArgs } = args;

  const template = MappedTemplates[templateName] ?? BaseRowPathTemplate;
  const ctxEntity =
    typeof currentTemplateContextEntity === 'number'
      ? currentTemplateContextEntity
      : getOrCreateTemplateContextEntity(ecs);

  const existing = components[TemplateContextComponentName]?.get(
    ctxEntity
  ) as TemplateContextComponentData | undefined;

  const nextRunId = (existing?.runId ?? 0) + 1;
  const ctx: TemplateCtx = template.createCtx ? template.createCtx() : {};

  if (template.init) {
    template.init(ctx, initArgs);
  }

  const rowCount = template.getRowCount(ctx);

  ecs.updateComponent<TemplateContextComponentData>(
    ctxEntity,
    TemplateContextComponentName,
    (data) => {
      data.templateName = templateName;
      data.ctx = ctx;
      data.runId = nextRunId;
    }
  );

  return {
    template,
    templateName,
    ctxEntity,
    ctx,
    rowCount,
    runId: nextRunId,
  };
}

/**
 * ObstacleSystem - Manages obstacle spawning, movement, and removal for the swimmer game
 *
 * This system:
 * - Seeds 5-7 initial obstacles when none exist (above container top to ~30% from top)
 * - Moves obstacles downward at water speed (raisingSpeed) every frame
 * - Spawns new obstacles over time based on row intervals when not seeding
 * - Removes obstacles that pass below the container bottom
 * - Uses row-based positioning with random row selection and spacing for gameplay balance
 */
export const ObstacleSystem: System = {
  name: 'obstacleSystem',
  requiredComponents: [ObstaclesManagerComponentName],
  process: ({ entities, components, deltaTime, ecs, eventQueue, dimensions }) => {
    'worklet';

    const managerEntity = entities[0];
    const managerData = components[ObstaclesManagerComponentName]?.get(
      managerEntity
    ) as ObstaclesManagerComponentData | undefined;

    if (!managerData) return;

    const lockedTemplateName = managerData.lockedTemplateName;

    // Get container entity
    const containerEntities = ecs.getEntitiesWithComponents([
      ContainerComponentName,
    ]);

    if (containerEntities.length === 0) {
      return; // No container, nothing to do
    }

    const containerEntity = containerEntities[0];
    const containerData = components[ContainerComponentName]?.get(
      containerEntity
    ) as ContainerComponentData | undefined;

    if (!containerData) {
      return;
    }

    // Get water entity and data (for movement speed)
    const waterEntities = ecs.getEntitiesWithComponents([
      WaterComponentName,
    ]);

    if (waterEntities.length === 0) {
      return; // No water, nothing to do
    }

    const waterEntity = waterEntities[0];
    const waterData = components[WaterComponentName]?.get(waterEntity) as
      | WaterComponentData
      | undefined;

    if (!waterData) {
      return;
    }

    const deltaSeconds = deltaTime / 1000;
    const containerTop = containerData.centerY - containerData.height / 2;
    const containerBottom = containerData.centerY + containerData.height / 2;

    // Determine if we're in initial phase (water rising)
    const swimmerEntities = ecs.getEntitiesWithComponents([
      SwimmerComponentName,
    ]);
    const isInInitialPhase =
      swimmerEntities.length > 0 &&
      (
        components[SwimmerComponentName]?.get(swimmerEntities[0]) as
        | SwimmerComponentData
        | undefined
      )?.isInInitialPhase === true;

    // Locate the scene entity for this manager
    const sceneEntities = ecs.getEntitiesWithComponents([
      SceneComponentName,
    ]);
    const sceneEntity = sceneEntities.find((e: number) => {
      const data = components[SceneComponentName]?.get(e) as
        | SceneComponentData
        | undefined;
      return data?.sceneKey === managerData.sceneKey;
    });

    const deltaY = waterData.raisingSpeed * deltaSeconds;

    if (typeof sceneEntity !== 'number') return;

    const maxY = containerTop + containerData.height * 0.3; // 30% from top

    const leftX = containerData.centerX -
      containerData.width / 2
    const columnWidth = getObstacleWidth(containerData.width);
    const obstacleRowEntities = ecs.getEntitiesWithComponents([ObstacleRowComponentName])
    const waterSurfaceY = containerData.waterSurfaceY;
    const currentCenterRowEntity = waterData.centerRowEntity;
    // Lock slightly ahead of the visible surface so the water can start reacting
    // as a row enters the flow band, not after it is already centered.
    const lockAheadY = waterSurfaceY - columnWidth * 0.42;
    // Transition target is even higher to begin cross-row shaping before center alignment.
    const transitionTargetY = lockAheadY - columnWidth * 0.42;
    let nearestRowEntity: number | undefined;
    let nearestRowDistance = Number.POSITIVE_INFINITY;
    let nearestOverlapRowEntity: number | undefined;
    let nearestOverlapDistance = Number.POSITIVE_INFINITY;
    let currentRowDistance = Number.POSITIVE_INFINITY;
    obstacleRowEntities.forEach((obstacleRowEntity) => {
      const rowData = components[ObstacleRowComponentName].get(obstacleRowEntity) as ObstacleRowComponentData | undefined
      if (!rowData) return

      let newY = rowData.y + deltaY

      if (newY > containerBottom + LAYOUT_CONSTANTS.REMOVAL_THRESHOLD_OFFSET) {
        const removeRequest: RemoveEntityBatchRequest = {
          type: RemoveEntityBatchRequestType,
          payload: { entityIds: [obstacleRowEntity, ...rowData.obstacles], sceneKey: managerData.sceneKey },
        };
        eventQueue.addEvent(removeRequest);
        return;
      } else {
        ecs.updateComponent<ObstacleRowComponentData>(obstacleRowEntity, ObstacleRowComponentName, (rowData) => {
          rowData.y = newY
        })
        const rowTop = newY - columnWidth / 2;
        const rowBottom = newY + columnWidth / 2;
        const rowCenterDistance = Math.abs(newY - transitionTargetY);
        const overlapsTransitionBand =
          transitionTargetY >= rowTop && transitionTargetY <= rowBottom + columnWidth * 0.42;
        if (overlapsTransitionBand && rowCenterDistance < nearestOverlapDistance) {
          nearestOverlapDistance = rowCenterDistance;
          nearestOverlapRowEntity = obstacleRowEntity;
        }
        if (rowCenterDistance < nearestRowDistance) {
          nearestRowDistance = rowCenterDistance;
          nearestRowEntity = obstacleRowEntity;
        }
        if (obstacleRowEntity === currentCenterRowEntity) {
          currentRowDistance = rowCenterDistance;
        }
        rowData.obstacles.forEach((oEnt) => {
          const body = components[MatterBodyComponentName].get(oEnt) as MatterBodyComponentData | undefined

          if (body) {
            global.MatterReanimated.Body.setPosition(body as Matter.Body, {
              x: body.position?.x || 0,
              y: newY,
            });
          }
        })
      }
    })
    const candidateCenterRowEntity = nearestOverlapRowEntity ?? nearestRowEntity;
    let centerRowEntity = candidateCenterRowEntity;
    if (
      typeof currentCenterRowEntity === 'number' &&
      Number.isFinite(currentRowDistance)
    ) {
      const holdDistance = columnWidth * 0.62;
      const switchAdvantage = columnWidth * 0.18;
      const candidateDistance =
        typeof candidateCenterRowEntity === 'number'
          ? (candidateCenterRowEntity === nearestOverlapRowEntity
            ? nearestOverlapDistance
            : nearestRowDistance)
          : Number.POSITIVE_INFINITY;
      const shouldHoldCurrent =
        currentRowDistance <= holdDistance &&
        candidateDistance + switchAdvantage >= currentRowDistance;
      if (shouldHoldCurrent) {
        centerRowEntity = currentCenterRowEntity;
      }
    }
    if (typeof centerRowEntity === 'number') {
      ecs.updateComponent<WaterComponentData>(waterEntity, WaterComponentName, (waterData) => {
        waterData.centerRowEntity = centerRowEntity;
      });
    }

    // Seed initial obstacles when none exist (either during initial phase or when starting with water at center)
    const shouldSeedInitialObstacles = obstacleRowEntities.length === 0;

    if (shouldSeedInitialObstacles) {
      let lastRowEntity: Entity | null = null
      const initArgs: TemplateInitArgs = {
        ecs,
        sceneEntity,
        rowLength: LAYOUT_CONSTANTS.COLUMNS,
        leftX,
        obstacleDimension: {
          width: columnWidth,
          height: columnWidth,
        },
        initialY: maxY,
      };

      // Initial template (first one shown). Keep as `smily` for now.
      const selected = selectTemplate({
        ecs,
        components,
        managerEntity,
        currentTemplateContextEntity: managerData.templateInfo?.templateContextEntity,
        templateName: lockedTemplateName ?? 'smily',
        initArgs,
      });

      let activeTemplateName = selected.templateName;
      let activeTemplate = selected.template;
      let activeCtx = selected.ctx;
      let activeRowCount = selected.rowCount;
      let activeCtxEntity = selected.ctxEntity;
      let activeRowIndex = 0; // next row index within current template

      const rowsInDisplay = Math.ceil((maxY - columnWidth) / columnWidth) + 1

      for (let i = 0; i < rowsInDisplay; i++) {
        const prevRow = lastRowEntity ? ecs.components[ObstacleRowComponentName].get(lastRowEntity) as ObstacleRowComponentData : null

        // If we've reached the end of the active template, switch to the next template
        // and continue filling the seed rows.
        if (activeRowIndex > activeRowCount - 1) {
          const tempalteNames = Object.keys(MappedTemplates)
          let newTemplateRandIndex = Math.floor(Math.random() * tempalteNames.length)

          let newTemplateName =
            lockedTemplateName ?? 'smily' //tempalteNames[newTemplateRandIndex]
          const nextSelected = selectTemplate({
            ecs,
            components,
            managerEntity,
            currentTemplateContextEntity: activeCtxEntity,
            templateName: newTemplateName,
            initArgs,
          });
          activeTemplateName = nextSelected.templateName;
          activeTemplate = nextSelected.template;
          activeCtx = nextSelected.ctx;
          activeRowCount = nextSelected.rowCount;
          activeCtxEntity = nextSelected.ctxEntity;
          activeRowIndex = 0;
        }

        lastRowEntity = activeTemplate.getRow(activeCtx, {
          rowIndex: activeRowIndex,
          ecs,
          sceneEntity,
          prevRow,
          prevRowEntity: lastRowEntity,
          initialY: maxY,
          rowLength: LAYOUT_CONSTANTS.COLUMNS,
          leftX,
          obstacleDimension: {
            width: columnWidth,
            height: columnWidth
          }
        })
        activeRowIndex += 1;
      }
      // Reset timer after re-seeding
      ecs.updateComponent<ObstaclesManagerComponentData>(
        managerEntity,
        ObstaclesManagerComponentName,
        (m) => {
          m.spawnTimerSeconds = 0;
          m.templateInfo = {
            // Persist the currently active template after seeding so subsequent frames
            // continue spawning from the correct template + row index.
            currentTemplateName: activeTemplateName,
            currentTempalteTotalRow: activeRowCount,
            currentRowIndex: activeRowIndex,
            lastRowEntity: lastRowEntity,
            templateContextEntity: activeCtxEntity,
          }
        }
      );
    } else if (!isInInitialPhase) {
      // Post-initial phase: Time-based spawning based on obstacle movement distance
      const obstacleWidth = getObstacleWidth(containerData.width);
      const rowHeight = obstacleWidth; // Assuming square obstacles, row height equals obstacle width

      // Calculate how far obstacles should move in one "row interval"
      const distancePerRow = rowHeight;
      const timePerRow = distancePerRow / waterData.raisingSpeed; // Time to move one row at current speed

      ecs.updateComponent<ObstaclesManagerComponentData>(
        managerEntity,
        ObstaclesManagerComponentName,
        (m) => {
          m.spawnTimerSeconds += deltaSeconds;
        }
      );

      // Spawn new obstacles when timer exceeds time for one row
      const updatedManager = components[ObstaclesManagerComponentName]?.get(
        managerEntity
      ) as ObstaclesManagerComponentData | undefined;
      let lastRowEnt = updatedManager?.templateInfo?.lastRowEntity
      const lastRowData = lastRowEnt ? components[ObstacleRowComponentName].get(lastRowEnt) as ObstacleRowComponentData : null

      if (lastRowData && lastRowData.y > (- columnWidth) && updatedManager?.templateInfo) {
        ecs.updateComponent<ObstaclesManagerComponentData>(
          managerEntity,
          ObstaclesManagerComponentName,
          (m) => {
            m.spawnTimerSeconds = 0;
          }
        );
        const templateInfo = updatedManager.templateInfo

        const activeCtxEntity = templateInfo.templateContextEntity
        const ctxEntity =
          typeof activeCtxEntity === 'number'
            ? activeCtxEntity
            : getOrCreateTemplateContextEntity(ecs);
        const ctxData = components[TemplateContextComponentName]?.get(
          ctxEntity
        ) as TemplateContextComponentData | undefined;
        const ctx: TemplateCtx = (ctxData?.ctx ?? {}) as TemplateCtx;

        const template = MappedTemplates[templateInfo.currentTemplateName]

        const lastRowEntinty = templateInfo.lastRowEntity

        let lastRowIndex = templateInfo.currentRowIndex
        let totalRow = templateInfo.currentTempalteTotalRow

        if (lastRowIndex > totalRow - 1) {
          const tempalteNames = Object.keys(MappedTemplates)
          let newTemplateRandIndex = Math.floor(Math.random() * tempalteNames.length)

          let newTemplateName = tempalteNames[newTemplateRandIndex]
          if (updatedManager.templateInfo.currentTemplateName !== 'rest') {
            newTemplateName = 'rest'
          } else if (lockedTemplateName) {
            newTemplateName = lockedTemplateName
          }
          const initArgs: TemplateInitArgs = {
            ecs,
            sceneEntity,
            rowLength: LAYOUT_CONSTANTS.COLUMNS,
            leftX,
            obstacleDimension: {
              width: columnWidth,
              height: columnWidth,
            },
            initialY: maxY,
          };

          const selected = selectTemplate({
            ecs,
            components,
            managerEntity,
            currentTemplateContextEntity: ctxEntity,
            templateName: newTemplateName,
            initArgs,
          });
          let newTemplate = selected.template
          let newRowCount = selected.rowCount
          const prevRow = templateInfo.lastRowEntity ? ecs.components[ObstacleRowComponentName].get(templateInfo.lastRowEntity) as ObstacleRowComponentData : null

          let newRowEntity = newTemplate.getRow(selected.ctx, {
            rowIndex: 0,
            ecs,
            sceneEntity,
            prevRow: prevRow,
            prevRowEntity: templateInfo.lastRowEntity,
            initialY: maxY,
            rowLength: LAYOUT_CONSTANTS.COLUMNS,
            leftX,
            obstacleDimension: {
              width: columnWidth,
              height: columnWidth
            }
          })
          // Reset timer after re-seeding
          ecs.updateComponent<ObstaclesManagerComponentData>(
            managerEntity,
            ObstaclesManagerComponentName,
            (m) => {
              m.templateInfo = {
                currentTemplateName: newTemplateName,
                currentTempalteTotalRow: newRowCount,
                currentRowIndex: 0,
                lastRowEntity: newRowEntity,
                templateContextEntity: selected.ctxEntity,
              }
            }
          );
        } else if (updatedManager.templateInfo) {
          const prevRow = templateInfo.lastRowEntity ? ecs.components[ObstacleRowComponentName].get(templateInfo.lastRowEntity) as ObstacleRowComponentData : null

          let newRowEntity = template.getRow(ctx, {
            rowIndex: lastRowIndex,
            ecs,
            sceneEntity,
            prevRow: prevRow,
            prevRowEntity: templateInfo.lastRowEntity,
            initialY: maxY,
            rowLength: LAYOUT_CONSTANTS.COLUMNS,
            leftX,
            obstacleDimension: {
              width: columnWidth,
              height: columnWidth
            }
          })

          ecs.updateComponent<ObstaclesManagerComponentData>(
            managerEntity,
            ObstaclesManagerComponentName,
            (m) => {
              if (updatedManager.templateInfo) {
                m.templateInfo = {
                  ...updatedManager.templateInfo,
                  currentRowIndex: (updatedManager.templateInfo.currentRowIndex || 0) + 1,
                  lastRowEntity: newRowEntity,
                  templateContextEntity: ctxEntity,
                }
              }

            })

        }

        //     // Generate 1-2 new obstacles with row-based spacing for gameplay
        //     const numNewObstacles = Math.floor(Math.random() * 2) + 1;

        //     // Row-based obstacle placement for better gameplay spacing
        //     const obstacleWidth = getObstacleWidth(containerData.width);
        //     const totalRows = getRows(containerData.height, obstacleWidth);

        //     // Determine target row for new obstacles (above current obstacles)
        //     const targetRow = Math.max(
        //       0,
        //       Math.floor((lowestObstacleY - containerTop) / obstacleWidth) - 1
        //     );

        //     for (let i = 0; i < numNewObstacles; i++) {
        //       // Random row selection with spacing (leave gaps between rows)
        //       let selectedRow;
        //       const rowSpacingChance = Math.random();

        //       if (rowSpacingChance < 0.5) {
        //         // 50% chance: place in target row or adjacent (can create vertical stacks)
        //         const rowOffset = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        //         selectedRow = Math.max(
        //           0,
        //           Math.min(totalRows - 1, targetRow + rowOffset)
        //         );
        //       } else {
        //         // 50% chance: skip rows to create vertical gaps
        //         const rowSkip = Math.floor(Math.random() * 3) + 1; // Skip 1-3 rows
        //         selectedRow = Math.max(0, targetRow - rowSkip);
        //       }

        //       // Random column selection (independent of row logic)
        //       const column = Math.floor(Math.random() * LAYOUT_CONSTANTS.COLUMNS);

        //       // Use grid position based on selected row and column
        //       const gridPos = getGridPosition(
        //         column,
        //         selectedRow,
        //         containerData.centerX,
        //         containerData.centerY,
        //         containerData.width,
        //         containerData.height
        //       );

        //       // Fine-tune y position to ensure it's above existing obstacles and preferably y < 0
        //       let y = gridPos.y;
        //       if (y > lowestObstacleY - obstacleWidth) {
        //         // Adjust to be above lowest obstacle
        //         y = lowestObstacleY - obstacleWidth * (1 + Math.random() * 0.5); // Random offset
        //       }
        //       // Ensure y < 0 for buffer
        //       y = Math.min(y, -10);

        //       spawnObstacleEntity({
        //         ecs,
        //         sceneEntity,
        //         x: gridPos.x,
        //         y,
        //         width: obstacleWidth,
        //         height: obstacleWidth,
        //       });
        //     }
        //   }
      }
    }
  },
};
