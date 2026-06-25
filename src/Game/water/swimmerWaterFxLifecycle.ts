import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import {
  SceneComponentData,
  SceneComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/scene';
import { evictPictureCacheEntry } from '@/containers/ReactNativeSkiaGameEngine/internal/utils/pictureCache';
import type { SwimmerContactFoamKind } from '@/config/swimmerWaterFxTuning';

export const SWIMMER_WATER_FX_BURST_STORE_KEY = 'swimmerWaterFxBursts';
export const SWIMMER_WATER_FX_PHASE_PREV_KEY = 'swimmerWaterFxPhasePrev';

export type SwimmerWaterFxBurstRecord = {
  entityId: Entity;
  accentEntityId?: Entity;
  age: number;
  maxAge: number;
  swimmerX: number;
  kind: SwimmerContactFoamKind;
  direction: number;
  strength: number;
  foamSeed: number;
};

export const getSwimmerWaterFxBurstStore = (): SwimmerWaterFxBurstRecord[] => {
  'worklet';
  const rntge = global._RNTGE_;
  if (!rntge) {
    return [];
  }
  if (!rntge[SWIMMER_WATER_FX_BURST_STORE_KEY]) {
    rntge[SWIMMER_WATER_FX_BURST_STORE_KEY] = [] as SwimmerWaterFxBurstRecord[];
  }
  return rntge[SWIMMER_WATER_FX_BURST_STORE_KEY] as SwimmerWaterFxBurstRecord[];
};

export const getSwimmerWaterFxPhasePrevStore = (): Record<number, number> => {
  'worklet';
  const rntge = global._RNTGE_;
  if (!rntge) {
    return {};
  }
  if (!rntge[SWIMMER_WATER_FX_PHASE_PREV_KEY]) {
    rntge[SWIMMER_WATER_FX_PHASE_PREV_KEY] = {} as Record<number, number>;
  }
  return rntge[SWIMMER_WATER_FX_PHASE_PREV_KEY] as Record<number, number>;
};

const removeEntityFromScene = (
  ecs: ECS,
  sceneEntity: Entity,
  entityId: Entity
): void => {
  'worklet';
  ecs.updateComponent<SceneComponentData>(sceneEntity, SceneComponentName, (scene) => {
    scene.objects.entities = scene.objects.entities.filter((id) => id !== entityId);
  });
};

const removeFxEntity = (
  ecs: ECS,
  sceneEntity: Entity,
  entityId: Entity
): void => {
  'worklet';
  removeEntityFromScene(ecs, sceneEntity, entityId);
  evictPictureCacheEntry(entityId);
  ecs.removeEntity(entityId);
};

/** Remove collar + all burst entities and reset global FX stores. */
export const clearSwimmerWaterFx = (
  ecs: ECS,
  sceneEntity: Entity,
  collarEntityId?: number
): void => {
  'worklet';
  if (typeof collarEntityId === 'number') {
    removeFxEntity(ecs, sceneEntity, collarEntityId);
  }

  const store = getSwimmerWaterFxBurstStore();
  for (let i = store.length - 1; i >= 0; i--) {
    const burst = store[i];
    removeFxEntity(ecs, sceneEntity, burst.entityId);
    if (typeof burst.accentEntityId === 'number') {
      removeFxEntity(ecs, sceneEntity, burst.accentEntityId);
    }
    store.splice(i, 1);
  }

  const phasePrev = getSwimmerWaterFxPhasePrevStore();
  for (const key of Object.keys(phasePrev)) {
    delete phasePrev[Number(key)];
  }
};
