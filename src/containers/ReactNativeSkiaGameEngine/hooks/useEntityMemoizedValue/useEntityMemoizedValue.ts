import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { RNSGEContext } from '../../context/RNSGEContext';
import { Entity } from '../../services/Entity';
import { AddEntityEvent } from '../../services/Entities';
import { useFrameMemo } from '../useFrameMemo';
import { EntityOptions } from '../useEntityValue';
import { entityIdentifier } from '../useEntityInstance';

export type MemoizedEntityOptions<T> = {
  getComparisonValue?: (value: T | undefined) => any;
} & EntityOptions<T>;

/**
 * A React hook that retrieves and memoizes a specific value from an entity's data
 * within the game engine. It supports accessing the entity by ID or label.
 * The value is updated only when the specified entity's data or the specified key changes,
 * optimizing performance by avoiding unnecessary re-renders.
 *
 * @template E - The type of the entity's data structure.
 * @template T - The type of the memoized value.
 *
 * @param {string | entityIdentifier} entityIdOrLabel - The unique identifier or label of the entity from which to retrieve the value.
 * @param {keyof E} key - The key in the entity's data object whose value is to be memoized.
 * @param {MemoizedEntityOptions<T>} [options={}] - Optional configuration object.
 * @param {function(any): T} [options.processor] - A function to process the value before memoization.
 * @param {T} [options.defaultValue] - A default value to return if the entity or key is not found.
 * @param {function(T | undefined, T | undefined): boolean} [options.comparator] - A function to compare the previous and next values to determine if an update is needed.
 * @param {function(T | undefined): any} [options.getComparisonValue] - A funciton to get a value to be used for comparison. This can be useful with complex object and class instances.
 *
 * @returns {T | undefined} - The memoized value corresponding to the specified key in the entity's data.
 *
 * @throws {Error} - Throws an error if the hook is used outside of an RNSGEContext.
 *
 * @example
 * // Basic usage to retrieve and memoize the 'positionX' value of an entity by ID
 * const positionX = useEntityMemoizedValue('entity1', 'positionX');
 * console.log(positionX); // Outputs the current X position of 'entity1'
 *
 * @example
 * // Retrieve and memoize the value using an entity label
 * const health = useEntityMemoizedValue({ label: 'player' }, 'health');
 * console.log(health); // Outputs the health of the entity labeled 'player'
 */
export function useEntityMemoizedValue<E extends Record<string, any>, T>(
  entityIdOrLabel: string | entityIdentifier,
  key: keyof E,
  options: MemoizedEntityOptions<T> = {}
): T | undefined {
  const { processor, defaultValue, comparator, getComparisonValue } = options;
  const rnsgeContext = useContext(RNSGEContext);

  if (!rnsgeContext) {
    throw new Error(
      'useEntityMemoizedValue must be used within a RNSGEContext'
    );
  }

  const entities = rnsgeContext.entities;

  const getValue = useCallback(
    (entity: Entity<E> | undefined, key: keyof E): T | undefined => {
      if (!entity?.id) {
        return defaultValue;
      }
      return processor ? processor(entity.data[key]) : (entity.data[key] as T);
    },
    [processor, defaultValue]
  );

  const areValuesEqual = useCallback(
    (prevValue: T | undefined, nextValue: T | undefined): boolean => {
      return comparator
        ? comparator(prevValue, nextValue)
        : prevValue === nextValue;
    },
    [comparator]
  );

  const foundEntity = useMemo((): Entity<E> | undefined => {
    if (typeof entityIdOrLabel === 'string') {
      return entities.current.entities.get(entityIdOrLabel);
    } else if (typeof entityIdOrLabel === 'object') {
      return entities.current.getEntityByLabel(entityIdOrLabel.label!);
    }
    return undefined;
  }, [entityIdOrLabel, entities]);

  const [entity, setEntity] = useState<Entity<E> | undefined>(foundEntity);
  const memoizedValue = useFrameMemo<E, T | undefined>(
    (value, entity) => getValue(entity, key),
    { entityId: entity?.id || '', key },
    { equalityCheck: comparator, getComparisonValue }
  );

  useEffect(() => {
    if (!entity) {
      const listener = entities.current.addListener(
        AddEntityEvent,
        ({ entity }: { entity: Entity<any> }) => {
          if (
            (typeof entityIdOrLabel === 'string' &&
              entity.id === entityIdOrLabel) ||
            (typeof entityIdOrLabel === 'object' &&
              entity.label === entityIdOrLabel.label)
          ) {
            setEntity(entity);
          }
        }
      );
      return () => {
        console.log('removed');
        listener.remove();
      };
    }
  }, [entity, entityIdOrLabel, entities]);

  return memoizedValue;
}
