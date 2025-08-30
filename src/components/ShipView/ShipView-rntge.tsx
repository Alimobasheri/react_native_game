import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntity/useAddEntity';
import { useAddMatterBody } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddMatterBody/useAddMatterBody';
import { createRenderComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { CreateMatterBodyArgs } from '@/containers/ReactNativeSkiaGameEngine/internal/systems/physics/bodiesTypes';
import { FC, useMemo } from 'react';

export const ShipView: FC<{ x: number }> = ({ x }) => {
  const components = useMemo(
    () => [
      createRenderComponent({
        shape: { type: 'rectangle', width: 100, height: 100 },
        fillColor: '#ff0000',
        visible: true,
        image: 'ship',
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
        y: 100,
        width: 100,
        height: 100,
        options: {
          collisionFilter: {
            group: 0x0001,
          },
        },
      },
    }),
    []
  );
  const { bodyId } = useAddMatterBody({ args: matterBodyArgs, entityId });
  return null;
};
