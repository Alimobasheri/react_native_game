import { useCanvasDimensions } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import { useAddEntityBatch } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntityBatch/useAddEntityBatch';
import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import { useMemo, useEffect } from 'react';
import { createRenderComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createStarComponentJS } from '@/data-components/StarComponent';
import { useAddMatterBodyBatch } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddMatterBodyBatch/useAddMatterBodyBatch';
import { CreateMatterBodyArgs } from '@/containers/ReactNativeSkiaGameEngine/internal/systems/physics/bodiesTypes';

const StarsCount = 50;

export const StarsView = () => {
  const { width: windowWidth, height: windowHeight } = useCanvasDimensions();

  const entityBatch = useMemo(() => {
    if (windowWidth <= 0 || windowHeight <= 0) {
      return [];
    }

    const batch: Component<any>[][] = [];
    for (let i = 0; i < StarsCount; i++) {
      const cx = Math.random() * windowWidth;
      const cy = Math.random() * windowHeight;
      const r = 5;
      const fill = 'white';

      batch.push([
        createStarComponentJS({ cx, cy, radius: r, color: fill }),
        createRenderComponent({
          shape: { type: 'circle', radius: r },
          fillColor: fill,
          visible: true,
          image: 'star',
        }),
      ]);
    }
    return batch;
  }, [windowWidth, windowHeight]);

  const { entityId: entityIds } = useAddEntityBatch({ batch: entityBatch });

  const matterBodyBatch = useMemo(() => {
    if (!entityIds || entityIds.length !== entityBatch.length) {
      return [];
    }

    return entityIds.map((entityId, index) => {
      const starData = entityBatch[index][0].data; // from createStarComponentJS
      const args: CreateMatterBodyArgs = {
        type: 'circle',
        options: {
          x: starData.cx,
          y: starData.cy,
          radius: starData.radius,
          options: {
            isStatic: true,
            collisionFilter: {
              group: 0x0002,
            },
          },
        },
      };
      return { args, entityId };
    });
  }, [entityIds, entityBatch]);

  useAddMatterBodyBatch({ batch: matterBodyBatch });

  return null;
};
