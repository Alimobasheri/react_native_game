import { FC, useMemo } from 'react';
import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntity/useAddEntity';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createTapComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/touch';
import { createKeyboardComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/keyboard';
import type { SystemProcessArgs } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  SwimmerComponentData,
  SwimmerComponentName,
} from '@/Game/ecs-components/Swimmer';
import { applyTapInputToLocomotion } from '@/Game/characters/swimmerTapInput';
import {
  keyToTapDirection,
  SWIMMER_KEYBOARD_KEYS,
} from '@/Game/characters/swimmerKeyInput';
import '@/Game/characters/characterProfiles';
import { beginGameplay, dismissTutorial } from '@/Game/session/beginGameplay';
import {
  getGameSession,
  getGameSessionEntity,
} from '@/Game/session/gameSessionQuery';

const steerFromDirection = (
  systemArgs: SystemProcessArgs,
  tapDirection: 1 | -1,
  timestamp: number
) => {
  'worklet';
  const ecs = systemArgs.ecs;
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
          timestamp
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
};

/**
 * TapSwimmer - Full-screen tap overlay that controls swimmer direction for tap-based movement.
 * When the player taps the left half of the screen, the swimmer steers left.
 * When the player taps the right half, the swimmer steers right.
 * ArrowLeft / A and ArrowRight / D map to the same left / right steering impulses.
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
          const tapX = data.gesture?.data?.x ?? data.x ?? 0;
          const isLeftHalf = tapX < screenWidth / 2;
          const tapDirection = isLeftHalf ? -1 : 1;
          steerFromDirection(
            data.systemArgs,
            tapDirection,
            data.timestamp ?? Date.now()
          );
        },
      }),
      createKeyboardComponent({
        keys: [...SWIMMER_KEYBOARD_KEYS],
        onKeyDown: (data) => {
          'worklet';
          const tapDirection = keyToTapDirection(data.key);
          if (tapDirection === null) {
            return;
          }
          steerFromDirection(
            data.systemArgs,
            tapDirection,
            data.timestamp ?? Date.now()
          );
        },
      }),
    ],
    [screenWidth, screenHeight]
  );

  useAddEntity({ components });

  return null;
};
