import { FC, useMemo } from 'react';
import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntity/useAddEntity';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createTapComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/touch';
import { SwimmerComponentName } from '@/Game/ecs-components/Swimmer';
import { LAYOUT_CONSTANTS } from '@/Layout';

/**
 * TapSwimmer - Full-screen tap overlay that moves column-controlled swimmers.
 * When the player taps the left half of the screen, the swimmer moves one column left.
 * When the player taps the right half, the swimmer moves one column right.
 * Use together with SwimmerView with useColumnControl={true} and initialColumn set.
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
        // Touch hit-testing is center-based (same as render transforms).
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
          const delta = isLeftHalf ? -1 : 1;

          const ecs = data.systemArgs.ecs.value;
          const swimmerEntities = ecs.getEntitiesWithComponents([
            SwimmerComponentName,
          ]);

          swimmerEntities.forEach((entityId) => {
            ecs.updateComponent(
              entityId,
              SwimmerComponentName,
              (swimmer: { useColumnControl?: boolean; column?: number }) => {
                if (!swimmer.useColumnControl) return;
                const current = swimmer.column ?? Math.floor(LAYOUT_CONSTANTS.COLUMNS / 2);
                const next = current + delta;
                swimmer.column = Math.max(
                  0,
                  Math.min(LAYOUT_CONSTANTS.COLUMNS - 1, next)
                );
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
