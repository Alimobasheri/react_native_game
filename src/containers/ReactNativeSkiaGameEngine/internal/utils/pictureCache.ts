import { Entity } from '../../services-ecs/entity';

/** Remove cached SkPicture / SkPath for an entity (call when entity is destroyed). */
export const evictPictureCacheEntry = (entityId: Entity): void => {
  'worklet';
  const cache = global._RNTGE_?.pictureCache;
  if (!cache) return;
  const cached = cache[entityId];
  delete cache[entityId];
  // Queue for delayed dispose — last frame's root picture may still draw it.
  // Web WASM: without this the heap grows until Aborted().
  if (cached) {
    if (!global._RNTGE_._pictureDisposeQueue) {
      global._RNTGE_._pictureDisposeQueue = [];
    }
    global._RNTGE_._pictureDisposeQueue.push(cached);
  }
};
