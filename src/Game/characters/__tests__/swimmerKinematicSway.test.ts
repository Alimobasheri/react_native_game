import { MovementState } from '@/Game/characters/characterMovementStates';
import { VisualStrokePhase } from '@/Game/characters/visualStrokePhase';
import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';
import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';
import type { SwimmerLocomotionData } from '@/Game/ecs-components/Swimmer';
import {
  computeKinematicSway,
  syncSwayStageTransition,
  updateSwayDirectionLag,
} from '../life/swimmerKinematicSway';
import { createDefaultSwimmerLocomotion } from '../swimmerLocomotionDefaults';

const makeLocomotion = (
  overrides: Partial<SwimmerLocomotionData> = {}
): SwimmerLocomotionData => ({
  ...createDefaultSwimmerLocomotion(),
  ...overrides,
});

describe('swimmerKinematicSway', () => {
  it('damps amplitude during anticipation', () => {
    const locomotion = makeLocomotion({
      visualPhase: VisualStrokePhase.ANTICIPATION,
      visualAnticipationTimer: swimmerVisualTuning.ANTICIPATION_DURATION_SEC,
      swayAmplitudeLevel: 0.8,
      swayStageStartAmplitude: 0.8,
      swayTrackedVisualPhase: VisualStrokePhase.ANTICIPATION,
    });

    const start = computeKinematicSway(locomotion).amplitudeScale;
    locomotion.visualAnticipationTimer = 0;
    const end = computeKinematicSway(locomotion).amplitudeScale;

    expect(start).toBeCloseTo(0.8, 2);
    expect(end).toBeCloseTo(swimmerLifeTuning.KINEMATIC_KELP_ANTICIPATION_AMPLITUDE, 2);
    expect(end).toBeLessThan(start);
  });

  it('spikes amplitude during stroke', () => {
    const locomotion = makeLocomotion({
      visualPhase: VisualStrokePhase.STROKE,
      visualStrokeTimer: swimmerVisualTuning.STROKE_DURATION_SEC * 0.5,
      swayTrackedVisualPhase: VisualStrokePhase.STROKE,
    });

    expect(computeKinematicSway(locomotion).amplitudeScale).toBeCloseTo(
      swimmerLifeTuning.KINEMATIC_KELP_STROKE_AMPLITUDE,
      2
    );
    expect(computeKinematicSway(locomotion).speedScale).toBe(
      swimmerLifeTuning.KINEMATIC_KELP_STROKE_SPEED_SCALE
    );
  });

  it('slowly settles amplitude during glide', () => {
    const locomotion = makeLocomotion({
      visualPhase: VisualStrokePhase.GLIDE,
      visualGlideSettleTimer: swimmerVisualTuning.GLIDE_VISUAL_SETTLE_SEC,
      swayAmplitudeLevel: 1.2,
      swayStageStartAmplitude: 1.2,
      swayTrackedVisualPhase: VisualStrokePhase.GLIDE,
    });

    const start = computeKinematicSway(locomotion).amplitudeScale;
    locomotion.visualGlideSettleTimer = 0;
    const end = computeKinematicSway(locomotion).amplitudeScale;

    expect(start).toBeCloseTo(1.2, 2);
    expect(end).toBeCloseTo(swimmerLifeTuning.KINEMATIC_KELP_GLIDE_AMPLITUDE, 2);
    expect(end).toBeLessThan(start);
  });

  it('whips then settles during pivot', () => {
    const locomotion = makeLocomotion({
      visualPhase: VisualStrokePhase.PIVOT,
      visualPivotTimer: swimmerVisualTuning.PIVOT_VISUAL_DURATION_SEC,
      swayAmplitudeLevel: 0.7,
      swayStageStartAmplitude: 0.7,
      swayTrackedVisualPhase: VisualStrokePhase.PIVOT,
    });

    const start = computeKinematicSway(locomotion).amplitudeScale;
    locomotion.visualPivotTimer =
      swimmerVisualTuning.PIVOT_VISUAL_DURATION_SEC * 0.2;
    const mid = computeKinematicSway(locomotion).amplitudeScale;
    locomotion.visualPivotTimer = 0;
    const end = computeKinematicSway(locomotion).amplitudeScale;

    expect(start).toBeCloseTo(0.7, 2);
    expect(mid).toBeGreaterThan(start);
    expect(end).toBeLessThan(mid);
  });

  it('lags direction bias toward velocity', () => {
    const locomotion = makeLocomotion({
      visualPhase: VisualStrokePhase.STROKE,
      visualStrokeDirection: 1,
      swayTrackedVisualPhase: VisualStrokePhase.STROKE,
    });

    for (let i = 0; i < 30; i++) {
      updateSwayDirectionLag(locomotion, 220, 1 / 60);
    }

    expect(locomotion.swayBiasState?.laggedBias ?? 0).toBeGreaterThan(0.2);
  });

  it('latches start amplitude when visual phase changes', () => {
    const locomotion = makeLocomotion({
      visualPhase: VisualStrokePhase.GLIDE,
      visualGlideSettleTimer: swimmerVisualTuning.GLIDE_VISUAL_SETTLE_SEC,
      swayAmplitudeLevel: 0.88,
    });

    syncSwayStageTransition(locomotion);
    expect(locomotion.swayStageStartAmplitude).toBe(0.88);
    expect(locomotion.swayTrackedVisualPhase).toBe(VisualStrokePhase.GLIDE);
  });

  it('keeps drag committed near stroke amplitude', () => {
    const locomotion = makeLocomotion({
      movementState: MovementState.DRAG,
      visualPhase: VisualStrokePhase.STROKE,
      swayAmplitudeLevel: 1.2,
      swayTrackedVisualPhase: VisualStrokePhase.STROKE,
    });

    expect(computeKinematicSway(locomotion).amplitudeScale).toBeGreaterThan(1.1);
  });
});
