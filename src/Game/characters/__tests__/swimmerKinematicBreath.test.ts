import { VisualStrokePhase } from '@/Game/characters/visualStrokePhase';
import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';
import type { SwimmerLocomotionData } from '@/Game/ecs-components/Swimmer';
import {
  computeKinematicBreath,
  syncBreathStageTransition,
  timerProgress,
} from '../life/swimmerKinematicBreath';
import { createDefaultSwimmerLocomotion } from '../swimmerLocomotionDefaults';

const makeLocomotion = (
  overrides: Partial<SwimmerLocomotionData> = {}
): SwimmerLocomotionData => ({
  ...createDefaultSwimmerLocomotion(),
  ...overrides,
});

describe('swimmerKinematicBreath', () => {
  it('charges during anticipation without exhaling', () => {
    const locomotion = makeLocomotion({
      visualPhase: VisualStrokePhase.ANTICIPATION,
      visualAnticipationTimer: swimmerVisualTuning.ANTICIPATION_DURATION_SEC,
      breathFillLevel: 0.1,
      breathStageStartFill: 0.1,
      breathTrackedVisualPhase: VisualStrokePhase.ANTICIPATION,
    });

    const start = computeKinematicBreath(locomotion, 0).breath;
    locomotion.visualAnticipationTimer = 0;
    const end = computeKinematicBreath(locomotion, 0).breath;

    expect(start).toBeCloseTo(0.1, 2);
    expect(end).toBeGreaterThan(0.95);
  });

  it('holds full breath during stroke', () => {
    const locomotion = makeLocomotion({
      visualPhase: VisualStrokePhase.STROKE,
      visualStrokeTimer: swimmerVisualTuning.STROKE_DURATION_SEC * 0.5,
      breathTrackedVisualPhase: VisualStrokePhase.STROKE,
    });

    expect(computeKinematicBreath(locomotion, 0).breath).toBe(1);
  });

  it('slowly drains during glide', () => {
    const locomotion = makeLocomotion({
      visualPhase: VisualStrokePhase.GLIDE,
      visualGlideSettleTimer: swimmerVisualTuning.GLIDE_VISUAL_SETTLE_SEC,
      breathFillLevel: 1,
      breathStageStartFill: 1,
      breathTrackedVisualPhase: VisualStrokePhase.GLIDE,
    });

    const start = computeKinematicBreath(locomotion, 0).breath;
    locomotion.visualGlideSettleTimer = 0;
    const end = computeKinematicBreath(locomotion, 0).breath;

    expect(start).toBeCloseTo(1, 2);
    expect(end).toBeLessThan(0.35);
    expect(end).toBeGreaterThan(0.2);
  });

  it('quickly exhales on pivot then adds a tiny gasp catch', () => {
    const locomotion = makeLocomotion({
      visualPhase: VisualStrokePhase.PIVOT,
      visualPivotTimer: swimmerVisualTuning.PIVOT_VISUAL_DURATION_SEC,
      breathFillLevel: 0.8,
      breathStageStartFill: 0.8,
      breathTrackedVisualPhase: VisualStrokePhase.PIVOT,
    });

    const start = computeKinematicBreath(locomotion, 0).breath;
    locomotion.visualPivotTimer =
      swimmerVisualTuning.PIVOT_VISUAL_DURATION_SEC * 0.5;
    const mid = computeKinematicBreath(locomotion, 0).breath;
    locomotion.visualPivotTimer = 0;
    const end = computeKinematicBreath(locomotion, 0).breath;

    expect(start).toBeCloseTo(0.8, 2);
    expect(mid).toBeLessThan(0.2);
    expect(end).toBeGreaterThan(mid);
    expect(end).toBeLessThan(0.25);
  });

  it('latches start fill when visual phase changes', () => {
    const locomotion = makeLocomotion({
      visualPhase: VisualStrokePhase.GLIDE,
      visualGlideSettleTimer: swimmerVisualTuning.GLIDE_VISUAL_SETTLE_SEC,
      breathFillLevel: 0.72,
    });

    syncBreathStageTransition(locomotion);
    expect(locomotion.breathStageStartFill).toBe(0.72);
    expect(locomotion.breathTrackedVisualPhase).toBe(VisualStrokePhase.GLIDE);
  });

  it('keeps stroke committed near full breath', () => {
    const locomotion = makeLocomotion({
      visualPhase: VisualStrokePhase.STROKE,
      visualStrokeTimer: swimmerVisualTuning.STROKE_DURATION_SEC * 0.5,
      breathFillLevel: 1,
      breathTrackedVisualPhase: VisualStrokePhase.STROKE,
    });

    expect(computeKinematicBreath(locomotion, 0).breath).toBeGreaterThan(0.94);
  });
});

describe('timerProgress', () => {
  it('maps remaining timer to 0→1 progress', () => {
    expect(timerProgress(1, 1)).toBe(0);
    expect(timerProgress(0, 1)).toBe(1);
    expect(timerProgress(0.5, 1)).toBe(0.5);
  });
});
