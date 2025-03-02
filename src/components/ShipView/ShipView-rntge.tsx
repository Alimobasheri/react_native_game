import { RenderEntity } from '@/containers/ReactNativeSkiaGameEngine/components-ecs/RenderEntity/RenderEntity';
import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntity/useAddEntity';
import { createPositionComponentJS } from '@/containers/ReactNativeSkiaGameEngine/internal/components/position';
import { FC, useMemo } from 'react';

export const ShipView: FC = () => {
  const components = useMemo(() => [createPositionComponentJS()], []);
  const { entityId } = useAddEntity({ components });
  if (typeof entityId !== 'number') return null;
  return <RenderEntity entityId={entityId} />;
};
