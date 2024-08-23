import { renderHook } from '@testing-library/react-native';
import { useEntities } from './useEntities';
import { Entities } from '../../services/Entities';

describe('useEntities', () => {
  test('should return a reference to an Entities instance', () => {
    const { result } = renderHook(() => useEntities());

    // Ensure that the returned value is a ref object with a current property of type Entities
    expect(result.current).toBeDefined();
    expect(result.current.current).toBeInstanceOf(Entities);
  });

  test('should provide a stable Entities instance across renders', () => {
    const { result, rerender } = renderHook(() => useEntities());

    // Capture the initial instance of Entities
    const initialEntitiesInstance = result.current.current;

    // Re-render the component and check that the Entities instance is the same
    rerender({});

    expect(result.current.current).toBe(initialEntitiesInstance);
  });

  test('should allow interaction with the Entities instance', () => {
    const { result } = renderHook(() => useEntities());

    const entities = result.current.current;

    // Add an entity
    entities.addEntity({ id: 'entity1' } as any, { label: 'player' });

    // Retrieve the entity by label
    const entity = entities.getEntityByLabel('player');

    expect(entity).toBeDefined();
    expect(entity?.id).toBe('entity1');
  });

  test('should return different Entities instances for multiple hook calls', () => {
    const { result: result1 } = renderHook(() => useEntities());
    const { result: result2 } = renderHook(() => useEntities());

    // The instances returned by the two hooks should be different
    expect(result1.current.current).not.toBe(result2.current.current);
  });
});
