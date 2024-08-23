import { renderHook } from '@testing-library/react-native';
import { useSystems } from './useSystems';
import { Systems } from '../../services/Systems';

describe('useSystems', () => {
  test('should return a reference to a Systems instance', () => {
    const { result } = renderHook(() => useSystems());

    // Ensure that the returned value is a ref object with a current property of type Systems
    expect(result.current).toBeDefined();
    expect(result.current.current).toBeInstanceOf(Systems);
  });

  test('should provide a stable Systems instance across renders', () => {
    const { result, rerender } = renderHook(() => useSystems());

    // Capture the initial instance of Systems
    const initialSystemsInstance = result.current.current;

    // Re-render the component and check that the Systems instance is the same
    rerender({});

    expect(result.current.current).toBe(initialSystemsInstance);
  });

  test('should allow adding systems to the Systems instance', () => {
    const { result } = renderHook(() => useSystems());

    const systems = result.current.current;
    const mockSystem = jest.fn();

    // Add a system to the Systems instance
    systems.addSystem(mockSystem);

    // The system should be added to the internal systems array
    expect(systems['_systems']).toContain(mockSystem);
  });

  test('should allow executing systems through the Systems instance', () => {
    const { result } = renderHook(() => useSystems());

    const systems = result.current.current;
    const mockSystem = jest.fn();

    systems.addSystem(mockSystem);

    // Create mock entities and args to pass to the update method
    const mockEntities = {};
    const mockArgs = {};

    systems.update(mockEntities as any, mockArgs as any);

    // The system should have been called with the correct arguments
    expect(mockSystem).toHaveBeenCalledTimes(1);
    expect(mockSystem).toHaveBeenCalledWith(mockEntities, mockArgs);
  });

  test('should return different Systems instances for multiple hook calls', () => {
    const { result: result1 } = renderHook(() => useSystems());
    const { result: result2 } = renderHook(() => useSystems());

    // The instances returned by the two hooks should be different
    expect(result1.current.current).not.toBe(result2.current.current);
  });
});
