import { Canvas } from '@shopify/react-native-skia';
import { FC, PropsWithChildren, useCallback } from 'react';
import { useECS } from './hooks-ecs/useECS/useECS';
import { ECSProvider } from './contexts-rntge/ECSContext/ECSProvider';
import { MemoizedContainer } from './components/MemoizedContainer';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { Component } from './services-ecs/component';

export const ReactNativeTurboGameEngine: FC<PropsWithChildren<{}>> = ({
  children,
}) => {
  const { ECS, initECS } = useECS();
  const createdEntity = useSharedValue<false | number>(false);
  const entityCount = useSharedValue(0);

  const createPositionComponent = useCallback(
    ({
      x,
      y,
    }: {
      x: number;
      y: number;
    }): Component<{ x: number; y: number }> => {
      'worklet';
      return { name: 'Position', data: { x, y } };
    },
    []
  );

  const createVelocityComponent = useCallback(
    ({
      x,
      y,
    }: {
      x: number;
      y: number;
    }): Component<{ x: number; y: number }> => {
      'worklet';
      return { name: 'Velocity', data: { x, y } };
    },
    []
  );

  const defineComponents = useCallback(() => {
    'worklet';
    if (!ECS.value) return;
    ECS.value.createComponent('Position');
    ECS.value.createComponent('Velocity');
    ECS.value.createComponent('health');
  }, [ECS]);

  const createHundredsWithPosition = useCallback(() => {
    'worklet';
    if (!ECS.value) return;
    for (let i = 0; i < 100; i++) {
      const entity = ECS.value.createEntity();
      entityCount.value++;
      ECS.value.addComponent(
        entity,
        createPositionComponent({
          x: Math.random() * 100,
          y: Math.random() * 100,
        })
      );
      if (i % 2 === 0) {
        ECS.value.addComponent(
          entity,
          createVelocityComponent({
            x: Math.random() * 2 - 1,
            y: Math.random() * 2 - 1,
          })
        );
      }
    }
  }, []);

  const onFrame = useCallback(() => {
    'worklet';
    if (!ECS.value) {
      initECS();
      return;
    }
    if (!ECS.value.componentExists('Position')) defineComponents();
    else if (createdEntity.value === false) {
      createdEntity.value = ECS.value.createEntity();
      createHundredsWithPosition();
    } else {
      const result = ECS.value.getEntitiesWithComponents([
        'Position',
        'Velocity',
      ]);
      console.log(result.length);
      for (let i = 0; i < result.length; i++) {
        const entity = result[i];
        ECS.value.components.value.Position.get(entity).x +=
          ECS.value.components.value.Velocity.get(entity).x;
        ECS.value.components.value.Position.get(entity).y +=
          ECS.value.components.value.Velocity.get(entity).y;
      }
    }
  }, [ECS]);
  useFrameCallback(onFrame);
  return (
    <Canvas style={{ flex: 1 }}>
      <ECSProvider ecs={ECS}>
        <MemoizedContainer>{children}</MemoizedContainer>
      </ECSProvider>
    </Canvas>
  );
};
