import { MovementState } from '../characterMovementStates';
import {
  createDeformationScale,
  updateProceduralDeformation,
} from '../proceduralDeformationEngine';
import { swimmerDeformationTuning } from '@/config/swimmerDeformationTuning';

const convergeToTarget = (
  scale: ReturnType<typeof createDeformationScale>,
  state: MovementState | 'PINNED',
  idlePhase = 0
) => {
  for (let i = 0; i < 120; i++) {
    updateProceduralDeformation(scale, state, 1 / 30, idlePhase);
  }
  return scale;
};

describe('updateProceduralDeformation', () => {
  it('widens slightly during ANTICIPATION (rigid load)', () => {
    const scale = createDeformationScale();
    convergeToTarget(scale, MovementState.ANTICIPATION, 0);

    expect(scale.scaleX).toBeCloseTo(
      swimmerDeformationTuning.ANTICIPATION_SCALE_X,
      2
    );
    expect(scale.scaleY).toBeCloseTo(
      swimmerDeformationTuning.ANTICIPATION_SCALE_Y,
      2
    );
  });

  it('keeps STRIKE deformation minimal', () => {
    const scale = createDeformationScale();
    convergeToTarget(scale, MovementState.STRIKE, 0);

    expect(scale.scaleX).toBeCloseTo(
      swimmerDeformationTuning.STRIKE_SCALE_X,
      2
    );
    expect(scale.scaleY).toBeCloseTo(
      swimmerDeformationTuning.STRIKE_SCALE_Y,
      2
    );
  });

  it('compresses horizontally during PIVOT_BRAKE', () => {
    const scale = createDeformationScale();
    convergeToTarget(scale, MovementState.PIVOT_BRAKE, 0);

    expect(scale.scaleX).toBeCloseTo(
      swimmerDeformationTuning.PIVOT_BRAKE_SCALE_X,
      2
    );
    expect(scale.scaleY).toBeCloseTo(
      swimmerDeformationTuning.PIVOT_BRAKE_SCALE_Y,
      2
    );
  });

  it('squashes comically when PINNED', () => {
    const scale = createDeformationScale();
    convergeToTarget(scale, 'PINNED', 0);

    expect(scale.scaleX).toBeCloseTo(
      swimmerDeformationTuning.PINNED_SCALE_X,
      2
    );
    expect(scale.scaleY).toBeCloseTo(
      swimmerDeformationTuning.PINNED_SCALE_Y,
      2
    );
  });

  it('applies IDLE buoyancy from the provided oscillation phase', () => {
    const phase = Math.PI / 2;
    const scale = createDeformationScale();
    convergeToTarget(scale, MovementState.IDLE, phase);

    const expectedScaleX =
      1 + Math.sin(phase) * swimmerDeformationTuning.IDLE_BUOYANCY_AMPLITUDE;
    expect(scale.scaleX).toBeCloseTo(expectedScaleX, 2);
  });

  it('interpolates toward targets over multiple dt steps', () => {
    const scale = createDeformationScale(1, 1);
    updateProceduralDeformation(scale, MovementState.PIVOT_BRAKE, 1 / 60);

    expect(scale.scaleX).toBeGreaterThan(1);
    expect(scale.scaleX).toBeLessThan(
      swimmerDeformationTuning.PIVOT_BRAKE_SCALE_X + 0.05
    );
  });

  it('notifies the display sink with interpolated scales', () => {
    const sinkCalls: Array<{ scaleX: number; scaleY: number }> = [];
    const scale = createDeformationScale(1, 1);

    updateProceduralDeformation(
      scale,
      MovementState.PIVOT_BRAKE,
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
    convergeToTarget(scale, MovementState.GLIDE, 0);

    expect(scale.scaleX).toBeCloseTo(1, 2);
    expect(scale.scaleY).toBeCloseTo(1, 2);
  });
});
