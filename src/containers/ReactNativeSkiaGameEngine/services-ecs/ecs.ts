import { SharedValue } from 'react-native-reanimated';
import { Component, ComponentStore, createComponentStore } from './component';
import { createEntityManager, Entity } from './entity';
import { createComponentBitManager } from './componentBitManager';

export type ECS = {
  components: SharedValue<Record<string, ComponentStore<any>>>;
  createEntity: () => number;
  createComponent: (componentName: string) => void;
  addComponent: <T>(entity: number, component: Component<T>) => void;
  removeComponent: (entity: Entity, componentName: string) => void;
  componentExists: (componentName: string) => boolean;
  getEntitiesWithComponents: (requiredComponentNames: string[]) => Entity[];
};

export type ECSArgs = {
  nextEntityId: SharedValue<number>;
  signatures: SharedValue<Record<Entity, number>>;
  components: SharedValue<Record<string, ComponentStore<any>>>;
};

export const createECS = ({
  nextEntityId,
  components,
  signatures,
}: ECSArgs): ECS => {
  'worklet';
  const createEntity = createEntityManager(nextEntityId, signatures);
  const bitManager = createComponentBitManager();

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
    const componentBit = bitManager.getComponentBit(componentName);
    signatures.value[entity] &= ~componentBit;

    components.value[componentName].remove(entity);
  };

  const hasComponents = (entity: Entity, requiredBits: number): boolean => {
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
  };
};
