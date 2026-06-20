import { FC, useMemo } from 'react';
import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntity/useAddEntity';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createTapComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/touch';
import { SwimmerComponentName } from '@/Game/ecs-components/Swimmer';
import { beginGameplay } from '@/Game/session/beginGameplay';
import {
  getGameSession,
  getGameSessionEntity,
} from '@/Game/session/gameSessionQuery';
import { tapInputTuning } from '@/config/swimmerTuning';

/**
 * TapSwimmer - Full-screen tap overlay that controls swimmer direction for tap-based movement.
 * When the player taps the left half of the screen, the swimmer steers left.
 * When the player taps the right half, the swimmer steers right.
 * First tap while the start overlay is visible also begins gameplay.
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
          const inputX = isLeftHalf ? -1 : 1;

          const swimmerEntities = ecs.getEntitiesWithComponents([
            SwimmerComponentName,
          ]);

          swimmerEntities.forEach((entityId) => {
            ecs.updateComponent(
              entityId,
              SwimmerComponentName,
              (swimmer: {
                useColumnControl?: boolean;
                inputX?: number;
                lastTapTimeMs?: number;
                lastTapDirection?: -1 | 1;
                rapidTapStreak?: number;
                pendingTapMultiplier?: number;
              }) => {
                if (!swimmer.useColumnControl) return;
                const nowMs = data.timestamp ?? Date.now();
                const previousTapTimeMs = swimmer.lastTapTimeMs;
                const previousTapDirection = swimmer.lastTapDirection;
                const deltaMs =
                  previousTapTimeMs === undefined
                    ? Number.POSITIVE_INFINITY
                    : nowMs - previousTapTimeMs;
                const isRapidSameDirectionTap =
                  previousTapDirection === inputX &&
                  deltaMs >= 0 &&
                  deltaMs <= tapInputTuning.RAPID_TAP_WINDOW_MS;
                const streak = isRapidSameDirectionTap
                  ? (swimmer.rapidTapStreak ?? 0) + 1
                  : 0;
                const streakStepMult =
                  tapInputTuning.RAPID_TAP_STEP_MULT *
                  (1 + streak * tapInputTuning.RAPID_TAP_STREAK_ACCEL);
                const tapMultiplier = Math.min(
                  tapInputTuning.RAPID_TAP_MAX_MULT,
                  1 + streak * streakStepMult
                );

                swimmer.inputX = inputX;
                swimmer.lastTapTimeMs = nowMs;
                swimmer.lastTapDirection = inputX;
                swimmer.rapidTapStreak = streak;
                swimmer.pendingTapMultiplier = tapMultiplier;
              }
            );
          });
        },
      }),
    ],
    [screenWidth, screenHeight]
  );

  useAddEntity({ components });

  return null;
};
