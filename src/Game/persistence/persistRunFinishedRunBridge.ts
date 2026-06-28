/**
 * RN-thread bridge — do not import this from worklet modules that must stay UI-pure.
 * SwimmerPhysicsSystem calls this via scheduleOnRN only.
 */
import { persistRunFinishedRun } from '@/Game/persistence/runProgressionStorage';

export function persistRunFinishedRunBridge(
  finalScore: number,
  isNewBest: boolean
): void {
  persistRunFinishedRun({ finalScore, isNewBest }).catch(() => undefined);
}
