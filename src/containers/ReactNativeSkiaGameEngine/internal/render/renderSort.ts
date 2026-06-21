/** Shape type strings — duplicated here to avoid circular import with render.ts in worklets. */
const SHAPE_RECTANGLE = 'rectangle';
const SHAPE_CIRCLE = 'circle';
const SHAPE_POLYGON = 'polygon';

export enum RenderSortMode {
  Fixed = 'fixed',
  WorldY = 'worldY',
  WorldX = 'worldX',
  Custom = 'custom',
}

export enum RenderSortOrigin {
  Center = 'center',
  Top = 'top',
  Bottom = 'bottom',
  Left = 'left',
  Right = 'right',
}

export enum RenderSortTieBreaker {
  EntityId = 'entityId',
  EntityIdReverse = 'entityIdReverse',
  WorldXAsc = 'worldXAsc',
  WorldXDesc = 'worldXDesc',
}

export type RenderSortData = {
  mode?: RenderSortMode;
  origin?: RenderSortOrigin;
  originOffset?: number;
  /** Manual order within a layer when mode = Fixed. */
  sortOrder?: number;
  /** Explicit depth key when mode = Custom. */
  sortKey?: number;
  tieBreaker?: RenderSortTieBreaker;
};

export type RenderBounds = {
  halfW: number;
  halfH: number;
};

export type RenderTransform = {
  x: number;
  y: number;
  angle?: number;
};

export type RenderLayerSource = {
  renderLayer?: number;
  zIndex?: number;
};

export type RenderQueueEntry = {
  entity: number;
  renderLayer: number;
  depthKey: number;
  worldX: number;
  renderData: { sort?: RenderSortData };
};

export function resolveRenderLayer(data: RenderLayerSource): number {
  'worklet';
  if (typeof data.renderLayer === 'number') {
    return data.renderLayer;
  }
  if (typeof data.zIndex === 'number') {
    return data.zIndex;
  }
  return 0;
}

export function boundsFromShape(shape: {
  type: string;
  width?: number;
  height?: number;
  radius?: number;
  vertices?: { x: number; y: number }[];
}): RenderBounds {
  'worklet';
  switch (shape.type) {
    case SHAPE_RECTANGLE:
      return {
        halfW: (shape.width ?? 0) / 2,
        halfH: (shape.height ?? 0) / 2,
      };
    case SHAPE_CIRCLE:
      return {
        halfW: shape.radius ?? 0,
        halfH: shape.radius ?? 0,
      };
    case SHAPE_POLYGON: {
      let minX = 0;
      let maxX = 0;
      let minY = 0;
      let maxY = 0;
      const verts = shape.vertices ?? [];
      if (verts.length > 0) {
        minX = verts[0].x;
        maxX = verts[0].x;
        minY = verts[0].y;
        maxY = verts[0].y;
        for (let i = 1; i < verts.length; i++) {
          minX = Math.min(minX, verts[i].x);
          maxX = Math.max(maxX, verts[i].x);
          minY = Math.min(minY, verts[i].y);
          maxY = Math.max(maxY, verts[i].y);
        }
      }
      return { halfW: (maxX - minX) / 2, halfH: (maxY - minY) / 2 };
    }
    default:
      return { halfW: 0, halfH: 0 };
  }
}

function pivotAlongY(
  transform: RenderTransform,
  bounds: RenderBounds,
  origin: RenderSortOrigin
): number {
  'worklet';
  switch (origin) {
    case RenderSortOrigin.Top:
      return transform.y - bounds.halfH;
    case RenderSortOrigin.Bottom:
      return transform.y + bounds.halfH;
    case RenderSortOrigin.Center:
    default:
      return transform.y;
  }
}

function pivotAlongX(
  transform: RenderTransform,
  bounds: RenderBounds,
  origin: RenderSortOrigin
): number {
  'worklet';
  switch (origin) {
    case RenderSortOrigin.Left:
      return transform.x - bounds.halfW;
    case RenderSortOrigin.Right:
      return transform.x + bounds.halfW;
    case RenderSortOrigin.Center:
    default:
      return transform.x;
  }
}

export function computeDepthKey(
  transform: RenderTransform,
  bounds: RenderBounds,
  sort?: RenderSortData
): number {
  'worklet';
  const mode = sort?.mode ?? RenderSortMode.Fixed;
  const offset = sort?.originOffset ?? 0;

  switch (mode) {
    case RenderSortMode.Custom:
      return sort?.sortKey ?? 0;
    case RenderSortMode.WorldY: {
      const origin = sort?.origin ?? RenderSortOrigin.Center;
      return pivotAlongY(transform, bounds, origin) + offset;
    }
    case RenderSortMode.WorldX: {
      const origin = sort?.origin ?? RenderSortOrigin.Center;
      return pivotAlongX(transform, bounds, origin) + offset;
    }
    case RenderSortMode.Fixed:
    default:
      return sort?.sortOrder ?? 0;
  }
}

function compareTieBreaker(
  a: RenderQueueEntry,
  b: RenderQueueEntry
): number {
  'worklet';
  const tie =
    a.renderData.sort?.tieBreaker ?? RenderSortTieBreaker.EntityId;

  switch (tie) {
    case RenderSortTieBreaker.WorldXAsc:
      return a.worldX - b.worldX;
    case RenderSortTieBreaker.WorldXDesc:
      return b.worldX - a.worldX;
    case RenderSortTieBreaker.EntityIdReverse:
      return b.entity - a.entity;
    case RenderSortTieBreaker.EntityId:
    default:
      return a.entity - b.entity;
  }
}

export function compareRenderQueue(
  a: RenderQueueEntry,
  b: RenderQueueEntry
): number {
  'worklet';
  if (a.renderLayer !== b.renderLayer) {
    return a.renderLayer - b.renderLayer;
  }
  if (a.depthKey !== b.depthKey) {
    return a.depthKey - b.depthKey;
  }
  return compareTieBreaker(a, b);
}
