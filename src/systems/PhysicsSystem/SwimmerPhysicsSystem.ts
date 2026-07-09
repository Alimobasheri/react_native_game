import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import { SwimmerComponentName } from '@/Game/ecs-components/Swimmer';
import '@/Game/characters/characterProfiles';
import {
  buildSwimmerFrameContext,
  processOneSwimmer,
  runInitialWaterRise,
} from '@/Game/swimmerPhysics';

/**
 * Swimmer frame orchestrator — context → water rise → per-swimmer pipeline.
 *
 * @see docs/game-design/swimmer-physics-flow.md
 */
export const SwimmerPhysicsSystem: System = {
  requiredComponents: [SwimmerComponentName],
  process: (ctx) => {
    'worklet';

    const frame = buildSwimmerFrameContext(ctx);
    if (!frame) {
      return;
    }

    runInitialWaterRise(frame);

    for (let i = 0; i < ctx.entities.length; i++) {
      processOneSwimmer({
        frame,
        swimmerEntity: ctx.entities[i],
        eventQueue: ctx.eventQueue,
        dimensions: ctx.dimensions,
      });
    }
  },
};
