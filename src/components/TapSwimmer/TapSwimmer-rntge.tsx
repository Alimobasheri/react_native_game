import { FC, useMemo } from 'react';
import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntity/useAddEntity';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createTapComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/touch';
import {
  SwimmerComponentData,
  SwimmerComponentName,
} from '@/Game/ecs-components/Swimmer';
import { applyTapInputToLocomotion } from '@/Game/characters/swimmerTapInput';
import '@/Game/characters/characterProfiles';
import { beginGameplay, dismissTutorial } from '@/Game/session/beginGameplay';
import {
  getGameSession,
  getGameSessionEntity,
} from '@/Game/session/gameSessionQuery';

/**
 * TapSwimmer - Full-screen tap overlay that controls swimmer direction for tap-based movement.
 * When the player taps the left half of the screen, the swimmer steers left.
 * When the player taps the right half, the swimmer steers right.
 * First tap while the start overlay is visible also begins gameplay.
 * The tap-left/right tutorial appears once play starts and fades after the first steer tap.
 */
export const TapSwimmer: FC<{
  screenWidth: number;
  screenHeight: number;
}> = ({ screenWidth, screenHeight }) => {
  const components = useMemo(
    () => [
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: screenWidth,
          height: screenHeight,
        },
        position: { x: screenWidth / 2, y: screenHeight / 2 },
        visible: true,
        fillColor: 'transparent',
        zIndex: 100,
      }),
      createTapComponent({
        onTap: (data) => {
          'worklet';
          const ecs = data.systemArgs.ecs;
          const session = getGameSession(ecs.components);
          const sessionEntity = getGameSessionEntity(ecs.components);

          if (session?.phase === 'game_over') {
            return;
          }

          if (
            session?.phase === 'start_ready' &&
            typeof sessionEntity === 'number'
          ) {
            beginGameplay(ecs, sessionEntity);
          } else if (session?.phase !== 'playing') {
            return;
          }

          const tapX = data.gesture?.data?.x ?? data.x ?? 0;
          const isLeftHalf = tapX < screenWidth / 2;
          const tapDirection = isLeftHalf ? -1 : 1;

          const swimmerEntities = ecs.getEntitiesWithComponents([
            SwimmerComponentName,
          ]);

          swimmerEntities.forEach((entityId) => {
            ecs.updateComponent(
              entityId,
              SwimmerComponentName,
              (swimmer: SwimmerComponentData) => {
                if (!swimmer.useColumnControl) return;
                applyTapInputToLocomotion(
                  swimmer.locomotion,
                  tapDirection,
                  data.timestamp ?? Date.now()
                );
                swimmer.locomotion.pendingTapDirection = tapDirection;
              }
            );
          });

          const sessionAfterSteer = getGameSession(ecs.components);
          if (
            sessionAfterSteer?.phase === 'playing' &&
            sessionAfterSteer.tutorialFadeStartMs <= 0 &&
            typeof sessionEntity === 'number'
          ) {
            dismissTutorial(ecs, sessionEntity);
          }
        },
      }),
    ],
    [screenWidth, screenHeight]
  );

  useAddEntity({ components });

  return null;
};
