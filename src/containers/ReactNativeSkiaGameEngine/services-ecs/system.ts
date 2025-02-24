import { SharedValue } from 'react-native-reanimated';
import { ECS } from './ecs';
import { Entity } from './entity';
import { ComponentStore } from './component';

export type System = {
  requiredComponents: string[]; // Components needed for this system
  process: (
    entities: Entity[],
    components: Record<string, ComponentStore<any>>,
    deltaTime: number
  ) => void;
};

export const createSystemManager = (systems: SharedValue<System[]>) => {
  'worklet';

  const registerSystem = (system: System) => {
    'worklet';
    systems.value.push(system);
  };

  const runSystems = (ecs: SharedValue<ECS>, deltaTime: number) => {
    'worklet';
    for (let i = 0; i < systems.value.length; i++) {
      const system = systems.value[i];
      const entities = ecs.value.getEntitiesWithComponents(
        system.requiredComponents
      );

      // Pass only necessary data to the system
      system.process(entities, ecs.value.components.value, deltaTime);
    }
  };

  return {
    registerSystem,
    runSystems,
  };
};
