import {
  buildWaterSurfaceFoamRenderLayers,
  computeWaterSurfaceFoamStrength,
} from '@/Game/render/buildWaterSurfaceFoamRenderLayers';
import { waterSurfaceFoamTuning } from '@/config/waterSurfaceFoamTuning';
import {
  collectWaterGapSpans,
  computeFinalSurfaceUv,
  computeSurfaceLocalYOffsetPx,
  getBlendedPrimaryGapSpan,
  smoothFoamGapSpan,
} from '@/Game/water/waterSurfaceProfile';

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

describe('water surface foam', () => {
  it('collects gap spans for foam placement', () => {
    const spans = collectWaterGapSpans(
      1,
      [1 / 6, 5 / 6],
      [1 / 6, 5 / 6],
      [1 / 6, 5 / 6, 0, 0],
      [0, 0, 0, 0],
      [1 / 6, 5 / 6, 0, 0],
      [0, 0, 0, 0],
      [0.4, 0, 0, 0],
      0.4
    );
    expect(spans.length).toBeGreaterThan(0);
    expect(spans[0].endNorm).toBeGreaterThan(spans[0].startNorm);
  });

  it('curves surface offset with gameplay bulge', () => {
    const center = computeSurfaceLocalYOffsetPx(
      { ...profileBase, xNorm: 0.5 },
      400
    );
    const edge = computeSurfaceLocalYOffsetPx(
      { ...profileBase, xNorm: 0.2 },
      400
    );
    expect(center).not.toBe(edge);
    expect(computeFinalSurfaceUv({ ...profileBase, xNorm: 0.5 })).toBeGreaterThan(
      profileBase.waterLevel
    );
  });

  it('scales foam strength with speed and flow', () => {
    const calm = computeWaterSurfaceFoamStrength({
      raisingSpeed: 40,
      flowVelocity: 0,
      surgeEnergy: 0,
      gapWidthNorm: 0.7,
      visualIntensity: 0.2,
    });
    const active = computeWaterSurfaceFoamStrength({
      raisingSpeed: 260,
      flowVelocity: 0.8,
      surgeEnergy: 0.7,
      gapWidthNorm: 0.35,
      visualIntensity: 1,
    });
    expect(active).toBeGreaterThan(calm);
  });

  it('builds white gooey layers along gap spans', () => {
    const spans = collectWaterGapSpans(
      1,
      profileBase.gapCurrent,
      profileBase.gapPrev,
      profileBase.gapCurr01,
      profileBase.gapCurr23,
      profileBase.gapPrev01,
      profileBase.gapPrev23,
      [0.5, 0, 0, 0],
      0.5
    );
    const layers = buildWaterSurfaceFoamRenderLayers({
      spans,
      containerWidth: 320,
      containerHeight: 480,
      foamAge: 0.8,
      foamSeed: 42.7,
      foamStrength: 0.9,
      waterRaiseSpeed: 220,
      profileBase,
    });
    expect(layers.length).toBeGreaterThan(0);
    const whiteLayers = layers.filter(
      (layer) => layer.fillColor === waterSurfaceFoamTuning.fillColor
    );
    expect(whiteLayers.length).toBe(layers.length);
    const circles = layers.filter((layer) => layer.shape?.type === 'circle');
    expect(circles.length).toBeGreaterThan(0);
  });

  it('keeps blob size and opacity stable after the initial fade-in', () => {
    const spans = collectWaterGapSpans(
      1,
      profileBase.gapCurrent,
      profileBase.gapPrev,
      profileBase.gapCurr01,
      profileBase.gapCurr23,
      profileBase.gapPrev01,
      profileBase.gapPrev23,
      [0.5, 0, 0, 0],
      0.5
    );
    const baseArgs = {
      spans,
      containerWidth: 320,
      containerHeight: 480,
      foamSeed: 42.7,
      foamStrength: 0.9,
      waterRaiseSpeed: 220,
      profileBase,
    };
    const early = buildWaterSurfaceFoamRenderLayers({ ...baseArgs, foamAge: 1.2 });
    const later = buildWaterSurfaceFoamRenderLayers({ ...baseArgs, foamAge: 6.5 });
    const circleAt = (layers: ReturnType<typeof buildWaterSurfaceFoamRenderLayers>) =>
      layers.find((layer) => layer.shape?.type === 'circle');
    const a = circleAt(early);
    const b = circleAt(later);
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    if (!a || !b || a.shape?.type !== 'circle' || b.shape?.type !== 'circle') {
      return;
    }
    expect(b.shape.radius).toBeCloseTo(a.shape.radius ?? 0, 4);
    expect(b.opacity).toBeCloseTo(a.opacity ?? 0, 3);
  });

  it('slides blob X smoothly when the display span eases toward a new gap', () => {
    const spanNarrow = {
      startNorm: 0.28,
      endNorm: 0.72,
      flow: 0.3,
    };
    const spanWide = {
      startNorm: 0.12,
      endNorm: 0.88,
      flow: 0.3,
    };
    const baseArgs = {
      containerWidth: 320,
      containerHeight: 480,
      foamAge: 2,
      foamSeed: 42.7,
      foamStrength: 0.9,
      waterRaiseSpeed: 220,
      profileBase,
      gapTransitionT: 0,
    };
    const narrow = buildWaterSurfaceFoamRenderLayers({
      ...baseArgs,
      spans: [spanNarrow],
    });
    const wide = buildWaterSurfaceFoamRenderLayers({
      ...baseArgs,
      spans: [spanWide],
    });
    const midX = (layers: ReturnType<typeof buildWaterSurfaceFoamRenderLayers>) => {
      const circles = layers.filter((layer) => layer.shape?.type === 'circle');
      const xs = circles.map((layer) => layer.position?.x ?? 0).sort((a, b) => a - b);
      return xs[Math.floor(xs.length * 0.5)] ?? 0;
    };
    const eased = smoothFoamGapSpan(
      spanNarrow.startNorm,
      spanNarrow.endNorm,
      spanWide,
      0.2,
      waterSurfaceFoamTuning.gapSpanSmoothPerSecond
    );
    const blended = buildWaterSurfaceFoamRenderLayers({
      ...baseArgs,
      spans: [{ ...spanWide, startNorm: eased.startNorm, endNorm: eased.endNorm }],
    });
    const narrowMid = midX(narrow);
    const wideMid = midX(wide);
    const blendedMid = midX(blended);
    expect(Math.abs(blendedMid - narrowMid)).toBeLessThan(Math.abs(wideMid - narrowMid));
  });

  it('adds edge gather blobs during gap transition', () => {
    const span = getBlendedPrimaryGapSpan(0.2, [0.2, 0.8], [0.1, 0.9], 0.4, [0.4, 0, 0, 0]);
    expect(span).not.toBeNull();
    if (!span) {
      return;
    }
    const calm = buildWaterSurfaceFoamRenderLayers({
      spans: [span],
      containerWidth: 320,
      containerHeight: 480,
      foamAge: 1.2,
      foamSeed: 42.7,
      foamStrength: 0.9,
      waterRaiseSpeed: 220,
      profileBase,
      gapTransitionT: 0,
    });
    const gathering = buildWaterSurfaceFoamRenderLayers({
      spans: [span],
      containerWidth: 320,
      containerHeight: 480,
      foamAge: 1.2,
      foamSeed: 42.7,
      foamStrength: 0.9,
      waterRaiseSpeed: 220,
      profileBase,
      gapTransitionT: 0.75,
    });
    const countCircles = (layers: ReturnType<typeof buildWaterSurfaceFoamRenderLayers>) =>
      layers.filter((layer) => layer.shape?.type === 'circle').length;
    expect(countCircles(gathering)).toBeGreaterThan(countCircles(calm));
  });

  it('renders visible foam at start-ready strength and min age', () => {
    const span = getBlendedPrimaryGapSpan(1, [1 / 6, 5 / 6], [1 / 6, 5 / 6], 0, [0, 0, 0, 0]);
    expect(span).not.toBeNull();
    if (!span) {
      return;
    }
    const strength = Math.max(
      computeWaterSurfaceFoamStrength({
        raisingSpeed: 0,
        flowVelocity: 0,
        surgeEnergy: 0,
        gapWidthNorm: 2 / 3,
        visualIntensity: 1,
      }),
      waterSurfaceFoamTuning.startReadyFoamStrength
    );
    const layers = buildWaterSurfaceFoamRenderLayers({
      spans: [span],
      containerWidth: 320,
      containerHeight: 480,
      foamAge: waterSurfaceFoamTuning.startReadyMinFoamAge,
      foamSeed: 42.7,
      foamStrength: strength,
      waterRaiseSpeed: 0,
      profileBase,
      gapTransitionT: 0,
    });
    expect(layers.length).toBeGreaterThan(0);
    const maxOpacity = layers.reduce((m, layer) => Math.max(m, layer.opacity ?? 0), 0);
    expect(maxOpacity).toBeGreaterThan(0.35);
  });
});
