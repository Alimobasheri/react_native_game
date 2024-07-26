import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { RNSGEContext } from "../context/RNSGEContext";
import { Entity } from "../services/Entity";
import { useSharedValue } from "react-native-reanimated";
import { AddEntityEvent } from "../services/Entities";
import { FrameUpdateEvent } from "../services/Frames";

export type EntityOptions<T> = {
  processor?: (value: any) => T;
  defaultValue?: T;
  comparator?: (prevValue: T | undefined, nextValue: T | undefined) => boolean;
};

export function useEntityValue<E, T>(
  entityId: string,
  key: keyof E,
  options: EntityOptions<T> = {}
) {
  const { processor, defaultValue, comparator } = options;
  const rnsgeContext = useContext(RNSGEContext);

  const entities = rnsgeContext.entities;
  const frames = rnsgeContext.frames;

  const getValue = useCallback(
    (entity: Entity<E> | undefined, key: keyof E) => {
      if (!entity?.id) {
        return defaultValue;
      }
      if (typeof processor === "function") {
        return processor(entity.data[key]);
      } else {
        return entity.data[key];
      }
    },
    [processor, defaultValue]
  );

  const areValuesEqual = useCallback(
    (prevValue: T | undefined, nextValue: T | undefined) => {
      if (typeof comparator === "function") {
        return comparator(prevValue, nextValue);
      } else {
        return prevValue === nextValue;
      }
    },
    [comparator]
  );

  const [entity, setEntity] = useState<Entity<E> | undefined>(
    entities.current.entities.get(entityId)
  );

  const entityLoadedFirstTime = useRef<boolean>(!!entity);

  const value = useSharedValue<T | undefined>(
    getValue(entity, key) as T | undefined
  );

  useEffect(() => {
    if (!entity) return;
    if (!value.value && !entityLoadedFirstTime.current)
      value.value = getValue(entity, key) as T | undefined;
    const framesListener = frames.current.addListener(FrameUpdateEvent, () => {
      const entity = entities.current.entities.get(entityId);
      const nextValue = getValue(entity, key) as T | undefined;
      if (!!entity?.id && !areValuesEqual(value.value, nextValue))
        value.value = nextValue;
    });
    return () => {
      framesListener.remove();
    };
  }, [entity]);

  useEffect(() => {
    if (!entity) {
      const listener = entities.current.addListener(
        AddEntityEvent,
        (event, data) => {
          if (data.id === entityId) {
            setEntity(data);
          }
        }
      );
      listener.remove();
    }
  }, []);

  return value;
}
