import { SharedValue } from 'react-native-reanimated';
import { Component, ComponentStore, createComponentStore } from './component';
import { createEntityManager, Entity } from './entity';
import { createComponentBitManager } from './componentBitManager';

export type ECS = {
  components: Record<string, ComponentStore<any>>;
  createEntity: () => number;
  createComponent: (componentName: string) => void;
  addComponent: <T>(entity: number, component: Component<T>) => void;
  removeComponent: (entity: Entity, componentName: string) => void;
  componentExists: (componentName: string) => boolean;
  getEntitiesWithComponents: (requiredComponentNames: string[]) => Entity[];
};

export type ECSArgs = {
  nextEntityId: SharedValue<number>;
  signatures: Record<Entity, number>;
  components: Record<string, ComponentStore<any>>;
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
    components[componentName] = createComponentStore();
    bitManager.getComponentBit(componentName);
  };

  const addComponent = <T>(entity: Entity, component: Component<T>) => {
    'worklet';
    const componentBit = bitManager.getComponentBit(component.name);
    signatures[entity] |= componentBit;
  };

  const removeComponent = <T>(entity: Entity, componentName: string) => {
    const componentBit = bitManager.getComponentBit(componentName);
    signatures[entity] &= ~componentBit;
  };

  const hasComponents = (entity: Entity, requiredBits: number): boolean => {
    return (signatures[entity] & requiredBits) === requiredBits;
  };

  const componentExists = (componentName: string) => {
    'worklet';
    return components[componentName] != undefined;
  };

  const getEntitiesWithComponents = (requiredComponentNames: string[]) => {
    'worklet';
    const requiredBits = requiredComponentNames.reduce(
      (acc, name) => acc | bitManager.getComponentBit(name),
      0
    );

    return Object.keys(signatures)
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
