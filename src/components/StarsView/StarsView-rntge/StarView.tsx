import { RenderEntity } from '@/containers/ReactNativeSkiaGameEngine/components-ecs/RenderEntity/RenderEntity';
import { useAddMatterBody } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddMatterBody/useAddMatterBody';
import {
  Component,
  useAddEntity,
} from '@/containers/ReactNativeSkiaGameEngine/index-rntge';
import { createRenderComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { CreateMatterBodyArgs } from '@/containers/ReactNativeSkiaGameEngine/internal/systems/physics/bodiesTypes';
import { createStarComponentJS } from '@/data-components/StarComponent';
import { Circle } from '@shopify/react-native-skia';
import { useMemo } from 'react';

export interface StarViewProps {
  cx: number;
  cy: number;
  r: number;
  fill: string;
}

export const StarView = ({ cx, cy, r, fill }: StarViewProps) => {
  const components = useMemo(() => {
    return [
      createStarComponentJS({ cx, cy, radius: r, color: fill }),
      createRenderComponent({
        color: fill,
      }),
    ];
  }, [cx, cy, r, fill]);
  const { entityId } = useAddEntity({ components });
  const matterBodyArgs: CreateMatterBodyArgs = useMemo(
    () => ({
      type: 'circle',
      options: {
        id: entityId,
        x: cx,
        y: cy,
        radius: r,
        options: {
          // frictionAir: 0.1,
          isStatic: true,
          render: {
            visible: true,
            fillStyle: fill,
          },
          collisionFilter: {
            group: 0x0002,
          },
        },
      },
    }),
    [entityId, cx, cy, r]
  );
  const { bodyId } = useAddMatterBody({ args: matterBodyArgs, entityId });
  // if (!entityId || !bodyId) return null;
  // return <RenderEntity entityId={entityId} />;
  return null;
};
