import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntity/useAddEntity';
import { useAddMatterBody } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddMatterBody/useAddMatterBody';
import { createRenderComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { CreateMatterBodyArgs } from '@/containers/ReactNativeSkiaGameEngine/internal/systems/physics/bodiesTypes';
import { FC, useMemo } from 'react';

export const SurferView: FC<{ x: number; y: number }> = ({ x, y }) => {
  const components = useMemo(
    () => [
      createRenderComponent({
        shape: { type: 'rectangle', width: 72, height: 72 },
        fillColor: '#0099ff',
        visible: true,
        image: 'surfer',
        sprite: {
          frameWidth: 1024 / 3, // 1024 / 16 = 64 (assuming 4x4 grid)
          frameHeight: 1024 / 3, // 1024 / 16 = 64
          totalFrames: 9,
          framesPerRow: 3, // 4x4 grid
          frameDuration: 120, // 100ms per frame for smooth animation
          loop: true,
        },
      }),
    ],
    []
  );

  const { entityId } = useAddEntity({ components });

  const matterBodyArgs: CreateMatterBodyArgs = useMemo(
    () => ({
      type: 'rectangle',
      options: {
        x,
        y,
        width: 1024 / 3,
        height: 1024 / 3,
        options: {
          isStatic: true,
          collisionFilter: {
            group: 0x0002, // Different collision group from ship
          },
        },
      },
    }),
    [x, y]
  );

  const { bodyId } = useAddMatterBody({ args: matterBodyArgs, entityId });

  return null;
};
