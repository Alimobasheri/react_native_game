import { renderHook, act } from '@testing-library/react-native';
import { useEntityMemoizedValue } from './useEntityMemoizedValue';
import { Entity } from '../../services/Entity';
import { RNSGEContext } from '../../context/RNSGEContext';
import { Frames, FrameUpdateEvent } from '../../services/Frames';
import { Entities, AddEntityEvent } from '../../services/Entities';
import React from 'react';

describe('useEntityMemoizedValue', () => {
  let mockEntity: Entity<{ positionX: number; health: number }>;
  let mockFrames: Frames;
  let mockEntities: Entities;
  let mockContextValue: any;

  beforeEach(() => {
    mockEntity = new Entity(
      { positionX: 10, health: 100 },
      undefined,
      'player'
    );
    mockFrames = new Frames();
    mockEntities = new Entities(new Map([[mockEntity.id, mockEntity]]));

    const mockEntitiesRef = { current: mockEntities };
    const mockFramesRef = { current: mockFrames };

    mockContextValue = {
      entities: mockEntitiesRef,
      frames: mockFramesRef,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should memoize value based on entity ID', () => {
    const wrapper = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );

    const { result } = renderHook(
      () => useEntityMemoizedValue(mockEntity.id, 'positionX'),
      { wrapper }
    );

    expect(result.current).toBe(10);

    act(() => {
      mockEntity.data = { ...mockEntity.data, positionX: 20 };
      mockFrames.emit(FrameUpdateEvent);
    });

    expect(result.current).toBe(20);
  });

  test('should memoize value based on entity label', () => {
    const wrapper = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );

    const { result } = renderHook(
      () => useEntityMemoizedValue({ label: 'player' }, 'health'),
      { wrapper }
    );

    expect(result.current).toBe(100);

    act(() => {
      mockEntity.data = { ...mockEntity.data, health: 90 };
      mockFrames.emit(FrameUpdateEvent);
    });

    expect(result.current).toBe(90);
  });

  test('should return default value if entity or key not found', () => {
    const wrapper = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );

    const { result } = renderHook(
      () =>
        useEntityMemoizedValue('nonexistent', 'positionX', {
          defaultValue: 50,
        }),
      { wrapper }
    );

    expect(result.current).toBe(50);
  });

  test('should update entity if added after hook initialization by label', () => {
    const wrapper = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );

    const { result } = renderHook(
      () =>
        useEntityMemoizedValue({ label: 'newPlayer' }, 'positionX', {
          defaultValue: 0,
        }),
      { wrapper }
    );

    expect(result.current).toBe(0);

    act(() => {
      const newEntity = new Entity({ positionX: 30 }, undefined, 'newPlayer');
      mockEntities.addEntity(newEntity);
      mockFrames.emit(FrameUpdateEvent);
    });

    expect(result.current).toBe(30);
  });

  test('should use processor function if provided', () => {
    const processor = jest.fn((value) => value * 2);

    const wrapper = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );

    const { result } = renderHook(
      () => useEntityMemoizedValue(mockEntity.id, 'positionX', { processor }),
      { wrapper }
    );

    expect(processor).toHaveBeenCalledWith(10);
    expect(result.current).toBe(20);

    act(() => {
      mockEntity.data = { ...mockEntity.data, positionX: 15 };
      mockFrames.emit(FrameUpdateEvent);
    });

    expect(processor).toHaveBeenCalledWith(15);
    expect(result.current).toBe(30);
  });

  test('should use comparator function if provided', () => {
    const comparator = jest.fn((prev, next) => prev === next);

    const wrapper = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );

    const { result } = renderHook(
      () => useEntityMemoizedValue(mockEntity.id, 'positionX', { comparator }),
      { wrapper }
    );

    // On initial frame there's nothing to compare values.
    expect(comparator).toHaveBeenCalledTimes(0);
    expect(result.current).toBe(10);

    act(() => {
      mockEntity.data = { ...mockEntity.data, positionX: 15 };
      mockFrames.emit(FrameUpdateEvent);
    });

    expect(comparator).toHaveBeenCalledWith(10, 15);
    expect(result.current).toBe(15);
  });

  test('should handle entity not found scenario', () => {
    const wrapper = ({ children }: any) => (
      <RNSGEContext.Provider value={mockContextValue}>
        {children}
      </RNSGEContext.Provider>
    );

    const { result } = renderHook(
      () =>
        useEntityMemoizedValue('nonexistent', 'positionX', {
          defaultValue: 50,
        }),
      { wrapper }
    );

    expect(result.current).toBe(50);
  });
});
