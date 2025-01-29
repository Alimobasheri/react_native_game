import { useContext, useEffect, useRef, useState, useMemo } from 'react';
import { Entity, FrameUpdateEvent } from '../../services';
import { RNSGEContext } from '../../context';
import { deepEqual } from '../../utils/deepEqual';
// import { cloneDeep } from 'lodash';

const cloneDeep = (value: any): any => {
  const visited = new WeakMap(); // Tracks cloned objects to handle circular references

  const _clone = (val: any): any => {
    try {
      // Primitives and functions
      if (typeof val !== 'object' || val === null) return val;

      // Check for circular reference
      if (visited.has(val)) return visited.get(val);

      // Special cases
      if (val?._isReanimatedSharedValue) return val;
      if (val instanceof Date) return new Date(val);
      if (val instanceof RegExp) return new RegExp(val);

      // Handle arrays
      if (Array.isArray(val)) {
        const arrClone: any[] = [];
        visited.set(val, arrClone); // Register before cloning children
        arrClone.push(...val.map((item) => _clone(item)));
        return arrClone;
      }

      // Custom clone logic
      if (typeof val.clone === 'function') {
        const cloned = val.clone();
        visited.set(val, cloned);
        return cloned;
      }

      // Handle plain objects
      const objClone = Object.create(Object.getPrototypeOf(val));
      visited.set(val, objClone); // Register before cloning properties
      for (const key in val) {
        if (val.hasOwnProperty(key)) {
          objClone[key] = _clone(val[key]);
        }
      }
      return objClone;
    } catch (e) {
      console.log(e);
      return val;
    }
  };

  return _clone(value);
};

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

export type UseFrameMemoConfig<T> = {
  equalityCheck?: EqualityCheck<T>;
  getComparisonValue?: (value: T | undefined) => any;
};

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
 * @param {UseFrameMemoConfig<T>} [config] - Optional configuration object.
 * @param {EqualityCheck<T>} [config.equalityCheck] - A function that compares the previous
 * and current values to determine if the memoized value should be recalculated.
 * By default, a deep comparison is used.
 * @param {(value: T | undefined) => any} [config.getComparisonValue] - A function that
 * returns a value to be used for comparison and cloning. If provided, this value
 * is used instead of the original entity value for equality checks and cloning.
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
 *   { entityId: 'someEntityId', key: 'position' },
 *   {
 *     equalityCheck: (prev, next) => prev.x === next.x && prev.y === next.y,
 *     getComparisonValue: (value) => ({ x: value.x, y: value.y })
 *   }
 * );
 */
export const useFrameMemo = <E extends Record<string, any>, T>(
  factory: Factory<E, T>,
  dep: Dep<E>,
  config?: UseFrameMemoConfig<T>
): T | undefined => {
  const { equalityCheck = defaultEqualityCheck, getComparisonValue } =
    config || {};

  const context = useContext(RNSGEContext);
  const entities = context?.entities;
  const framesRef = context?.frames;

  if (!entities || !framesRef) {
    throw new Error('useFrameMemo must be used within a RNSGEContext');
  }

  const depsRef = useRef(dep);

  const initialEntity = entities.current.entities.get(dep.entityId);
  const initialEntityValue = initialEntity?.data[dep.key] as T | undefined;
  const initialComparisonValue = getComparisonValue
    ? getComparisonValue(initialEntityValue)
    : initialEntityValue;
  const previousValueRef = useRef<T | undefined>(
    cloneDeep(initialComparisonValue)
  );

  const memoizedValueRef = useRef<T | undefined>(cloneDeep(initialEntityValue));

  const initialValue = useMemo(() => {
    return cloneDeep(
      factory(
        memoizedValueRef.current,
        entities.current.entities.get(dep.entityId)
      )
    );
  }, [dep.entityId, dep.key, factory]);

  const [memoizedValue, setMemoizedValue] = useState<T | undefined>(
    initialValue
  );

  useEffect(() => {
    const updateMemoizedValue = () => {
      const entity = entities.current.entities.get(dep.entityId);
      const nextValue = entity?.data[dep.key] as T | undefined;
      const nextComparisonValue = getComparisonValue
        ? getComparisonValue(nextValue)
        : nextValue;
      const clonedComparisonValue = cloneDeep(nextComparisonValue);

      if (!equalityCheck(previousValueRef.current, clonedComparisonValue)) {
        previousValueRef.current = clonedComparisonValue;
        const clonedOriginalValue = cloneDeep(nextValue);
        memoizedValueRef.current = clonedOriginalValue;

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
      ] as T | undefined;
      const currentComparisonValue = getComparisonValue
        ? getComparisonValue(currentValue)
        : currentValue;
      previousValueRef.current = cloneDeep(currentComparisonValue);
      const clonedOriginalValue = cloneDeep(currentValue);
      memoizedValueRef.current = clonedOriginalValue;
      setMemoizedValue(
        factory(
          clonedOriginalValue,
          entities.current.entities.get(dep.entityId)
        )
      );
      depsRef.current = dep;
    }
  }, [dep?.entityId, dep?.key]);

  return memoizedValue;
};
