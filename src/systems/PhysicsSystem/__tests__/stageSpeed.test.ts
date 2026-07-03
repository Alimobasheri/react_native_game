import {
  computeRelaxTargetSpeed,
  computeStageConstantSpeed,
  stageProgressionTuning,
} from '@/config/stageProgression';
import type { GameSessionComponentData } from '@/Game/ecs-components/GameSession';
import {
  computeRelaxAccelStep,
  shouldHoldStageConstantSpeed,
} from '@/systems/PhysicsSystem/stageSpeed';

describe('stageSpeed', () => {
  it('computeStageConstantSpeed uses base + increment per stage', () => {
    expect(computeStageConstantSpeed(300, 1)).toBe(300);
    expect(computeStageConstantSpeed(300, 2)).toBe(
      300 + stageProgressionTuning.STAGE_SPEED_INCREMENT
    );
    expect(computeStageConstantSpeed(300, 3)).toBe(
      300 + stageProgressionTuning.STAGE_SPEED_INCREMENT * 2
    );
  });

  it('computeRelaxAccelStep scales with delta time', () => {
    expect(computeRelaxAccelStep(1)).toBe(
      stageProgressionTuning.STAGE_RELAX_ACCEL_PER_SECOND
    );
    expect(computeRelaxAccelStep(0.5)).toBe(
      stageProgressionTuning.STAGE_RELAX_ACCEL_PER_SECOND * 0.5
    );
  });

  it('shouldHoldStageConstantSpeed is false during session speed ramp', () => {
    const rampingSession: GameSessionComponentData = {
      phase: 'playing',
      speedRampStartMs: 1000,
      gameplayRaisingSpeed: 300,
      visualRaisingSpeed: 90,
    } as GameSessionComponentData;

    expect(shouldHoldStageConstantSpeed(rampingSession, 1100)).toBe(false);
    expect(shouldHoldStageConstantSpeed(rampingSession, 1500)).toBe(true);
  });

  it('computeRelaxTargetSpeed is next stage constant hold', () => {
    expect(computeRelaxTargetSpeed(350, 1)).toBe(352);
    expect(computeRelaxTargetSpeed(350, 2)).toBe(354);
  });

  it('shouldHoldStageConstantSpeed is false in start_ready and game_over', () => {
    expect(
      shouldHoldStageConstantSpeed({ phase: 'start_ready' } as GameSessionComponentData, 0)
    ).toBe(false);
    expect(
      shouldHoldStageConstantSpeed({ phase: 'game_over' } as GameSessionComponentData, 0)
    ).toBe(false);
  });
});
