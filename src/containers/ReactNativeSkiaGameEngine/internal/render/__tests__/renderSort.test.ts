import {
  RenderSortMode,
  RenderSortOrigin,
  RenderSortTieBreaker,
  boundsFromShape,
  compareRenderQueue,
  computeDepthKey,
  resolveRenderLayer,
  type RenderQueueEntry,
} from '../renderSort';

function entry(
  overrides: Partial<RenderQueueEntry> & Pick<RenderQueueEntry, 'entity'>
): RenderQueueEntry {
  return {
    renderLayer: 0,
    depthKey: 0,
    worldX: 0,
    renderData: {},
    ...overrides,
  };
}

describe('resolveRenderLayer', () => {
  it('prefers renderLayer over zIndex', () => {
    expect(resolveRenderLayer({ renderLayer: 100, zIndex: 2 })).toBe(100);
  });

  it('falls back to zIndex', () => {
    expect(resolveRenderLayer({ zIndex: 2 })).toBe(2);
  });

  it('defaults to 0', () => {
    expect(resolveRenderLayer({})).toBe(0);
  });
});

describe('boundsFromShape', () => {
  it('derives half extents from rectangle', () => {
    expect(
      boundsFromShape({ type: 'rectangle', width: 80, height: 60 })
    ).toEqual({ halfW: 40, halfH: 30 });
  });
});

describe('computeDepthKey', () => {
  const bounds = { halfW: 40, halfH: 30 };

  it('WorldY Bottom: higher Y yields higher depth key', () => {
    const sort = {
      mode: RenderSortMode.WorldY,
      origin: RenderSortOrigin.Bottom,
    };
    const upper = computeDepthKey({ x: 100, y: 100 }, bounds, sort);
    const lower = computeDepthKey({ x: 100, y: 200 }, bounds, sort);
    expect(lower).toBeGreaterThan(upper);
    expect(lower - upper).toBe(100);
  });

  it('WorldY Top uses top edge', () => {
    const sort = {
      mode: RenderSortMode.WorldY,
      origin: RenderSortOrigin.Top,
    };
    expect(computeDepthKey({ x: 0, y: 100 }, bounds, sort)).toBe(70);
  });

  it('Fixed uses sortOrder', () => {
    expect(
      computeDepthKey(
        { x: 0, y: 0 },
        bounds,
        { mode: RenderSortMode.Fixed, sortOrder: 5 }
      )
    ).toBe(5);
  });

  it('Custom uses sortKey', () => {
    expect(
      computeDepthKey(
        { x: 0, y: 999 },
        bounds,
        { mode: RenderSortMode.Custom, sortKey: 42 }
      )
    ).toBe(42);
  });
});

describe('compareRenderQueue', () => {
  it('sorts lower renderLayer first', () => {
    const a = entry({ entity: 1, renderLayer: 0, depthKey: 999 });
    const b = entry({ entity: 2, renderLayer: 100, depthKey: 0 });
    expect(compareRenderQueue(a, b)).toBeLessThan(0);
  });

  it('sorts by depthKey within same layer', () => {
    const a = entry({ entity: 1, renderLayer: 100, depthKey: 50 });
    const b = entry({ entity: 2, renderLayer: 100, depthKey: 200 });
    expect(compareRenderQueue(a, b)).toBeLessThan(0);
  });

  it('uses Fixed sortOrder within layer', () => {
    const a = entry({
      entity: 2,
      renderLayer: 0,
      depthKey: 1,
      renderData: { sort: { mode: RenderSortMode.Fixed, sortOrder: 1 } },
    });
    const b = entry({
      entity: 1,
      renderLayer: 0,
      depthKey: 2,
      renderData: { sort: { mode: RenderSortMode.Fixed, sortOrder: 2 } },
    });
    expect(compareRenderQueue(a, b)).toBeLessThan(0);
  });

  it('tie-breaks by entity id by default', () => {
    const a = entry({ entity: 1, renderLayer: 0, depthKey: 10 });
    const b = entry({ entity: 5, renderLayer: 0, depthKey: 10 });
    expect(compareRenderQueue(a, b)).toBeLessThan(0);
  });

  it('tie-breaks by worldX when configured', () => {
    const a = entry({
      entity: 5,
      renderLayer: 0,
      depthKey: 10,
      worldX: 20,
      renderData: {
        sort: { tieBreaker: RenderSortTieBreaker.WorldXAsc },
      },
    });
    const b = entry({
      entity: 1,
      renderLayer: 0,
      depthKey: 10,
      worldX: 80,
      renderData: {
        sort: { tieBreaker: RenderSortTieBreaker.WorldXAsc },
      },
    });
    expect(compareRenderQueue(a, b)).toBeLessThan(0);
  });
});
