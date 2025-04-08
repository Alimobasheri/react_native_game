import { FC, useCallback } from 'react';
import { Rect, SkRect } from '@shopify/react-native-skia';
import { useDerivedQuery } from '../../hooks-ecs/useDerivedQuery/useDerivedQuery';
import { DerivedTransform } from '../../hooks-ecs/useDerivedMemory/useDerivedMemory';
import { MatterBodyComponentName } from '../../internal/components/matterBody';

export type RenderEntityProps = {
  entityId: number;
};

export const RenderEntity: FC<RenderEntityProps> = ({ entityId }) => {
  const transformToRect: DerivedTransform<SkRect> = useCallback(
    (entities, components) => {
      'worklet';
      const component = components[MatterBodyComponentName].get(entityId);
      if (!component)
        return {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        };
      return {
        x: component.position.x,
        y: component.position.y,
        width: 100,
        height: 100,
      };
    },
    []
  );
  const rect = useDerivedQuery({
    key: `rect-${entityId}`,
    transform: transformToRect,
  });

  return <Rect rect={rect} color={'red'} />;
};
