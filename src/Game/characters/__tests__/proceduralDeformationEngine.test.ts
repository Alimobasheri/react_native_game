import { MovementState } from '../characterMovementStates';
import {
  createDeformationScale,
  updateProceduralDeformation,
} from '../proceduralDeformationEngine';
import { swimmerDeformationTuning } from '@/config/swimmerDeformationTuning';

const convergeToTarget = (
  scale: ReturnType<typeof createDeformationScale>,
  state: MovementState,
  velocityX: number,
  tier: 1 | 2 | 3,
  idlePhase = 0
) => {
  for (let i = 0; i < 120; i++) {
    updateProceduralDeformation(scale, state, velocityX, tier, 1 / 30, idlePhase);
  }
  return scale;
};

describe('updateProceduralDeformation', () => {
  it('squashes horizontally during ANTICIPATION with volume conservation', () => {
    const scale = createDeformationScale();
    convergeToTarget(scale, MovementState.ANTICIPATION, 0, 1);

    expect(scale.scaleX).toBeCloseTo(
      swimmerDeformationTuning.ANTICIPATION_SCALE_X,
      2
    );
    expect(scale.scaleY).toBeCloseTo(
      1 / swimmerDeformationTuning.ANTICIPATION_SCALE_X,
      2
    );
    expect(scale.scaleX * scale.scaleY).toBeCloseTo(1, 2);
  });

  it('stretches horizontally during STRIKE based on speed tier', () => {
    const scale = createDeformationScale();
    const expectedScaleX =
      1 + swimmerDeformationTuning.STRIKE_SPEED_FACTOR_CAP * 3;

    convergeToTarget(scale, MovementState.STRIKE, 500, 3);

    expect(scale.scaleX).toBeCloseTo(expectedScaleX, 2);
    expect(scale.scaleY).toBeCloseTo(1 / expectedScaleX, 2);
  });

  it('compresses horizontally during PIVOT_BRAKE', () => {
    const scale = createDeformationScale();
    convergeToTarget(scale, MovementState.PIVOT_BRAKE, 200, 2);

    expect(scale.scaleX).toBeCloseTo(
      swimmerDeformationTuning.PIVOT_BRAKE_SCALE_X,
      2
    );
    expect(scale.scaleY).toBeCloseTo(
      1 / swimmerDeformationTuning.PIVOT_BRAKE_SCALE_X,
      2
    );
  });

  it('applies IDLE buoyancy from the provided oscillation phase', () => {
    const phase = Math.PI / 2;
    const scale = createDeformationScale();
    convergeToTarget(scale, MovementState.IDLE, 0, 1, phase);

    const expectedScaleX =
      1 + Math.sin(phase) * swimmerDeformationTuning.IDLE_BUOYANCY_AMPLITUDE;
    expect(scale.scaleX).toBeCloseTo(expectedScaleX, 2);
    expect(scale.scaleY).toBeCloseTo(1 / expectedScaleX, 2);
  });

  it('interpolates toward targets over multiple dt steps', () => {
    const scale = createDeformationScale(1, 1);
    updateProceduralDeformation(scale, MovementState.PIVOT_BRAKE, 0, 1, 1 / 60);

    expect(scale.scaleX).toBeGreaterThan(
      swimmerDeformationTuning.PIVOT_BRAKE_SCALE_X
    );
    expect(scale.scaleX).toBeLessThan(1);
  });

  it('notifies the display sink with interpolated scales', () => {
    const sinkCalls: Array<{ scaleX: number; scaleY: number }> = [];
    const scale = createDeformationScale(1, 1);

    updateProceduralDeformation(
      scale,
      MovementState.PIVOT_BRAKE,
      0,
      1,
      1 / 60,
      0,
      {
        setScale: (scaleX, scaleY) => {
          sinkCalls.push({ scaleX, scaleY });
        },
      }
    );

    expect(sinkCalls.length).toBe(1);
    expect(sinkCalls[0].scaleX).toBe(scale.scaleX);
    expect(sinkCalls[0].scaleY).toBe(scale.scaleY);
  });

  it('returns neutral scale for GLIDE', () => {
    const scale = createDeformationScale(0.75, 1.333);
    convergeToTarget(scale, MovementState.GLIDE, 120, 2);

    expect(scale.scaleX).toBeCloseTo(1, 2);
    expect(scale.scaleY).toBeCloseTo(1, 2);
  });
});
