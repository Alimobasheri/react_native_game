import { Canvas } from '@shopify/react-native-skia';
import { FC, PropsWithChildren, useCallback, useMemo } from 'react';
import { useECS } from './hooks-ecs/useECS/useECS';
import { ECSProvider } from './contexts-rntge/ECSContext/ECSProvider';
import { MemoizedContainer } from './components/MemoizedContainer';
import {
  SharedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { Component } from './services-ecs/component';
import { System } from './services-ecs/system';
import { ECS } from './services-ecs/ecs';
import { useEventQueue } from './hooks-ecs/useEventQueue/useEventQueue';
import { EventQueueProvider } from './contexts-rntge/EventQueueContext/EventQueueProvider';

export const ReactNativeTurboGameEngine: FC<PropsWithChildren<{}>> = ({
  children,
}) => {
  const eventQueue = useEventQueue();
  const { ECS, initECS } = useECS({ eventQueue });
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

  const movementSystem: System = useMemo(
    () => ({
      requiredComponents: ['Position', 'Velocity'],
      process: (entities, components, eventQueue, deltaTime) => {
        'worklet';
        for (let i = 0; i < entities.length; i++) {
          const entity = entities[i];
          const position = components.Position.get(entity);
          const velocity = components.Velocity.get(entity);
          position.x += velocity.x * deltaTime;
          position.y += velocity.y * deltaTime;
          if (
            position.x > 100 ||
            position.x < 0 ||
            position.y > 100 ||
            position.y < 0
          ) {
            eventQueue.addEvent({
              type: 'out-of-boundary',
              payload: entity,
            });
          }
        }
      },
    }),
    []
  );

  const killEntitySystem: System = useMemo(
    () => ({
      requiredEvents: ['out-of-boundary'],
      requiredComponents: ['Position'],
      process: (entities, components, eventQueue, deltaTime, ecs) => {
        'worklet';
        if (!ECS.value) return;
        const outOfBoundaryEvents = eventQueue
          .readEvents()
          .filter((e) => e.type === 'out-of-boundary');
        for (let i = 0; i < outOfBoundaryEvents.length; i++) {
          const entity = outOfBoundaryEvents[i].payload;
          ecs.value.removeEntity(entity);
        }
      },
    }),
    []
  );

  const onFrame = useCallback(() => {
    'worklet';
    eventQueue.clearEvents();
    if (!ECS.value) {
      initECS();
      return;
    }
    if (!ECS.value.componentExists('Position')) defineComponents();
    else if (createdEntity.value === false) {
      createdEntity.value = ECS.value.createEntity();
      createHundredsWithPosition();
      ECS.value.registerSystem(movementSystem);
      ECS.value.registerSystem(killEntitySystem);
    } else {
      if (!!ECS && !!ECS.value)
        ECS.value.runSystems(ECS as SharedValue<ECS>, eventQueue, 100 / 60);
    }
  }, [ECS]);
  useFrameCallback(onFrame);
  return (
    <Canvas style={{ flex: 1 }}>
      <ECSProvider ecs={ECS}>
        <EventQueueProvider eventQueue={eventQueue}>
          <MemoizedContainer>{children}</MemoizedContainer>
        </EventQueueProvider>
      </ECSProvider>
    </Canvas>
  );
};
