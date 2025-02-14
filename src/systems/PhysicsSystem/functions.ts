import { makeMutable } from 'react-native-reanimated';

export function generateCleanCopyStructure(
  source: any,
  visited: WeakSet<object> = new WeakSet()
): Array<{ key: string | number; value?: any }> {
  if (typeof source !== 'object' || source === null) {
    return [];
  }

  if (visited.has(source)) {
    return [];
  }

  visited.add(source);

  if (Array.isArray(source)) {
    const result: Array<{ key: number; value?: any }> = [];
    for (let i = 0; i < source.length; i++) {
      const item = source[i];
      if (typeof item === 'function') {
        continue;
      }

      if (typeof item === 'object' && item !== null) {
        if (visited.has(item)) {
          result.push({ key: i, value: [] });
        } else {
          const structure = generateCleanCopyStructure(item, visited);
          result.push({ key: i, value: structure });
        }
      } else if (typeof item !== 'function') {
        result.push({ key: i });
      }
    }
    return result;
  } else {
    const result: Array<{ key: string; value?: any }> = [];
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const value = source[key];
        if (typeof value === 'function') {
          continue;
        }

        if (typeof value === 'object' && value !== null) {
          if (visited.has(value)) {
            result.push({ key, value: [] });
          } else {
            const structure = generateCleanCopyStructure(value, visited);
            result.push({ key, value: structure });
          }
        } else if (typeof value !== 'function') {
          result.push({ key });
        }
      }
    }
    return result;
  }
}

export function createCleanCopyFromStructure<T extends Object | any>(
  source: T,
  structure?: Array<{ key: string | number; value?: any }>
): T {
  let struct = structure;
  if (!struct) struct = generateCleanCopyStructure(source);
  const result = {};

  for (let i = 0; i < structure.length; i++) {
    const { key, value } = structure[i];
    if (typeof value === 'object' && Array.isArray(value)) {
      if (value.length > 0)
        result[key] = createCleanCopyFromStructure(source[key], value);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

export function createCleanCopy<T extends object | any[]>(
  source: T,
  visited: WeakSet<object> = new WeakSet<object>()
): T {
  if (visited.has(source as object)) {
    return {} as T; // Handle circular references by returning an empty object
  }

  visited.add(source as object);

  if (Array.isArray(source)) {
    const arr: any[] = [];
    for (const item of source) {
      if (typeof item === 'object' && item !== null) {
        arr.push(createCleanCopy(item, visited));
      } else if (typeof item !== 'function') {
        arr.push(item);
      }
    }
    return arr as T;
  } else {
    const copy = {} as T;
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const value = source[key];
        if (typeof value === 'object' && value !== null) {
          copy[key] = createCleanCopy(value, visited);
        } else if (typeof value !== 'function') {
          copy[key] = value;
        }
      }
    }
    return copy;
  }
}

export type SharedValueTree<T> = ReturnType<typeof makeMutable<T>>;

export const structs = new Map<
  string,
  Array<{ key: string | number; value?: any }>
>();

export function createSharedCopy<T extends object | any[]>(
  source: T,
  id?: string
): SharedValueTree<T> {
  const visited = new WeakSet<object>();
  let struct;
  if (id) struct = structs.get(id);
  if (!struct) struct = generateCleanCopyStructure(source, visited);

  if (id) structs.set(id, struct);
  const cleanCopy = createCleanCopyFromStructure(source, struct);
  const mutable = makeMutable(cleanCopy);

  return mutable;
}
