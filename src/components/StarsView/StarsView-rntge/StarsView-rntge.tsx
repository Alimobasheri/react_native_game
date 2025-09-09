import { useCanvasDimensions } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import { useAddEntityBatch } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntityBatch/useAddEntityBatch';
import { useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddSystem/useAddSystem';
import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import { useMemo, useEffect } from 'react';
import { createRenderComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createStarComponentJS } from '@/data-components/StarComponent';
import { createStarMovementSystem } from '@/systems/StarSystem/StarMovementSystem';

const StarsCount = 25;

export const StarsView = () => {
  const { width: windowWidth, height: windowHeight } = useCanvasDimensions();

  const entityBatch = useMemo(() => {
    if (windowWidth <= 0 || windowHeight <= 0) {
      return [];
    }

    const batch: Component<any>[][] = [];
    for (let i = 0; i < StarsCount; i++) {
      const cx = Math.random() * windowWidth;
      const cy = (Math.random() * windowHeight) / 2;
      const r = Math.random() * 3 + 5;
      const fill = 'white';
      const speed = Math.random() * 0.001 + 0.003;

      batch.push([
        createStarComponentJS({ cx, cy, radius: r, color: fill, speed }),
        createRenderComponent({
          shape: { type: 'circle', radius: r },
          position: { x: cx, y: cy },
          fillColor: fill,
          visible: true,
          image: 'star',
        }),
      ]);
    }
    return batch;
  }, [windowWidth, windowHeight]);

  const { entityId: entityIds } = useAddEntityBatch({ batch: entityBatch });

  // Register the star movement system
  const starMovementSystem = useMemo(
    () =>
      createStarMovementSystem({ width: windowWidth, height: windowHeight }),
    [windowWidth, windowHeight]
  );
  useAddSystem({ system: starMovementSystem });

  return null;
};
