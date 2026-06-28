import type { GameSessionComponentData } from '@/Game/ecs-components/GameSession';
import { isGameOverPhase, isStartReady } from '@/Game/session/gameSessionQuery';

export const isGameplayJuiceActive = (
  session: GameSessionComponentData | undefined,
  isInInitialPhase: boolean,
  tutorialOpacity: number,
  enabled: boolean
): boolean => {
  'worklet';
  if (!enabled) return false;
  if (!session) return false;
  if (isInInitialPhase) return false;
  if (isStartReady(session)) return false;
  if (isGameOverPhase(session)) return false;
  if (session.phase !== 'playing') return false;
  if ((session.overlayOpacity ?? 1) > 0.01) return false;
  if (tutorialOpacity > 0.01) return false;
  return true;
};
