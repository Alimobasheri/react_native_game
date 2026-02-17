import { Component, ComponentStore, createComponentStore } from './component';
import { createEntityManager, Entity } from './entity';
import { createComponentBitManager } from './componentBitManager';
import { createSystemManager, RunSystemsArgs, System } from './system';

export enum ECSState {
  INITIALIZED = 'INITIALIZED',
  NOT_INITIALIZED = 'NOT_INITIALIZED',
}
export type ECS = {
  components: Record<string, ComponentStore<any>>;
  createEntity: () => number;
  createComponent: (componentName: string) => void;
  addComponent: <T>(entity: number, component: Component<T>) => void;
  removeComponent: (entity: Entity, componentName: string) => void;
  updateComponent: <T>(
    entity: Entity,
    componentName: string,
    recipe: (component: T) => void
  ) => void;
  componentExists: (componentName: string) => boolean;
  getEntitiesWithComponents: (requiredComponentNames: string[]) => Entity[];
  registerSystem: (system: System) => number;
  removeSystem: (systemId: number) => void;
  runSystems: (args: RunSystemsArgs) => void;
  removeEntity: (entity: Entity) => void;
  getAllEntities: () => Entity[];
};

export const createECS = (): ECS => {
  'worklet';
  let nextEntityId = 0;
  const signatures: Record<Entity, number> = {};
  const components: Record<string, ComponentStore<any>> = {};
  const recycledEntities: Entity[] = [];
  let systems: (System | undefined)[] = [];
  const createEntity = createEntityManager(
    nextEntityId,
    signatures,
    recycledEntities
  );
  const bitManager = createComponentBitManager();
  const systemManager = createSystemManager(systems);

  const removeComponent = <T>(entity: Entity, componentName: string) => {
    const componentBit = bitManager.getComponentBit(componentName);
    signatures[entity] &= ~componentBit;

    components[componentName].remove(entity);
  };

  const removeEntity = (entity: Entity) => {
    for (const componentName in components) {
      if (components[componentName].get(entity) !== undefined) {
        removeComponent(entity, componentName);
      }
    }

    signatures[entity] = 0;
    recycledEntities.push(entity); // Store entity ID for reuse
  };

  const createComponent = (componentName: string) => {
    components[componentName] = createComponentStore();
    bitManager.getComponentBit(componentName);
  };

  const addComponent = <T>(entity: Entity, component: Component<T>) => {
    const componentBit = bitManager.getComponentBit(component.name);
    signatures[entity] |= componentBit;

    components[component.name].add(entity, component.data);
  };

  const updateComponent = <T>(
    entity: Entity,
    componentName: string,
    recipe: (component: T) => void
  ) => {
    const componentStore = components[componentName];
    if (!componentStore) {
      // In a production engine, you might want to log this error.
      // For now, we fail silently.
      return;
    }

    const componentData = componentStore.get(entity) as T | undefined;

    if (componentData) {
      recipe(componentData);
    }
  };

  const hasComponents = (entity: Entity, requiredBits: number): boolean => {
    return (signatures[entity] & requiredBits) === requiredBits;
  };

  const componentExists = (componentName: string) => {
    return components[componentName] != undefined;
  };

  const getEntitiesWithComponents = (requiredComponentNames: string[]) => {
    const requiredBits = requiredComponentNames.reduce(
      (acc, name) => acc | bitManager.getComponentBit(name),
      0
    );

    return Object.keys(signatures)
      .filter((id) => hasComponents(Number(id), requiredBits))
      .map(Number);
  };

  const getAllEntities = () => {
    return Object.keys(signatures).map(Number);
  };

  return {
    components,
    createEntity,
    createComponent,
    addComponent,
    removeComponent,
    updateComponent,
    componentExists,
    getEntitiesWithComponents,
    registerSystem: systemManager.registerSystem,
    removeSystem: systemManager.removeSystem,
    runSystems: systemManager.runSystems,
    removeEntity,
    getAllEntities,
  };
};
