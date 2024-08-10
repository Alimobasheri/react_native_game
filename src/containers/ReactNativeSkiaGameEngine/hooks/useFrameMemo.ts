import { useContext, useEffect, useRef, useState } from "react";
import { Entity, Frames, FrameUpdateEvent } from "../services";
import { RNSGEContext } from "../context";
import { deepEqual } from "../utils/deepEqual";

export type GetValue<E, T> = (
  entity: Entity<E> | undefined,
  key: keyof E
) => T | E[keyof E] | undefined;
export type Factory<T> = () => T;
export type Comparator = (prevDeps: any, nextDeps: any) => boolean;
export type Dep<E> = [string, keyof E];

const deepComparator: Comparator = (prevDep, nextDep) => {
  if (!deepEqual(prevDep, nextDep)) {
    return false;
  }

  return true;
};

export const useFrameMemo = <E, T>(
  factory: Factory<T>,
  dep: Dep<E>,
  getValue: GetValue<E, T>,
  comparator: Comparator = deepComparator
): T => {
  const entities = useContext(RNSGEContext).entities;
  const framesRef = useContext(RNSGEContext).frames;
  const previousDepsRef = useRef<T | undefined>(
    getValue(entities.current.entities.get(dep[0]), dep[1]) as T | undefined
  );
  const memoizedValueRef = useRef<T>(factory());
  const [memoizedValue, setMemoizedValue] = useState<T>(
    memoizedValueRef.current
  );

  useEffect(() => {
    const updateMemoizedValue = () => {
      const entity = entities.current.entities.get(dep[0]);
      const value = getValue(entity, dep[1]);
      if (!comparator(previousDepsRef.current, value)) {
        memoizedValueRef.current = factory();
        previousDepsRef.current = value as T | undefined;
        setMemoizedValue(memoizedValueRef.current);
      }
    };

    updateMemoizedValue();

    const handleFrameUpdate = () => {
      updateMemoizedValue();
    };

    // Assuming framesRef.current gets updated on each frame
    const listener = () => handleFrameUpdate();

    const framesListener = framesRef.current.addListener(
      FrameUpdateEvent,
      listener
    );

    return () => {
      framesListener.remove();
    };
  }, [dep, comparator, framesRef, factory]);

  return memoizedValue;
};
