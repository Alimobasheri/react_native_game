import { RenderEntity } from '@/containers/ReactNativeSkiaGameEngine/components-ecs/RenderEntity/RenderEntity';
import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntity/useAddEntity';
import { useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddSystem/useAddSystem';
import {
  createPositionComponentJS,
  PositionComponent,
  PositionComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/position';
import { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import { FC, useMemo } from 'react';

export const ShipView: FC = () => {
  const components = useMemo(() => [createPositionComponentJS()], []);
  const { entityId } = useAddEntity({ components });
  const system: System = useMemo(() => {
    return {
      requiredComponents: [PositionComponentName],
      process: (entities, components) => {
        'worklet';
        const positionComponentStore: ComponentStore<
          PositionComponent['data']
        > = components[PositionComponentName];
        for (let i = 0; i < entities.length; i++) {
          const position = positionComponentStore.get(i);
          if (!position) return;
          position.x = position.x + 1;
          position.y = position.y + 1;
        }
      },
    };
  }, []);
  const { systemId } = useAddSystem({ system });
  if (typeof entityId !== 'number') return null;
  return <RenderEntity entityId={entityId} />;
};
