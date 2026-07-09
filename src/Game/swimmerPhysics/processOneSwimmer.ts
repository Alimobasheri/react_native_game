import { applyWallBump } from '@/Game/swimmerPhysics/react/wallBump';
import { evaluateGameOver } from '@/Game/swimmerPhysics/react/gameOver';
import {
  commitStartReadyPose,
  commitSwimmerGameplayState,
} from '@/Game/swimmerPhysics/react/commitFrame';
import { proposeSwimmerMotion } from '@/Game/swimmerPhysics/propose/proposeSwimmerMotion';
import { resolveSwimmerCollision } from '@/Game/swimmerPhysics/resolve/collisionResolution';
import { SwimmerComponentName, type SwimmerComponentData } from '@/Game/ecs-components/Swimmer';
import type {
  CollisionResolutionStep,
  ProcessOneSwimmerArgs,
  ProposeMotionResult,
  SwimmerSnapshot,
} from '@/Game/swimmerPhysics/types';

/**
 * React stage: wall bump → game over check → commit components.
 *
 * @see docs/game-design/swimmer-physics-flow.md#per-frame-pipeline
 */
export const reactSwimmerOutcome = (
  args: ProcessOneSwimmerArgs & { swimmer: SwimmerSnapshot },
  proposed: ProposeMotionResult,
  collision: CollisionResolutionStep
): void => {
  'worklet';

  const wallBump = applyWallBump(
    args.frame,
    args.swimmer,
    proposed,
    collision,
    args.eventQueue
  );
  const gameOver = evaluateGameOver(
    args.frame,
    args.swimmer,
    proposed,
    collision,
    args.dimensions,
    args.frame.ecs,
    args.frame.components
  );
  commitSwimmerGameplayState(
    args.frame.ecs,
    args.swimmer,
    proposed,
    collision,
    wallBump,
    gameOver
  );
};

/**
 * One swimmer frame: propose motion → resolve collision → react outcome.
 *
 * @see docs/game-design/swimmer-physics-flow.md#per-frame-pipeline
 */
export const processOneSwimmer = (args: ProcessOneSwimmerArgs): void => {
  'worklet';

  const swimmerComponent = args.frame.components[SwimmerComponentName].get(
    args.swimmerEntity
  ) as SwimmerComponentData | undefined;
  if (!swimmerComponent) {
    return;
  }

  const waterSpeed = args.frame.water.raisingSpeed ?? 0;
  const swimmer: SwimmerSnapshot = {
    entity: args.swimmerEntity,
    component: swimmerComponent,
    centerX: swimmerComponent.x,
    centerY: swimmerComponent.y,
    wasPinnedFromAbove: swimmerComponent.isPinnedFromAbove === true,
    normalizedSpeed: Math.max(0, Math.min(waterSpeed / 120, 1)),
    waterSpeed,
  };

  const proposed = proposeSwimmerMotion(args.frame, swimmer, args.eventQueue);

  if (args.frame.startReady) {
    commitStartReadyPose(args.frame.ecs, swimmer, proposed);
    return;
  }

  const collision = resolveSwimmerCollision(
    args.frame,
    swimmer,
    proposed,
    args.eventQueue
  );

  reactSwimmerOutcome({ ...args, swimmer }, proposed, collision);
};
