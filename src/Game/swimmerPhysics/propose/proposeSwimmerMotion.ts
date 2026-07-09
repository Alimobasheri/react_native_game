import type { EventQueueContextType } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useEventQueue/useEventQueue';
import { computeBobbingAndBuoyancy } from '@/Game/swimmerPhysics/propose/bobbingBuoyancy';
import { applyHorizontalLocomotion } from '@/Game/swimmerPhysics/propose/horizontalLocomotion';
import { applyWaterAdvection } from '@/Game/swimmerPhysics/propose/waterAdvection';
import { integrateVerticalAndSurfaceFollow } from '@/Game/swimmerPhysics/propose/verticalSurfaceFollow';
import type {
  ProposeMotionResult,
  SwimmerFrameContext,
  SwimmerSnapshot,
} from '@/Game/swimmerPhysics/types';

/**
 * Propose stage: bob → tap/pan → current → surface — no collision yet.
 *
 * @see docs/game-design/swimmer-physics-flow.md#per-frame-pipeline
 */
export const proposeSwimmerMotion = (
  frame: SwimmerFrameContext,
  swimmer: SwimmerSnapshot,
  eventQueue: EventQueueContextType
): ProposeMotionResult => {
  'worklet';

  const buoyancy = computeBobbingAndBuoyancy(frame, swimmer);
  const horizontal = applyHorizontalLocomotion(frame, swimmer, buoyancy, eventQueue);
  const advection = applyWaterAdvection(swimmer, horizontal, frame.deltaSeconds);
  const surface = integrateVerticalAndSurfaceFollow(
    frame,
    swimmer,
    buoyancy,
    horizontal,
    advection
  );

  return {
    ...buoyancy,
    ...horizontal,
    ...advection,
    ...surface,
    velocityX: advection.velocityX,
  };
};
