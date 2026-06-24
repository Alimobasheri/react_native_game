import { buildBlockFoamRenderLayers } from '@/Game/render/buildBlockFoamRenderLayers';
import { blockFoamTuning } from '@/config/blockFoamTuning';

const baseArgs = {
  contacts: [{ col: 2, side: 'right' as const }],
  rowLength: 8,
  blockWidth: 40,
  blockHeight: 40,
  waterRaiseSpeed: 200,
  contactLocalY: 10,
  rowSeed: 128.4,
};

describe('buildBlockFoamRenderLayers', () => {
  it('returns no layers at foamAge 0 (row fade + spawn delay)', () => {
    const layers = buildBlockFoamRenderLayers({ ...baseArgs, foamAge: 0 });
    expect(layers).toEqual([]);
  });

  it('ramps opacity in instead of spawning at full brightness', () => {
    const early = buildBlockFoamRenderLayers({ ...baseArgs, foamAge: 0.05 });
    const later = buildBlockFoamRenderLayers({ ...baseArgs, foamAge: 0.35 });
    const maxEarly = early.reduce((m, l) => Math.max(m, l.opacity ?? 0), 0);
    const maxLater = later.reduce((m, l) => Math.max(m, l.opacity ?? 0), 0);
    expect(maxEarly).toBeLessThan(maxLater);
    expect(maxLater).toBeLessThanOrEqual(blockFoamTuning.maxBlobOpacity);
  });

  it('anchors foam on the water-facing block lip with overlap into the gap', () => {
    const blockWidth = 40;
    const rowLength = 8;
    const col = 2;
    const rowWidth = rowLength * blockWidth;
    const colRight = -rowWidth * 0.5 + (col + 1) * blockWidth;
    const colLeft = colRight - blockWidth;

    const layers = buildBlockFoamRenderLayers({ ...baseArgs, foamAge: 1.2 });
    const bodies = layers.filter(
      (layer) =>
        layer.fillColor === blockFoamTuning.fillColor &&
        layer.shape?.type === 'circle' &&
        (layer.shape.radius ?? 0) >= blockFoamTuning.minRadiusPx * 0.7
    );
    expect(bodies.length).toBeGreaterThan(0);

    for (const layer of bodies) {
      const x = layer.position?.x ?? 0;
      const radius = layer.shape?.type === 'circle' ? layer.shape.radius : 0;
      expect(x).toBeGreaterThanOrEqual(colLeft + radius * 0.45);
      expect(x).toBeLessThanOrEqual(
        colRight - radius * blockFoamTuning.minOnBlockRadiusFraction + 0.5
      );
      expect(x + radius).toBeGreaterThan(colRight - 2);
    }
  });

  it('never emits layers with zero opacity', () => {
    for (let t = 0; t <= 2; t += 0.05) {
      const layers = buildBlockFoamRenderLayers({ ...baseArgs, foamAge: t });
      for (const layer of layers) {
        const opacity = layer.opacity ?? 0;
        if (opacity === 0) {
          continue;
        }
        expect(opacity).toBeGreaterThanOrEqual(blockFoamTuning.minDrawOpacity);
      }
    }
  });

  it('slowly fades and reappears instead of clinging forever', () => {
    const samples: number[] = [];
    for (let t = 0; t <= 6; t += 0.1) {
      const layers = buildBlockFoamRenderLayers({ ...baseArgs, foamAge: t });
      const maxOpacity = layers.reduce((m, l) => Math.max(m, l.opacity ?? 0), 0);
      samples.push(maxOpacity);
    }
    const peak = Math.max(...samples);
    const valley = Math.min(...samples.filter((v) => v > 0));
    expect(peak).toBeGreaterThan(0.45);
    expect(peak - valley).toBeGreaterThan(0.08);
    expect(samples[samples.length - 1]).toBeGreaterThan(blockFoamTuning.minDrawOpacity);
  });

  it('renders foam along exposed top edges', () => {
    const layers = buildBlockFoamRenderLayers({
      ...baseArgs,
      contacts: [{ col: 2, side: 'top' }],
      foamAge: 1.2,
    });
    expect(layers.length).toBeGreaterThan(0);
    const halfH = baseArgs.blockHeight * 0.5;
    for (const layer of layers) {
      const y = layer.position?.y ?? 0;
      expect(y).toBeLessThan(-halfH + 8);
    }
  });

  it('draws a straight spine rectangle along each wet contact edge', () => {
    const layers = buildBlockFoamRenderLayers({ ...baseArgs, foamAge: 0.35 });
    const spines = layers.filter(
      (layer) =>
        layer.shape?.type === 'rectangle' &&
        layer.fillColor === blockFoamTuning.fillColor
    );
    expect(spines.length).toBe(1);
    const spine = spines[0];
    expect(spine.shape?.type).toBe('rectangle');
    if (spine.shape?.type !== 'rectangle') {
      return;
    }
    expect(spine.shape.width).toBe(blockFoamTuning.spineWidthPx);
    expect(spine.shape.height).toBeGreaterThan(blockFoamTuning.foamClimbBandPx * 0.5);
    expect(spine.opacity).toBeGreaterThan(0.4);
  });

  it('varies placement and density per row seed', () => {
    const a = buildBlockFoamRenderLayers({ ...baseArgs, rowSeed: 12.5, foamAge: 1.4 });
    const b = buildBlockFoamRenderLayers({ ...baseArgs, rowSeed: 97.8, foamAge: 1.4 });
    const signature = (layers: ReturnType<typeof buildBlockFoamRenderLayers>) =>
      layers
        .map((layer) => `${layer.position?.x?.toFixed(1)}:${layer.position?.y?.toFixed(1)}`)
        .join('|');
    expect(signature(a)).not.toBe(signature(b));
  });
});
