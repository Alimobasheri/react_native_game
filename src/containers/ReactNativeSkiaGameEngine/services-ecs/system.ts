import { SharedValue } from 'react-native-reanimated';
import { ECS } from './ecs';
import { Entity } from './entity';
import { ComponentStore } from './component';
import { EventQueueContextType } from '../hooks-ecs/useEventQueue/useEventQueue';

export type System = {
  requiredComponents?: string[]; // Entities must have these
  requiredEvents?: string[]; // System runs only if these exist
  process: (
    entities: Entity[],
    components: Record<string, ComponentStore<any>>,
    eventQueue: EventQueueContextType,
    deltaTime: number,
    ecs: SharedValue<ECS>
  ) => void;
};

export const createSystemManager = (systems: SharedValue<System[]>) => {
  'worklet';

  const registerSystem = (system: System) => {
    'worklet';
    systems.value.push(system);
  };

  const runSystems = (
    ecs: SharedValue<ECS>,
    eventQueue: EventQueueContextType,
    deltaTime: number
  ) => {
    'worklet';
    const events = eventQueue.readEvents();

    for (let i = 0; i < systems.value.length; i++) {
      const system = systems.value[i];

      const hasRequiredEvents = system.requiredEvents
        ? system.requiredEvents.some((event) =>
            events.some((e) => e.type === event)
          )
        : true;

      if (!hasRequiredEvents) return;

      const entities = system.requiredComponents
        ? ecs.value.getEntitiesWithComponents(system.requiredComponents)
        : [];

      // Pass only necessary data to the system
      system.process(
        entities,
        ecs.value.components.value,
        eventQueue,
        deltaTime,
        ecs
      );
    }
  };

  return {
    registerSystem,
    runSystems,
  };
};
