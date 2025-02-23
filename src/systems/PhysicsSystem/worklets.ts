import { Entities, Entity } from '@/containers/ReactNativeSkiaGameEngine';
import { RNGE_System_Args } from '../types';
import Matter from 'matter-js';
import { runOnUI } from 'react-native-reanimated';
import { BUOYANTS_GROUP } from '@/constants/configs';

export const physics = (
  entities: Entities,
  args: RNGE_System_Args,
  buoyants: Entity<any>[]
) => {
  'worklet';
  return entities;
};

export const createPhysicsEngine = () => {
  return Matter.Engine.create();
};

export const findBuoyantVehicles = (entities: Entities) => {
  return entities.getEntitiesByGroup(BUOYANTS_GROUP);
};

export const createPhysicsSystem = () => {
  const engine = createPhysicsEngine();
  let buoyants: Entity<any>[] = [];
  return (entities: Entities, args: RNGE_System_Args) => {
    Matter.Engine.update(engine, args.time.delta);
    buoyants = findBuoyantVehicles(entities);
    runOnUI(physics)(entities, args, buoyants);
  };
};
