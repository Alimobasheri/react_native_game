import {
  ContainerComponentName,
  type ContainerComponentData,
} from '@/Game/ecs-components/Container';
import {
  SwimmerComponentName,
  type SwimmerComponentData,
} from '@/Game/ecs-components/Swimmer';
import type { SwimmerFrameContext } from '@/Game/swimmerPhysics/types';

/**
 * Water rises until the rest line — then all swimmers enter platformer phase together.
 *
 * @see docs/game-design/swimmer-physics-flow.md#game-phases
 */
export const runInitialWaterRise = (frame: SwimmerFrameContext): void => {
  'worklet';

  if (!frame.isInInitialPhase || frame.startReady) {
    return;
  }

  const newWaterSurfaceY =
    frame.container.waterSurfaceY - frame.water.raisingSpeed * frame.deltaSeconds;
  const constrainedWaterY = Math.max(newWaterSurfaceY, frame.waterSurfaceRestY);
  const hasReachedRest = constrainedWaterY <= frame.waterSurfaceRestY;

  frame.ecs.updateComponent<ContainerComponentData>(
    frame.containerEntity,
    ContainerComponentName,
    (container) => {
      container.waterSurfaceY = constrainedWaterY;
    }
  );

  if (hasReachedRest) {
    frame.entities.forEach((swimmerEntity) => {
      frame.ecs.updateComponent<SwimmerComponentData>(
        swimmerEntity,
        SwimmerComponentName,
        (swimmer) => {
          swimmer.isInInitialPhase = false;
        }
      );
    });
  }
};
