import { useRef } from "react";

export type Factory<T> = () => T;
export type Comparator = (prevDeps: any[], nextDeps: any[]) => boolean;

export const useCustomMemo = <T>(
  factory: Factory<T>,
  deps: any[],
  comparator: Comparator
): T => {
  const previousDepsRef = useRef<any[]>([]);
  const memoizedValue = useRef<T>(factory());

  const dependenciesChanged = !comparator(previousDepsRef.current, deps);

  if (dependenciesChanged) {
    memoizedValue.current = factory();
    previousDepsRef.current = deps;
  }

  return memoizedValue.current;
};
