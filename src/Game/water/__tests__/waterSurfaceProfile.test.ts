import {
  computeFinalSurfaceUv,
  sampleLocalFlowAtXNorm,
} from '@/Game/water/waterSurfaceProfile';

const gapVec = {
  gapBlend: 1,
  gapCurrent: [1 / 6, 5 / 6] as const,
  gapPrev: [1 / 6, 5 / 6] as const,
  gapCurr01: [1 / 6, 5 / 6, 0, 0] as const,
  gapCurr23: [0, 0, 0, 0] as const,
  gapPrev01: [1 / 6, 5 / 6, 0, 0] as const,
  gapPrev23: [0, 0, 0, 0] as const,
};

describe('waterSurfaceProfile shaft flow', () => {
  it('sampleLocalFlowAtXNorm reads flowPerRange inside gap span', () => {
    const flow = sampleLocalFlowAtXNorm(
      0.5,
      gapVec.gapBlend,
      gapVec.gapCurr01,
      gapVec.gapCurr23,
      gapVec.gapPrev01,
      gapVec.gapPrev23,
      [0.75, -0.2, 0, 0],
      0
    );
    expect(flow).toBeCloseTo(0.75, 2);
  });

  it('computeFinalSurfaceUv leans asymmetrically with signed platform flow', () => {
    const base = {
      waterLevel: 0.35,
      iTime: 0,
      frequency: 3.4,
      speed: 0.02,
      amplitude: 0.0035,
      visualIntensity: 1,
      hybridGapMaskStrength: 0.9,
      curveCenter: 0.5,
      curveAmp: 0.012,
      curveTilt: 0,
      calmness: 0.2,
      flowVelocity: 0,
      surgeEnergy: 0.55,
      surfaceBandCenterY: 0.35,
      surfaceBandHalfHeight: 0.06,
      ...gapVec,
    };
    const neutral = computeFinalSurfaceUv({ ...base, xNorm: 0.5, flowPerRange: [0, 0, 0, 0] });
    const pushRight = computeFinalSurfaceUv({
      ...base,
      xNorm: 0.5,
      flowPerRange: [0.85, 0, 0, 0],
    });
    const pushLeft = computeFinalSurfaceUv({
      ...base,
      xNorm: 0.5,
      flowPerRange: [-0.85, 0, 0, 0],
    });
    expect(pushRight).not.toBeCloseTo(neutral, 4);
    expect(pushLeft).not.toBeCloseTo(pushRight, 4);
  });
});
