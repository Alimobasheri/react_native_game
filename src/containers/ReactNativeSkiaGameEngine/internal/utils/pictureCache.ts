import { Entity } from '../../services-ecs/entity';

/** Remove cached SkPicture / SkPath for an entity (call when entity is destroyed). */
export const evictPictureCacheEntry = (entityId: Entity): void => {
  'worklet';
  const cache = global._RNTGE_?.pictureCache;
  if (!cache) return;
  delete cache[entityId];
};
