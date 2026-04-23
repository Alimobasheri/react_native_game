import { runOnJS, SharedValue } from 'react-native-reanimated';
import { ECS } from './ecs';
import { Entity } from './entity';
import { ComponentStore } from './component';
import { EventQueueContextType } from '../hooks-ecs/useEventQueue/useEventQueue';
import { MutableRefObject } from 'react';

export enum SystemContext {
  JS = 'JS',
  UI = 'UI',
}

export type SystemProcessArgs = {
  entities: Entity[];
  components: Record<string, ComponentStore<any>>;
  eventQueue: EventQueueContextType;
  deltaTime: number;
  ecs: ECS;
  dimensions: SharedValue<{ width: number; height: number }>;
};

export interface RunSystemsArgs {
  eventQueue: EventQueueContextType;
  deltaTime: number;
  dimensions: SharedValue<{ width: number; height: number }>;
}

export type System = {
  process: (args: SystemProcessArgs) => void;
  context?: SystemContext;
  name?: string;
  requiredComponents?: string[];
  requiredEvents?: string[];
};

export const runJSSystemJS = (
  processFn: () => void,
  done: { current: boolean }
) => {
  console.log('🚀 ~ processFn:', processFn);
  // processFn();
  done.current = false;
};

const runJSSystem = (processFn: () => void) => {
  'worklet';
  let isRunning = { current: true };
  console.log(isRunning);
  runOnJS(runJSSystemJS)(processFn, isRunning);
  while (isRunning) {
    continue;
  }
};

export const createSystemManager = (
  systems: (System | undefined)[],
) => {
  'worklet';

  const systemIdMap: Record<number, number | undefined> = {}; // Maps systemId to index
  let nextSystemId = 0;
  let reuseIndexes: number[] = [];

  const registerSystem = (system: System): number => {
    const systemId = nextSystemId++;
    systems.push(system);
    systemIdMap[systemId] = systems.length - 1;
    return systemId;
  };

  const removeSystem = (systemId: number): void => {
    const index = systemIdMap[systemId];
    if (!index) return;
    systems[index] = undefined;
    systemIdMap[systemId] = undefined;
    reuseIndexes.push(index);
  };

  const runSystems = ({
    eventQueue,
    deltaTime,
    dimensions,
  }: RunSystemsArgs) => {
    const ecs = global._RNTGE_.ecs;
    if (!ecs) return;
    const events = eventQueue.readEvents();
    // console.log(systems.map((sys) => sys?.name));
    for (let i = 0; i < systems.length; i++) {
      const system = systems[i];
      if (!system) continue;

      const hasRequiredEvents = system.requiredEvents
        ? system.requiredEvents.some((event: string) =>
          events.some((e) => e.type === event)
        )
        : true;

      if (!hasRequiredEvents) continue;

      const entities = system.requiredComponents
        ? ecs.getEntitiesWithComponents(system.requiredComponents)
        : [];
      system.process({
        entities,
        components: ecs.components,
        eventQueue,
        deltaTime,
        ecs,
        dimensions,
      });
    }
  };

  return {
    systemIdMap,
    registerSystem,
    removeSystem,
    runSystems,
  };
};
