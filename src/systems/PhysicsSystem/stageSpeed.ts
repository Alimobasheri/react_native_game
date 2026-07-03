import { stageProgressionTuning } from '@/config/stageProgression';
import type { GameSessionComponentData } from '@/Game/ecs-components/GameSession';
import { isSessionSpeedRampActive } from '@/Game/session/beginGameplay';
import type { PacingDirectorPhase } from '@/Game/path/pacingDirector';

export const isReleaseRelaxPhase = (phase: PacingDirectorPhase): boolean => {
  'worklet';
  return phase === 'RELEASE';
};

export const shouldHoldStageConstantSpeed = (
  session: GameSessionComponentData | undefined,
  nowMs: number
): boolean => {
  'worklet';
  if (!session || session.phase !== 'playing') {
    return false;
  }
  if (isSessionSpeedRampActive(session, nowMs)) {
    return false;
  }
  return true;
};

export const computeRelaxAccelStep = (deltaSeconds: number): number => {
  'worklet';
  return stageProgressionTuning.STAGE_RELAX_ACCEL_PER_SECOND * deltaSeconds;
};
