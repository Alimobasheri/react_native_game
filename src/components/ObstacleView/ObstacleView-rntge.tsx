import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntity/useAddEntity';
import { useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddSystem/useAddSystem';
import { ObstacleSystem } from '@/systems/PhysicsSystem/ObstacleSystem';
import { useSceneContextUnsafe } from '@/containers/ReactNativeSkiaGameEngine/components-rntge/Scene/hooks';
import { createObstaclesManagerComponent } from '@/Game/ecs-components/ObstaclesManager';
import { FC } from 'react';
import type {
  StoryLockedProceduralSegment,
  StoryLockedShaftRecipe,
} from '@/Game/ecs-systems/obstacleSystem';

/**
 * ObstacleView - Component that manages dynamic obstacles for the swimmer game
 *
 * This component registers the ObstacleSystem which handles:
 * - Spawning obstacles in a grid pattern
 * - Moving obstacles downward
 * - Removing obstacles that pass screen boundaries
 */
export const ObstacleView: FC<{
  /**
   * Forces a specific `RowPathTemplate` key from `ObstacleSystem` (e.g. `smily`, `base`, `directed`).
   * When omitted, the game uses the `directed` template (phase-driven base vs baseMulti); JSON shapes
   * are never auto-selected.
   */
  lockedTemplateName?: string;
  /**
   * Storybook: repeat one procedural branch from the multipath template (funnel, pinball, …).
   * Requires `lockedTemplateName` `directed` or `baseMulti`.
   */
  storyLockedProceduralSegment?: StoryLockedProceduralSegment;
  /** Lock one platform-shaft composer loop — Slice 3 consumes in ObstacleSystem. */
  storyLockedShaftRecipe?: StoryLockedShaftRecipe;
  storyLockedShaftSeed?: number;
  storyLockedShaftDifficulty?: number;
  storyLockShaftLoop?: boolean;
}> = ({
  lockedTemplateName,
  storyLockedProceduralSegment,
  storyLockedShaftRecipe,
  storyLockedShaftSeed,
  storyLockedShaftDifficulty,
  storyLockShaftLoop,
}) => {
  const sceneContext = useSceneContextUnsafe();
  const sceneKey = sceneContext?.sceneKey ?? 'swimmerGame';

  // Obstacles manager entity (stores spawn timer/state inside ECS, not globals)
  useAddEntity({
    components: [
      createObstaclesManagerComponent({
        sceneKey,
        spawnTimerSeconds: 0,
        totalRowsGenerated: 0,
        lockedTemplateName,
        storyLockedProceduralSegment,
        storyLockedShaftRecipe,
        storyLockedShaftSeed,
        storyLockedShaftDifficulty,
        storyLockShaftLoop,
      }),
    ],
  });

  // Register the obstacle system (includes grid-anchored hazard motion pass)
  useAddSystem({ system: ObstacleSystem });

  return null;
};
