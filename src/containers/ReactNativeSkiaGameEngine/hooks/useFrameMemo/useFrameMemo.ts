import { useContext, useEffect, useRef, useState, useMemo } from 'react';
import { Entity, FrameUpdateEvent } from '../../services';
import { RNSGEContext } from '../../context';
import { deepEqual } from '../../utils/deepEqual';

export type Factory<E extends Record<string, any>, T> = (
  currentValue: T | undefined,
  entity: Entity<E> | undefined
) => T;
export type Dep<E> = { entityId: string; key: keyof E };
export type EqualityCheck<T> = (
  prev: T | undefined,
  next: T | undefined
) => boolean;

const defaultEqualityCheck: EqualityCheck<any> = (prev, next) =>
  deepEqual(prev, next);

/**
 * A React hook that memoizes a value based on changes in an entity's properties
 * and updates it on each frame of the game loop. This is particularly useful
 * in a game engine context where you need to track and memoize values that
 * change over time with high frequency.
 *
 * @template E - The type representing the entity's data structure.
 * @template T - The type of the value being memoized.
 *
 * @param {Factory<E, T>} factory - A function that returns the value to be memoized.
 * The function receives the current value and the entity, allowing you to
 * compute the memoized value directly.
 *
 * @param {Dep<E>} dep - An object containing the entity ID and the specific property
 * key to watch for changes. The memoized value is recalculated whenever this
 * property changes.
 *
 * @param {EqualityCheck<T>} [equalityCheck=defaultEqualityCheck] - A function that compares the previous
 * and current values to determine if the memoized value should be recalculated.
 * By default, a deep comparison is used.
 *
 * @returns {T} - The memoized value, which updates whenever the specified entity
 * property changes or when a new frame is rendered and the dependencies change.
 *
 * @throws {Error} - Throws an error if used outside of the `RNSGEContext`.
 *
 * @example
 * const memoizedPosition = useFrameMemo(
 *   (currentValue, entity) => {
 *     if (entity && entity.data.position) {
 *       return calculateNewPosition(entity.data.position);
 *     }
 *     return currentValue || defaultPosition;
 *   },
 *   { entityId: 'someEntityId', key: 'position' }
 * );
 *
 * // The memoized position will be updated whenever the 'position' property
 * // of the entity changes or on each frame update.
 */
export const useFrameMemo = <E extends Record<string, any>, T>(
  factory: Factory<E, T>,
  dep: Dep<E>,
  equalityCheck: EqualityCheck<T> = defaultEqualityCheck
): T | undefined => {
  const context = useContext(RNSGEContext);
  const entities = context?.entities;
  const framesRef = context?.frames;

  if (!entities || !framesRef) {
    throw new Error('useFrameMemo must be used within a RNSGEContext');
  }

  const depsRef = useRef(dep);

  const previousValueRef = useRef<T | undefined>(
    entities.current.entities.get(dep.entityId)?.data[dep.key]
  );
  const memoizedValueRef = useRef<T | undefined>(
    entities.current.entities.get(dep.entityId)?.data[dep.key]
  );

  const initialValue = useMemo(() => {
    return factory(
      memoizedValueRef.current,
      entities.current.entities.get(dep.entityId)
    );
  }, [dep.entityId, dep.key, factory]);

  const [memoizedValue, setMemoizedValue] = useState<T | undefined>(
    initialValue
  );

  useEffect(() => {
    const updateMemoizedValue = () => {
      const entity = entities.current.entities.get(dep.entityId);
      const nextValue = entity?.data[dep.key] as T | undefined;

      if (!equalityCheck(previousValueRef.current, nextValue)) {
        previousValueRef.current = nextValue;
        memoizedValueRef.current = nextValue;

        const newValue = factory(nextValue, entity);
        setMemoizedValue(newValue);
      }
    };

    const framesListener = framesRef.current.addListener(
      FrameUpdateEvent,
      updateMemoizedValue
    );

    return () => {
      framesListener.remove();
    };
  }, [dep?.entityId, dep?.key, equalityCheck, factory, framesRef]);

  // If dep's entityId or key changes, update the memoized value instantly
  useEffect(() => {
    if (
      depsRef.current.entityId !== dep.entityId ||
      depsRef.current.key !== dep.key
    ) {
      const currentValue = entities.current.entities.get(dep.entityId)?.data[
        dep.key
      ];
      previousValueRef.current = currentValue;
      memoizedValueRef.current = currentValue;
      setMemoizedValue(
        factory(
          memoizedValueRef.current,
          entities.current.entities.get(dep.entityId)
        )
      );
    }
  }, [dep?.entityId, dep?.key]);

  return memoizedValue;
};
