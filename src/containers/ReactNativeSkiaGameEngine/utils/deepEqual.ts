export const deepEqual = (obj1: any, obj2: any): boolean => {
  const _deepEqual = (a: any, b: any, visited: Map<any, any>): boolean => {
    // Handle Reanimated shared values first
    if (a?._isReanimatedSharedValue || b?._isReanimatedSharedValue) {
      return a?._isReanimatedSharedValue === b?._isReanimatedSharedValue;
    }

    // Primitive values comparison
    if (
      typeof a !== 'object' ||
      a === null ||
      typeof b !== 'object' ||
      b === null
    ) {
      return a === b;
    }

    // Same object reference
    if (a === b) return true;

    // Check for circular references
    if (visited.has(a) && visited.get(a) === b) return true;
    if (visited.has(b) && visited.get(b) === a) return true;

    // Register the pair to prevent infinite recursion
    visited.set(a, b);
    visited.set(b, a);

    // Compare object types
    if (a.constructor !== b.constructor) return false;

    // Handle special objects
    if (a instanceof Date) return a.getTime() === b.getTime();
    if (a instanceof RegExp) return a.toString() === b.toString();

    // Compare array lengths first
    if (Array.isArray(a) && a.length !== b.length) return false;

    // Compare object keys
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    // Compare all properties recursively
    for (const key of keysA) {
      if (!_deepEqual(a[key], b[key], visited)) {
        return false;
      }
    }

    return true;
  };

  return _deepEqual(obj1, obj2, new Map());
};
