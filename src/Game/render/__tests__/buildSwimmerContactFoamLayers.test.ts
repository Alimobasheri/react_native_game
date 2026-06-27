import {
  blendFoamFillColors,
  buildSwimmerContactFoamLayers,
  isSwimmerAtWaterForCollarFoam,
  isSwimmerContactingWaterSurface,
  surfaceLocalYAtBandX,
  swimmerXToNormSpan,
} from '@/Game/render/buildSwimmerContactFoamLayers';
import { swimmerWaterFxTuning } from '@/config/swimmerWaterFxTuning';

const profileBase = {
  waterLevel: 0.35,
  iTime: 12.4,
  frequency: 3.4,
  speed: 0.02,
  amplitude: 0.0035,
  visualIntensity: 1,
  gapBlend: 1,
  gapCurrent: [1 / 6, 5 / 6] as const,
  gapPrev: [1 / 6, 5 / 6] as const,
  gapCurr01: [1 / 6, 5 / 6, 0, 0] as const,
  gapCurr23: [0, 0, 0, 0] as const,
  gapPrev01: [1 / 6, 5 / 6, 0, 0] as const,
  gapPrev23: [0, 0, 0, 0] as const,
  hybridGapMaskStrength: 0.9,
  curveCenter: 0.5,
  curveAmp: 0.012,
  curveTilt: 0.002,
  calmness: 0.4,
  flowVelocity: 0.35,
  surgeEnergy: 0.5,
  surfaceBandCenterY: 0.35,
  surfaceBandHalfHeight: 0.06,
};

const containerWidth = 360;
const containerHeight = 640;
const containerCenterX = 180;

const circleLayers = (
  layers: ReturnType<typeof buildSwimmerContactFoamLayers>
) => layers.filter((layer) => layer.shape.type === 'circle');

const spineLayers = (
  layers: ReturnType<typeof buildSwimmerContactFoamLayers>
) => layers.filter((layer) => layer.shape.type === 'rectangle');

