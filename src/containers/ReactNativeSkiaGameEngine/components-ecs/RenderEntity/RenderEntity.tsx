import { FC, useCallback } from 'react';
import { PositionComponentName } from '../../internal/components/position';
import { Rect, SkRect } from '@shopify/react-native-skia';
import { useDerivedQuery } from '../../hooks-ecs/useDerivedQuery/useDerivedQuery';
import { useDerivedValue } from 'react-native-reanimated';
import { DerivedTransform } from '../../hooks-ecs/useDerivedMemory/useDerivedMemory';

export type RenderEntityProps = {
  entityId: number;
};

export const RenderEntity: FC<RenderEntityProps> = ({ entityId }) => {
  const transformToRect: DerivedTransform<SkRect> = useCallback(
    (entities, components) => {
      'worklet';
      return {
        x: components[PositionComponentName].get(entityId).x,
        y: components[PositionComponentName].get(entityId).y,
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
