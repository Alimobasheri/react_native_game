import { swimmerPhysicsTuning } from '@/config/swimmerTuning';

/**
 * Mirrors SwimmerPhysicsSystem water-advection gate while pinned.
 */
export const computePinnedWaterCurrentResponse = (
  pinned: boolean,
  tapThisFrame: boolean,
  blockAdvection: boolean,
  baseResponse: number
): number => {
  'worklet';
  if (blockAdvection && pinned && !tapThisFrame) {
    return 0;
  }
  if (pinned && tapThisFrame) {
    return baseResponse * swimmerPhysicsTuning.PINNED_TAP_WATER_CURRENT_SCALE;
  }
  return baseResponse;
};
