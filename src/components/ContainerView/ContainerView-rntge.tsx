import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntity/useAddEntity';
import { createContainerComponent } from '@/Game/ecs-components/Container';
import { FC, useMemo, useEffect } from 'react';

export const ContainerView: FC<{
  x: number;
  y: number;
  width: number;
  height: number;
  initialWaterSurfaceY: number;
  waterRiseSpeed?: number;
  onEntityCreated?: (id: number | null) => void;
}> = ({
  x,
  y,
  width,
  height,
  initialWaterSurfaceY,
  waterRiseSpeed = 20,
  onEntityCreated,
}) => {
  const components = useMemo(
    () => [
      createContainerComponent({
        centerX: x,
        centerY: y,
        width: width,
        height: height,
        waterSurfaceY: initialWaterSurfaceY,
        waterRiseSpeed: waterRiseSpeed,
      }),
    ],
    [x, y, width, height, initialWaterSurfaceY, waterRiseSpeed]
  );

  const { entityId } = useAddEntity({ components });

  useEffect(() => {
    if (onEntityCreated && entityId !== null && entityId !== undefined) {
      onEntityCreated(entityId);
    }
  }, [entityId, onEntityCreated]);

  return null;
};
