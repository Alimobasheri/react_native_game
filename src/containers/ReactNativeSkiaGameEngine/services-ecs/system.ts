import { runOnJS, SharedValue } from 'react-native-reanimated';
import { ECS } from './ecs';
import { Entity } from './entity';
import { ComponentStore } from './component';
import { EventQueueContextType } from '../hooks-ecs/useEventQueue/useEventQueue';
import { MutableRefObject } from 'react';
import { Assets } from '../types-ecs/assets';
import { SkImage, SkPath, SkPicture } from '@shopify/react-native-skia';

export enum SystemContext {
  JS = 'JS',
  UI = 'UI',
}

export type SystemProcessArgs = {
  entities: Entity[];
  components: Record<string, ComponentStore<any>>;
  eventQueue: EventQueueContextType;
  deltaTime: number;
  ecs: SharedValue<ECS>;
};

export interface RunSystemsArgs {
  ecs: SharedValue<ECS>;
  eventQueue: EventQueueContextType;
  deltaTime: number;
}

export type System = {
  context?: SystemContext;
  requiredComponents?: string[];
  requiredEvents?: string[];
  process: (args: SystemProcessArgs) => void;
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
  systems: SharedValue<System[]>,
  jsSystems: MutableRefObject<System[]>
) => {
  'worklet';

  const systemIdMap: Record<number, number> = {}; // Maps systemId to index
  let nextSystemId = 0;

  const registerSystem = (system: System): number => {
    'worklet';
    const systemId = nextSystemId++;
    if (system.context === SystemContext.JS) {
      jsSystems.current.push(system);
    } else {
      systems.value.push(system);
    }
    systemIdMap[systemId] = systems.value.length - 1;
    return systemId;
  };

  const runSystems = ({ ecs, eventQueue, deltaTime }: RunSystemsArgs) => {
    'worklet';
    const events = eventQueue.readEvents();

    for (let i = 0; i < systems.value.length; i++) {
      const system = systems.value[i];

      const hasRequiredEvents = system.requiredEvents
        ? system.requiredEvents.some((event: string) =>
            events.some((e) => e.type === event)
          )
        : true;

      if (!hasRequiredEvents) continue;

      const entities = system.requiredComponents
        ? ecs.value.getEntitiesWithComponents(system.requiredComponents)
        : [];
      // console.log('=====', system.requiredComponents);
      system.process({
        entities,
        components: ecs.value.components.value,
        eventQueue,
        deltaTime,
        ecs,
      });
    }
  };

  return {
    systemIdMap,
    registerSystem,
    runSystems,
  };
};