describe('buildSwimmerContactFoamLayers', () => {
  const baseSpan = swimmerXToNormSpan(
    containerCenterX,
    containerCenterX,
    containerWidth,
    0.05
  );

  const baseArgs = {
    span: baseSpan,
    foamAge: 0.12,
    life01: 0.8,
    foamSeed: 42.7,
    foamStrength: 0.8,
    bandCenterX: containerCenterX,
    profileBase,
    containerWidth,
    containerHeight,
    containerCenterX,
  };

  it.each(['dent'] as const)(
    'renders visible spine segments for %s at mid-life',
    (kind) => {
      const layers = buildSwimmerContactFoamLayers({
        ...baseArgs,
        kind,
        layerMode: 'spinesOnly',
      });
      const spines = spineLayers(layers);
      expect(spines.length).toBeGreaterThan(0);
      const maxOpacity = Math.max(...spines.map((c) => c.opacity ?? 0));
      expect(maxOpacity).toBeGreaterThanOrEqual(swimmerWaterFxTuning.minDrawOpacity);
    }
  );

  it('renders chaotic micro-droplet splash particles at mid-life', () => {
    const layers = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'splash',
      foamAge: 0.1,
      life01: 0.95,
      direction: 1,
      layerMode: 'blobsOnly',
    });
    const blobs = circleLayers(layers);
    expect(blobs.length).toBeGreaterThan(8);
    expect(spineLayers(layers).length).toBe(0);
    const radii = blobs.map((b) => b.shape.radius ?? 0);
    expect(Math.max(...radii)).toBeLessThanOrEqual(
      swimmerWaterFxTuning.splashArc.maxRadiusPx * 1.15
    );
  });

  it('renders pivot and pinned bursts as micro-droplets not spines', () => {
    const pivot = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'pivotFan',
      foamAge: 0.12,
      life01: 0.9,
      direction: 1,
      layerMode: 'blobsOnly',
    });
    const pinned = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'pinnedBurst',
      foamAge: 0.1,
      life01: 0.95,
      layerMode: 'blobsOnly',
    });
    expect(circleLayers(pivot).length).toBeGreaterThan(6);
    expect(circleLayers(pinned).length).toBeGreaterThan(10);
    expect(spineLayers(pivot).length).toBe(0);
    expect(spineLayers(pinned).length).toBe(0);
  });

  it('renders a single wake trail droplet that drifts and curls with age', () => {
    const young = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'wake',
      foamAge: 0.04,
      life01: 0.92,
      direction: 1,
      layerMode: 'blobsOnly',
    });
    const aged = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'wake',
      foamAge: 0.28,
      life01: 0.55,
      direction: 1,
      layerMode: 'blobsOnly',
    });
    expect(circleLayers(young).length).toBe(1);
    expect(circleLayers(aged).length).toBe(1);
    expect(spineLayers(young).length).toBe(0);
    const youngY = circleLayers(young)[0].position.y;
    const agedY = circleLayers(aged)[0].position.y;
    const youngX = circleLayers(young)[0].position.x;
    const agedX = circleLayers(aged)[0].position.x;
    expect(agedX).toBeLessThan(youngX);
    expect(agedY).toBeLessThan(youngY);
  });

  it.each(['collar', 'dangerEdge'] as const)(
    'renders outward collar blobs for %s',
    (kind) => {
      const layers = buildSwimmerContactFoamLayers({
        ...baseArgs,
        kind,
        foamAge: 0.9,
        life01: 1,
        fillColor:
          kind === 'dangerEdge'
            ? swimmerWaterFxTuning.dangerFillColor
            : swimmerWaterFxTuning.fillColor,
        layerMode: 'blobsOnly',
      });
      const blobs = circleLayers(layers);
      expect(blobs.length).toBeGreaterThan(4);
      expect(spineLayers(layers).length).toBe(0);
      const radii = blobs.map((b) => b.shape.radius ?? 0);
      expect(Math.max(...radii)).toBeLessThanOrEqual(
        swimmerWaterFxTuning.collar.maxBlobRadiusPx * 1.15
      );
    }
  );

  it('reduces splash opacity as life01 fades out', () => {
    const fresh = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'splash',
      foamAge: 0.12,
      life01: 0.9,
      layerMode: 'blobsOnly',
    });
    const faded = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'splash',
      foamAge: 0.12,
      life01: 0.1,
      layerMode: 'blobsOnly',
    });
    const freshMax = Math.max(...circleLayers(fresh).map((c) => c.opacity ?? 0));
    const fadedMax = Math.max(...circleLayers(faded).map((c) => c.opacity ?? 0));
    expect(fadedMax).toBeLessThan(freshMax);
  });

  it('returns empty layers when life01 is zero', () => {
    const layers = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'splash',
      life01: 0,
    });
    expect(layers).toEqual([]);
  });

  it('applies custom fillColor for danger tint', () => {
    const layers = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'dangerEdge',
      foamAge: 0.9,
      life01: 1,
      fillColor: swimmerWaterFxTuning.dangerFillColor,
      layerMode: 'blobsOnly',
    });
    expect(
      layers.some((layer) => layer.fillColor === swimmerWaterFxTuning.dangerFillColor)
    ).toBe(true);
  });

  it('splash particles travel higher as foamAge increases', () => {
    const young = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'splash',
      foamAge: 0.08,
      life01: 0.95,
      direction: 1,
      layerMode: 'blobsOnly',
    });
    const aged = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'splash',
      foamAge: 0.2,
      life01: 0.95,
      direction: 1,
      layerMode: 'blobsOnly',
    });
    const contactY = surfaceLocalYAtBandX(
      profileBase,
      containerCenterX,
      0,
      containerCenterX,
      containerWidth,
      containerHeight
    ) + swimmerWaterFxTuning.blobYOffsetPx;
    const peakLift = (layers: ReturnType<typeof buildSwimmerContactFoamLayers>) =>
      Math.max(...circleLayers(layers).map((l) => contactY - l.position.y), 0);
    expect(peakLift(aged)).toBeGreaterThan(peakLift(young));
  });

  it('collar blobs ease outward from center over time', () => {
    const nearStart = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'collar',
      foamSeed: 5,
      foamAge: 0.02,
      life01: 1,
      layerMode: 'blobsOnly',
    });
    const midCycle = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'collar',
      foamSeed: 5,
      foamAge: 0.55,
      life01: 1,
      layerMode: 'blobsOnly',
    });
    const dist = (layers: ReturnType<typeof buildSwimmerContactFoamLayers>) =>
      Math.max(
        ...circleLayers(layers).map((l) => {
          const surfaceY = surfaceLocalYAtBandX(
            profileBase,
            containerCenterX,
            l.position.x,
            containerCenterX,
            containerWidth,
            containerHeight
          );
          return Math.hypot(
            l.position.x,
            l.position.y - surfaceY - swimmerWaterFxTuning.blobYOffsetPx
          );
        }),
        0
      );
    expect(dist(midCycle)).toBeGreaterThan(dist(nearStart));
  });

  it('collar blob Y follows water surface curve at each X', () => {
    const curved = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'collar',
      foamAge: 0.2,
      life01: 1,
      layerMode: 'blobsOnly',
      profileBase: { ...profileBase, curveAmp: 0.04 },
    });
    const flat = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'collar',
      foamAge: 0.2,
      life01: 1,
      layerMode: 'blobsOnly',
      profileBase: { ...profileBase, curveAmp: 0 },
    });
    const curvedYs = circleLayers(curved).map((l) => l.position.y);
    const flatYs = circleLayers(flat).map((l) => l.position.y);
    expect(curvedYs.length).toBeGreaterThan(0);
    const curvedSpread = Math.max(...curvedYs) - Math.min(...curvedYs);
    const flatSpread = Math.max(...flatYs) - Math.min(...flatYs);
    expect(curvedSpread).toBeGreaterThan(flatSpread);
  });

  it('collar regrowth needs center at float depth not bottom graze', () => {
    const height = 36;
    const surfaceY = 200;
    const halfH = height / 2;
    expect(
      isSwimmerContactingWaterSurface(surfaceY - halfH + 5, surfaceY, halfH)
    ).toBe(true);
    expect(
      isSwimmerAtWaterForCollarFoam(surfaceY - halfH + 5, surfaceY, height, false)
    ).toBe(false);
    expect(
      isSwimmerAtWaterForCollarFoam(surfaceY + height * 0.08, surfaceY, height, false)
    ).toBe(true);
    expect(
      isSwimmerAtWaterForCollarFoam(surfaceY + height * 0.08, surfaceY, height, true)
    ).toBe(false);
  });

  it('collar radiates multiple ripple fronts at different distances', () => {
    const collar = swimmerWaterFxTuning.collar;
    const young = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'collar',
      foamAge: collar.emitIntervalSec * 0.4,
      life01: 1,
      layerMode: 'blobsOnly',
      collarRegrow01: 1,
    });
    const aged = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'collar',
      foamAge: collar.emitIntervalSec * 2.8,
      life01: 1,
      layerMode: 'blobsOnly',
      collarRegrow01: 1,
    });
    expect(circleLayers(young).length).toBeGreaterThan(0);
    expect(circleLayers(aged).length).toBeGreaterThan(circleLayers(young).length);

    const maxDist = (layers: ReturnType<typeof buildSwimmerContactFoamLayers>) =>
      Math.max(
        ...circleLayers(layers).map((l) => Math.abs(l.position.x)),
        0
      );
    expect(maxDist(aged)).toBeGreaterThan(maxDist(young));
  });

  it('collar blobs stay narrow (ring front, not pulsing discs)', () => {
    const layers = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'collar',
      foamAge: 1.2,
      life01: 1,
      layerMode: 'blobsOnly',
      collarRegrow01: 1,
    });
    const radii = circleLayers(layers).map((b) => b.shape.radius ?? 0);
    expect(radii.length).toBeGreaterThan(0);
    expect(Math.max(...radii)).toBeLessThanOrEqual(
      swimmerWaterFxTuning.collar.maxBlobRadiusPx * 1.1
    );
  });

  it('collar keeps emitting ripples after long swim time (ring buffer)', () => {
    const sustained = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'collar',
      foamAge: 24,
      life01: 1,
      layerMode: 'blobsOnly',
      collarRegrow01: 1,
    });
    expect(circleLayers(sustained).length).toBeGreaterThan(4);
  });

  it('collar regrow ease reduces opacity before full strength', () => {
    const full = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'collar',
      foamAge: 0.35,
      life01: 1,
      layerMode: 'blobsOnly',
      collarRegrow01: 1,
    });
    const easing = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'collar',
      foamAge: 0.35,
      life01: 1,
      layerMode: 'blobsOnly',
      collarRegrow01: 0.25,
    });
    const fullMax = Math.max(...circleLayers(full).map((b) => b.opacity ?? 0));
    const easeMax = Math.max(...circleLayers(easing).map((b) => b.opacity ?? 0));
    expect(fullMax).toBeGreaterThan(0);
    expect(easeMax).toBeLessThan(fullMax * 0.45);
  });

  it('collar opacity drains globally when leaving water', () => {
    const active = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'collar',
      foamAge: 0.35,
      life01: 1,
      layerMode: 'blobsOnly',
      collarSpawnActive: true,
      collarDrain01: 1,
    });
    const draining = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'collar',
      foamAge: 0.35,
      life01: 1,
      layerMode: 'blobsOnly',
      collarSpawnActive: false,
      collarDrain01: 0.12,
    });
    const activeMax = Math.max(...circleLayers(active).map((b) => b.opacity ?? 0));
    const drainMax = Math.max(...circleLayers(draining).map((b) => b.opacity ?? 0));
    expect(activeMax).toBeGreaterThan(0);
    expect(drainMax).toBeLessThan(activeMax * 0.35);
  });

  it('splash droplets arc upward from the surface contact line', () => {
    const young = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'splash',
      foamAge: 0.05,
      life01: 0.95,
      direction: 1,
      layerMode: 'blobsOnly',
    });
    const peak = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'splash',
      foamAge: 0.12,
      life01: 0.95,
      direction: 1,
      layerMode: 'blobsOnly',
    });
    const contactY = surfaceLocalYAtBandX(
      profileBase,
      containerCenterX,
      0,
      containerCenterX,
      containerWidth,
      containerHeight
    ) + swimmerWaterFxTuning.blobYOffsetPx;
    const minYoungY = Math.min(...circleLayers(young).map((l) => l.position.y));
    const minPeakY = Math.min(...circleLayers(peak).map((l) => l.position.y));
    expect(minYoungY).toBeLessThan(contactY + 2);
    expect(minPeakY).toBeLessThan(minYoungY);
  });

  it('splits spines and blobs by layer mode', () => {
    const spines = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'dent',
      layerMode: 'spinesOnly',
    });
    const blobs = buildSwimmerContactFoamLayers({
      ...baseArgs,
      kind: 'splash',
      layerMode: 'blobsOnly',
    });
    expect(spineLayers(spines).length).toBeGreaterThan(0);
    expect(circleLayers(spines).length).toBe(0);
    expect(circleLayers(blobs).length).toBeGreaterThan(0);
    expect(spineLayers(blobs).length).toBe(0);
  });

  it('blends fill colors toward danger red', () => {
    expect(blendFoamFillColors('#FFFFFF', '#FFD4CC', 0)).toBe('#FFFFFF');
    expect(blendFoamFillColors('#FFFFFF', '#FFD4CC', 1)).toBe('#FFD4CC');
    const mid = blendFoamFillColors('#FFFFFF', '#FFD4CC', 0.5);
    expect(mid).not.toBe('#FFFFFF');
    expect(mid).not.toBe('#FFD4CC');
  });
});
