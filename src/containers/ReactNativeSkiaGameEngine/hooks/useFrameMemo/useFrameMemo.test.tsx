import { renderHook, act } from '@testing-library/react-native';
import { useFrameMemo } from './useFrameMemo';
import { Entity, FrameUpdateEvent, Frames } from '../../services';
import { RNSGEContext } from '../../context/RNSGEContext';
import React from 'react';
import { EmitterSubscription } from 'react-native';

describe('useFrameMemo', () => {
  let mockEntity: Entity<{ position: number }>;
  let mockFrames: Frames;
  let mockContextValue: any;

  beforeEach(() => {
    mockEntity = new Entity({ position: 0 });
    mockFrames = new Frames();

    const mockEntities = {
      current: {
        entities: new Map([['entityId', mockEntity]]),
      },
    };

    const mockFramesRef = {
      current: mockFrames,
    };

    mockContextValue = {
      entities: mockEntities,
      frames: mockFramesRef,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should memoize value based on entity property and update on frame updates', () => {
    const factory = jest.fn(
      (currentValue) => `calculatedValue_${currentValue}`
    );
    const wrapper = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );

    const { result } = renderHook(
      () => useFrameMemo(factory, { entityId: 'entityId', key: 'position' }),
      { wrapper }
    );

    // Initial render, memoized value should be calculated
    expect(factory).toHaveBeenCalledTimes(1);
    expect(result.current).toBe('calculatedValue_0');

    // Simulate a frame update without changing the entity's property
    act(() => {
      mockFrames.emit(FrameUpdateEvent);
    });

    // Factory shouldn't be called again due to the frame update, because the value should remain the same
    expect(factory).toHaveBeenCalledTimes(1);
    expect(result.current).toBe('calculatedValue_0');

    // Change the entity's position
    act(() => {
      mockEntity.data.position = 1;
      mockFrames.emit(FrameUpdateEvent);
    });

    // Factory should be called again because the value has changed
    expect(factory).toHaveBeenCalledTimes(2);
    expect(result.current).toBe('calculatedValue_1');
  });

  test('should throw an error if used outside of RNSGEContext', () => {
    jest.spyOn(console, 'error').mockImplementation(jest.fn());

    const factory = jest.fn(() => 'calculatedValue');

    expect(() =>
      renderHook(() =>
        useFrameMemo(factory, { entityId: 'entityId', key: 'position' })
      )
    ).toThrow(new Error('useFrameMemo must be used within a RNSGEContext'));
  });

  test('should use custom equalityCheck and update value accordingly', () => {
    const factory = jest.fn(() => 'calculatedValue');
    const customEqualityCheck = jest.fn(
      (prevValue, nextValue) => prevValue === nextValue
    );
    const wrapper = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );

    const { result } = renderHook(
      () =>
        useFrameMemo(
          factory,
          { entityId: 'entityId', key: 'position' },
          customEqualityCheck
        ),
      { wrapper }
    );

    // Initial render, memoized value should be calculated
    expect(factory).toHaveBeenCalledTimes(1);
    expect(result.current).toBe('calculatedValue');

    // Simulate a frame update without changing the entity's property
    act(() => {
      mockFrames.emit(FrameUpdateEvent);
    });

    // Custom equalityCheck should be called, but factory shouldn't be because value hasn't changed
    expect(customEqualityCheck).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(result.current).toBe('calculatedValue');

    // Change the entity's position
    act(() => {
      mockEntity.data.position = 1;
      mockFrames.emit(FrameUpdateEvent);
    });

    // Custom equalityCheck and factory should both be called again
    expect(customEqualityCheck).toHaveBeenCalledTimes(2);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(result.current).toBe('calculatedValue');
  });

  test('should not update memoized value if equalityCheck returns true', () => {
    const factory = jest.fn(() => 'calculatedValue');
    const equalityCheck = jest.fn(() => true); // Always returns true
    const wrapper = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );

    const { result } = renderHook(
      () =>
        useFrameMemo(
          factory,
          { entityId: 'entityId', key: 'position' },
          equalityCheck
        ),
      { wrapper }
    );

    // Initial render, memoized value should be calculated
    expect(factory).toHaveBeenCalledTimes(1);
    expect(result.current).toBe('calculatedValue');

    // Simulate a frame update and change the entity's position
    act(() => {
      mockEntity.data.position = 1;
      mockFrames.emit(FrameUpdateEvent);
    });

    // Since the equalityCheck always returns true, the factory should not be called again
    expect(factory).toHaveBeenCalledTimes(1);
    expect(result.current).toBe('calculatedValue');
  });

  test('should handle entity not found scenario', () => {
    const factory = jest.fn(() => 'defaultValue');
    const wrapper = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );

    const { result } = renderHook(
      () =>
        useFrameMemo(factory, {
          entityId: 'nonExistentEntityId',
          key: 'position',
        }),
      { wrapper }
    );

    // Since the entity is not found, the factory should be called once with default values
    expect(factory).toHaveBeenCalledTimes(1);
    expect(result.current).toBe('defaultValue');
  });

  test('should properly clean up event listener on unmount', () => {
    const factory = jest.fn(() => 'calculatedValue');
    const wrapper = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );

    const removeListenerSpy = jest.fn();
    // @ts-ignore
    const mockEmitterSubscription: EmitterSubscription = {
      emitter: mockFrames,
      listener: jest.fn(),
      context: null,
      eventType: 'frameUpdate',
      remove: removeListenerSpy,
      key: 12,
      subscriber: {
        addSubscription: jest.fn(),
        removeAllSubscriptions: jest.fn(),
        removeSubscription: jest.fn(),
        getSubscriptionsForType: jest.fn(),
      },
    };

    jest
      .spyOn(mockFrames, 'addListener')
      .mockReturnValue(mockEmitterSubscription);

    const { unmount } = renderHook(
      () => useFrameMemo(factory, { entityId: 'entityId', key: 'position' }),
      { wrapper }
    );

    // Unmount the hook
    unmount();

    // Ensure that the event listener's remove method was called
    expect(removeListenerSpy).toHaveBeenCalled();
  });

  test('should not update memoized value if entity property remains unchanged', () => {
    const factory = jest.fn(() => 'calculatedValue');
    const wrapper = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );

    const { result } = renderHook(
      () => useFrameMemo(factory, { entityId: 'entityId', key: 'position' }),
      { wrapper }
    );

    // Initial render, memoized value should be calculated
    expect(factory).toHaveBeenCalledTimes(1);
    expect(result.current).toBe('calculatedValue');

    // Simulate a frame update without changing the entity's property
    act(() => {
      mockFrames.emit(FrameUpdateEvent);
    });

    // Factory should not be called again because the dependency hasn't changed
    expect(factory).toHaveBeenCalledTimes(1);
    expect(result.current).toBe('calculatedValue');
  });
});
