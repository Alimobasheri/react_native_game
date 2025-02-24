import { makeMutable, SharedValue } from 'react-native-reanimated';
import { Component, ComponentStore, createComponentStore } from './component';
import { createEntityManager, Entity } from './entity';
import { createComponentBitManager } from './componentBitManager';
import { createSystemManager, System } from './system';
import { EventQueueContextType } from '../hooks-ecs/useEventQueue/useEventQueue';

export type ECS = {
  components: SharedValue<Record<string, ComponentStore<any>>>;
  createEntity: () => number;
  createComponent: (componentName: string) => void;
  addComponent: <T>(entity: number, component: Component<T>) => void;
  removeComponent: (entity: Entity, componentName: string) => void;
  componentExists: (componentName: string) => boolean;
  getEntitiesWithComponents: (requiredComponentNames: string[]) => Entity[];
  registerSystem: (system: System) => void;
  runSystems: (
    ecs: SharedValue<ECS>,
    eventQueue: EventQueueContextType,
    deltaTime: number
  ) => void;
  removeEntity: (entity: Entity) => void;
};

export type ECSArgs = {
  nextEntityId: SharedValue<number>;
  signatures: SharedValue<Record<Entity, number>>;
  components: SharedValue<Record<string, ComponentStore<any>>>;
  systems: SharedValue<System[]>;
  eventQueue: EventQueueContextType;
};

export const createECS = ({
  nextEntityId,
  components,
  signatures,
  systems,
  eventQueue,
}: ECSArgs): ECS => {
  'worklet';
  const recycledEntities: Entity[] = [];
  const createEntity = createEntityManager(
    nextEntityId,
    signatures,
    recycledEntities
  );
  const bitManager = createComponentBitManager();
  const systemManager = createSystemManager(systems);

  const removeEntity = (entity: Entity) => {
    'worklet';
    for (const componentName in components.value) {
      if (components.value[componentName].get(entity) !== undefined) {
        removeComponent(entity, componentName);
      }
    }

    signatures.value[entity] = 0;
    recycledEntities.push(entity); // Store entity ID for reuse
  };

  const createComponent = (componentName: string) => {
    'worklet';
    components.value[componentName] = createComponentStore();
    bitManager.getComponentBit(componentName);
  };

  const addComponent = <T>(entity: Entity, component: Component<T>) => {
    'worklet';
    const componentBit = bitManager.getComponentBit(component.name);
    signatures.value[entity] |= componentBit;

    components.value[component.name].add(entity, component.data);
  };

  const removeComponent = <T>(entity: Entity, componentName: string) => {
    'worklet';
    const componentBit = bitManager.getComponentBit(componentName);
    signatures.value[entity] &= ~componentBit;

    components.value[componentName].remove(entity);
  };

  const hasComponents = (entity: Entity, requiredBits: number): boolean => {
    'worklet';
    return (signatures.value[entity] & requiredBits) === requiredBits;
  };

  const componentExists = (componentName: string) => {
    'worklet';
    return components.value[componentName] != undefined;
  };

  const getEntitiesWithComponents = (requiredComponentNames: string[]) => {
    'worklet';
    const requiredBits = requiredComponentNames.reduce(
      (acc, name) => acc | bitManager.getComponentBit(name),
      0
    );

    return Object.keys(signatures.value)
      .filter((id) => hasComponents(Number(id), requiredBits))
      .map(Number);
  };

  return {
    components,
    createEntity,
    createComponent,
    addComponent,
    removeComponent,
    componentExists,
    getEntitiesWithComponents,
    registerSystem: systemManager.registerSystem,
    runSystems: systemManager.runSystems,
    removeEntity,
  };
};
