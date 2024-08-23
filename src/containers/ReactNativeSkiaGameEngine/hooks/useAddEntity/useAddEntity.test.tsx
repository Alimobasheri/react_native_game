import { renderHook } from '@testing-library/react-native';
import { useAddEntity } from './useAddEntity';
import { RNSGEContext } from '../../context/RNSGEContext';
import { Entity } from '../../services/Entity';
import { Entities } from '../../services/Entities';
import { IEntityOptions } from '../../services';

describe('useAddEntity', () => {
  let mockEntities: Entities;
  let mockAddEntity: jest.SpyInstance;
  let mockContextValue: any;

  beforeEach(() => {
    mockEntities = new Entities();
    mockAddEntity = jest.spyOn(mockEntities, 'addEntity');

    mockContextValue = {
      entities: { current: mockEntities },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should create and add an entity with the provided data', () => {
    const data = { translateX: -10 };
    const wrapper = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );

    const { result } = renderHook(() => useAddEntity(data), { wrapper });

    expect(result.current).toBeInstanceOf(Entity);
    expect(result.current.data).toEqual(data);
    expect(mockAddEntity).toHaveBeenCalledWith(result.current, undefined);
  });

  test('should use IEntityOptions when provided', () => {
    const data = { translateX: 20 };
    const options: IEntityOptions = { label: 'player', groups: ['group1'] };
    const wrapper = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );

    const { result } = renderHook(() => useAddEntity(data, options), {
      wrapper,
    });

    expect(result.current).toBeInstanceOf(Entity);
    expect(result.current.data).toEqual(data);
    expect(mockAddEntity).toHaveBeenCalledWith(result.current, options);
  });

  test('should memoize the entity creation', () => {
    const data = { translateX: 30 };
    const wrapper = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );

    const { result, rerender } = renderHook(() => useAddEntity(data), {
      wrapper,
    });

    const initialEntity = result.current;
    rerender({}); // re-render the hook

    expect(result.current).toBe(initialEntity);
    expect(mockAddEntity).toHaveBeenCalledTimes(1);
  });

  test('should handle an empty data object', () => {
    const data = {};
    const wrapper = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );

    const { result } = renderHook(() => useAddEntity(data), { wrapper });

    expect(result.current).toBeInstanceOf(Entity);
    expect(result.current.data).toEqual(data);
    expect(mockAddEntity).toHaveBeenCalledWith(result.current, undefined);
  });

  test('should throw an error if used outside of RNSGEContext', () => {
    // Suppress error log in console
    jest.spyOn(console, 'error').mockImplementation(jest.fn());

    const data = { translateX: 10 };

    // Expect the function to throw an error
    expect(() => renderHook(() => useAddEntity(data))).toThrow(
      'useAddEntity must be used within a RNSGEContext'
    );
  });

  test('should support complex data structures', () => {
    const data = {
      position: { x: 100, y: 200 },
      velocity: { x: 0, y: 0 },
      health: 100,
    };
    const wrapper = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );

    const { result } = renderHook(() => useAddEntity(data), { wrapper });

    expect(result.current).toBeInstanceOf(Entity);
    expect(result.current.data).toEqual(data);
    expect(mockAddEntity).toHaveBeenCalledWith(result.current, undefined);
  });

  test('should not re-add the entity if the data or options change', () => {
    const initialData = { translateX: 40 };
    const updatedData = { translateX: 50 };
    const wrapper = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );

    const { result, rerender } = renderHook(({ data }) => useAddEntity(data), {
      initialProps: { data: initialData },
      wrapper,
    });

    rerender({ data: updatedData });

    expect(result.current.data).toEqual(initialData); // The entity remains the same
    expect(mockAddEntity).toHaveBeenCalledTimes(1);
  });
});
