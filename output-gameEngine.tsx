Directory Folder Name contents:
// src/containers/ReactNativeSkiaGameEngine/RNSGE.tsx:
import { FC, memo, PropsWithChildren, useMemo, useState } from 'react';
import {
  useEntities,
  useGameLoop,
  useSystems,
  useTouchService,
  useDispatcher,
} from './hooks';
import { RNSGEContext } from './context';
import { MemoizedContainer } from './components/MemoizedContainer';
import { Canvas } from '@shopify/react-native-skia';
import {
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

export const ReactNativeSkiaGameEngine: FC<PropsWithChildren> = memo(
  ({ children }) => {
    const entities = useEntities();
    const systems = useSystems();
    const dispatcher = useDispatcher();
    const touchService = useTouchService();
    const { frames } = useGameLoop(entities, systems, dispatcher);
    const [dimensions, setDimensions] = useState<{
      width: number | null;
      height: number | null;
    }>({ width: null, height: null });
    const value = useMemo(
      () => ({
        entities: entities,
        systems: systems,
        frames: frames,
        dispatcher,
        touchService,
        dimensions,
      }),
      [touchService.gestures, dimensions]
    );
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={touchService.gestures}>
          <Canvas
            style={{ flex: 1 }}
            onLayout={({
              nativeEvent: {
                layout: { width, height },
              },
            }) => setDimensions({ width, height })}
          >
            <RNSGEContext.Provider value={value}>
              {dimensions.width !== null && dimensions.height !== null && (
                <MemoizedContainer>{children}</MemoizedContainer>
              )}
            </RNSGEContext.Provider>
          </Canvas>
        </GestureDetector>
      </GestureHandlerRootView>
    );
  }
);

// components Files:
  // src/containers/ReactNativeSkiaGameEngine/components/MemoizedContainer.tsx:
import { FC, memo, PropsWithChildren } from "react";

export const MemoizedContainer: FC<PropsWithChildren> = memo(({ children }) => {
  return <>{children}</>;
});

// context Files:
  // src/containers/ReactNativeSkiaGameEngine/context/RNSGEContext.ts:
import { createContext } from 'react';
import { IRNSGEContextValue } from './types';
import { Entities, Frames, Systems, EventDispatcher } from '../services';
import { Gesture } from 'react-native-gesture-handler';

export const RNSGEContext = createContext<IRNSGEContextValue | undefined>(
  undefined
);

  // src/containers/ReactNativeSkiaGameEngine/context/index.ts:
export * from "./RNSGEContext";
export * from "./types";

  // src/containers/ReactNativeSkiaGameEngine/context/types.ts:
import { MutableRefObject } from "react";
import {
  Entities,
  EventDispatcher,
  Frames,
  Systems,
  TouchHandler,
} from "../services";
import { ComposedGesture, GestureType } from "react-native-gesture-handler";

export interface ICanvasDimensions {
  width: number | null;
  height: number | null;
}

export interface IRNSGEContextValue {
  entities: MutableRefObject<Entities>;
  systems: MutableRefObject<Systems>;
  frames: MutableRefObject<Frames>;
  dispatcher: MutableRefObject<EventDispatcher>;
  touchService: {
    gestures: ComposedGesture;
    addGesture: (gesture: GestureType) => void;
  };
  dimensions: ICanvasDimensions;
}

// hooks Files:
  // src/containers/ReactNativeSkiaGameEngine/hooks/index.ts:
export * from './useAddEntity';
export * from './useEntities';
export * from './useEntityValue';
export * from './useGameLoop';
export * from './useSystem';
export * from './useSystems';
export * from './useFrameMemo';
export * from './useEntityInstance';
export * from './useEntityMemoizedValue';
export * from './useTouchHandler';
export * from './useTouchService';
export * from './useCanvasDimensions';
export * from './useEntityState';
export * from './useDispatcher';

  // useAddEntity Files:
    // src/containers/ReactNativeSkiaGameEngine/hooks/useAddEntity/index.ts:
export * from './useAddEntity';

    // src/containers/ReactNativeSkiaGameEngine/hooks/useAddEntity/useAddEntity.test.tsx:
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

    // src/containers/ReactNativeSkiaGameEngine/hooks/useAddEntity/useAddEntity.ts:
import { useContext, useMemo } from 'react';
import { RNSGEContext } from '../../context/RNSGEContext';
import { Entity } from '../../services/Entity';
import { IEntityOptions } from '../../services';

/**
 * A React hook that adds a new entity to the game engine's entities list and returns the created entity instance.
 *
 * This hook is designed to work within the context of the React Native Skia Game Engine (RNSGE).
 * It creates a new entity with the provided data and options, adds it to the game engine's entity management system,
 * and memoizes the entity to ensure it is only created and added once.
 *
 * @template T - The type of data associated with the entity.
 *
 * @param {T} data - The data object to associate with the new entity. This data typically contains initial properties such as position, velocity, etc.
 * @param {IEntityOptions} [options] - Optional settings for the entity, such as labels and groups.
 *
 * @returns {Entity<T>} The newly created entity instance.
 *
 * @example
 * const entity = useAddEntity({ translateX: -10 });
 *
 * // Access the entity's data
 * console.log(entity.data.translateX); // Output: -10
 */
export function useAddEntity<T extends Record<string, any>>(
  data: T,
  options?: IEntityOptions
) {
  const context = useContext(RNSGEContext);

  if (!context) {
    throw new Error('useAddEntity must be used within a RNSGEContext');
  }

  const entity = useMemo(() => {
    const entityInstance = new Entity<T>(data);
    context.entities.current.addEntity(entityInstance, options);
    return entityInstance;
  }, []);

  return entity;
}

  // src/containers/ReactNativeSkiaGameEngine/hooks/useCanvasDimensions.ts:
import { useContext } from "react";
import { RNSGEContext } from "../context";

export const useCanvasDimensions = () => {
  const rnsgeContext = useContext(RNSGEContext);
  return rnsgeContext.dimensions;
};

  // src/containers/ReactNativeSkiaGameEngine/hooks/useDispatchEvent.ts:
import { useContext } from "react";
import { RNSGEContext } from "../context/RNSGEContext";

export const useDispatchEvent = () => {
  const { dispatcher } = useContext(RNSGEContext);

  const dispatchEvent = (event: string, data?: any) => {
    dispatcher.current.emitEvent(event, data);
  };

  return dispatchEvent;
};

  // useDispatcher Files:
    // src/containers/ReactNativeSkiaGameEngine/hooks/useDispatcher/index.ts:
export * from './useDispatcher';

    // src/containers/ReactNativeSkiaGameEngine/hooks/useDispatcher/useDispatcher.test.ts:
import { renderHook } from '@testing-library/react-native';
import { useDispatcher } from './useDispatcher';
import { EventDispatcher } from '../../services';

describe('useDispatcher', () => {
  test('should return a reference to an EventDispatcher instance', () => {
    const { result } = renderHook(() => useDispatcher());

    // Ensure that the returned value is a ref object with a current property of type EventDispatcher
    expect(result.current).toBeDefined();
    expect(result.current.current).toBeInstanceOf(EventDispatcher);
  });

  test('should provide a stable EventDispatcher instance across renders', () => {
    const { result, rerender } = renderHook(() => useDispatcher());

    // Capture the initial instance of EventDispatcher
    const initialDispatcherInstance = result.current.current;

    // Re-render the component and check that the EventDispatcher instance is the same
    rerender({});

    expect(result.current.current).toBe(initialDispatcherInstance);
  });

  test('should allow dispatching events using the EventDispatcher instance', () => {
    const { result } = renderHook(() => useDispatcher());

    const dispatcher = result.current.current;
    const mockListener = jest.fn();

    // Add a listener to the dispatcher
    dispatcher.addListener('TestEvent', mockListener);

    // Dispatch an event
    dispatcher.emitEvent('TestEvent', { key: 'value' });

    // The listener should have been called with the correct event data
    expect(mockListener).toHaveBeenCalledTimes(1);
    expect(mockListener).toHaveBeenCalledWith({ key: 'value' });
  });

  test('should allow adding and removing global listeners using EventDispatcher', () => {
    const { result } = renderHook(() => useDispatcher());

    const dispatcher = result.current.current;
    const mockGlobalListener = jest.fn();

    // Add a global listener
    const listenerId = dispatcher.addListenerToAllEvents(mockGlobalListener);

    // Dispatch an event
    dispatcher.emitEvent('AnotherEvent', { foo: 'bar' });

    // The global listener should have been called with the event data
    expect(mockGlobalListener).toHaveBeenCalledTimes(1);
    expect(mockGlobalListener).toHaveBeenCalledWith({ foo: 'bar' });

    // Remove the global listener
    dispatcher.removeListenerToAllEvents(listenerId);

    // Dispatch another event
    dispatcher.emitEvent('AnotherEvent', { foo: 'baz' });

    // The global listener should not be called again
    expect(mockGlobalListener).toHaveBeenCalledTimes(1); // Still 1, as it was removed
  });

  test('should return different EventDispatcher instances for multiple hook calls', () => {
    const { result: result1 } = renderHook(() => useDispatcher());
    const { result: result2 } = renderHook(() => useDispatcher());

    // The instances returned by the two hooks should be different
    expect(result1.current.current).not.toBe(result2.current.current);
  });
});

    // src/containers/ReactNativeSkiaGameEngine/hooks/useDispatcher/useDispatcher.ts:
import { useRef } from 'react';
import { EventDispatcher } from '../../services';

/**
 * A React hook that provides a stable reference to a singleton instance of the `EventDispatcher` class,
 * used for managing and dispatching global events within the game engine.
 *
 * This hook ensures that the `EventDispatcher` instance persists across renders,
 * allowing consistent event dispatching and handling throughout the lifecycle of the game.
 *
 * @returns {React.MutableRefObject<EventDispatcher>} - A reference to the `EventDispatcher` instance.
 *
 * @example
 * const dispatcher = useDispatcher();
 *
 * // Access the EventDispatcher instance:
 * const eventDispatcher = dispatcher.current;
 *
 * // Dispatch an event:
 * eventDispatcher.emitEvent('MyEvent', { key: 'value' });
 *
 * // Add a listener to a global event:
 * eventDispatcher.addListener('MyEvent', (data) => {
 *   console.log(data);
 * });
 *
 * // Remove the listener:
 * const listenerId = eventDispatcher.addListenerToAllEvents((data) => {
 *   console.log('Global Event:', data);
 * });
 * eventDispatcher.removeListenerToAllEvents(listenerId);
 */
export const useDispatcher = () => {
  const dispatcherRef = useRef<EventDispatcher>(new EventDispatcher());
  return dispatcherRef;
};

  // useEntities Files:
    // src/containers/ReactNativeSkiaGameEngine/hooks/useEntities/index.ts:
export * from './useEntities';

    // src/containers/ReactNativeSkiaGameEngine/hooks/useEntities/useEntities.test.ts:
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

    // src/containers/ReactNativeSkiaGameEngine/hooks/useEntities/useEntities.ts:
import { useRef } from 'react';
import { Entities } from '../../services/Entities';

/**
 * A React hook that provides a stable reference to a singleton instance of the `Entities` class,
 * used for managing entities within the game engine.
 *
 * This hook ensures that the `Entities` instance persists across renders,
 * allowing it to manage and track entities consistently throughout the lifecycle of the game.
 *
 * @returns {React.MutableRefObject<Entities>} - A reference to the `Entities` instance.
 *
 * @example
 * const entities = useEntities();
 *
 * // Access the Entities instance:
 * const allEntities = entities.current.entities;
 *
 * // Add a new entity:
 * entities.current.addEntity(newEntity, { label: "player" });
 */
export const useEntities = () => {
  const entitiesRef = useRef<Entities>(new Entities());
  return entitiesRef;
};

  // src/containers/ReactNativeSkiaGameEngine/hooks/useEntityInstance.ts:
import {
  MutableRefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { RNSGEContext } from "../context";
import { AddEntityEvent, Entity } from "../services";
import { useFrameEffect } from "./useFrameEffect";

export type entityIdentifier = {
  label?: string;
  group?: string;
};

export const useEntityInstance = <T>(
  entityId: string | entityIdentifier
): {
  entity: MutableRefObject<Entity<T> | Entity<T>[] | undefined>;
  found: MutableRefObject<boolean>;
} => {
  const rnsgeContext = useContext(RNSGEContext);

  const found = useRef(true);

  const findEntityAndReturn = useCallback(() => {
    if (typeof entityId === "string") {
      if (!rnsgeContext.entities.current.entities.has(entityId)) {
        found.current = false;
        return;
      }
      return rnsgeContext.entities.current.entities.get(entityId);
    } else if (typeof entityId === "object") {
      const { label, group } = entityId;
      if (label) {
        if (rnsgeContext.entities.current.mapLabelToEntityId.has(label)) {
          found.current = true;
          return rnsgeContext.entities.current.getEntityByLabel(label);
        }
      } else if (group) {
        if (rnsgeContext.entities.current.mapGroupIdToEntities.has(group)) {
          found.current = true;
          return rnsgeContext.entities.current.getEntitiesByGroup(group);
        }
      }
    }
    found.current = false;
  }, [entityId]);

  const instance = useRef(findEntityAndReturn());

  useFrameEffect(() => {
    instance.current = findEntityAndReturn();
  }, []);

  return { entity: instance, found: found };
};

  // useEntityMemoizedValue Files:
    // src/containers/ReactNativeSkiaGameEngine/hooks/useEntityMemoizedValue/index.ts:
export * from './useEntityMemoizedValue';

    // src/containers/ReactNativeSkiaGameEngine/hooks/useEntityMemoizedValue/useEntityMemoizedValue.test.tsx:
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

  test.only('should update entity if added after hook initialization by label', () => {
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

    expect(comparator).toHaveBeenCalled();
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

    // src/containers/ReactNativeSkiaGameEngine/hooks/useEntityMemoizedValue/useEntityMemoizedValue.ts:
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { RNSGEContext } from '../../context/RNSGEContext';
import { Entity } from '../../services/Entity';
import { AddEntityEvent } from '../../services/Entities';
import { useFrameMemo } from '../useFrameMemo';
import { EntityOptions } from '../useEntityValue';
import { entityIdentifier } from '../useEntityInstance';

/**
 * A React hook that retrieves and memoizes a specific value from an entity's data
 * within the game engine. It supports accessing the entity by ID or label.
 * The value is updated only when the specified entity's data or the specified key changes,
 * optimizing performance by avoiding unnecessary re-renders.
 *
 * @template E - The type of the entity's data structure.
 * @template T - The type of the memoized value.
 *
 * @param {string | entityIdentifier} entityIdOrLabel - The unique identifier or label of the entity from which to retrieve the value.
 * @param {keyof E} key - The key in the entity's data object whose value is to be memoized.
 * @param {EntityOptions<T>} [options={}] - Optional configuration object.
 * @param {function(any): T} [options.processor] - A function to process the value before memoization.
 * @param {T} [options.defaultValue] - A default value to return if the entity or key is not found.
 * @param {function(T | undefined, T | undefined): boolean} [options.comparator] - A function to compare the previous and next values to determine if an update is needed.
 *
 * @returns {T | undefined} - The memoized value corresponding to the specified key in the entity's data.
 *
 * @throws {Error} - Throws an error if the hook is used outside of an RNSGEContext.
 *
 * @example
 * // Basic usage to retrieve and memoize the 'positionX' value of an entity by ID
 * const positionX = useEntityMemoizedValue('entity1', 'positionX');
 * console.log(positionX); // Outputs the current X position of 'entity1'
 *
 * @example
 * // Retrieve and memoize the value using an entity label
 * const health = useEntityMemoizedValue({ label: 'player' }, 'health');
 * console.log(health); // Outputs the health of the entity labeled 'player'
 */
export function useEntityMemoizedValue<E extends Record<string, any>, T>(
  entityIdOrLabel: string | entityIdentifier,
  key: keyof E,
  options: EntityOptions<T> = {}
): T | undefined {
  const { processor, defaultValue, comparator } = options;
  const rnsgeContext = useContext(RNSGEContext);

  if (!rnsgeContext) {
    throw new Error(
      'useEntityMemoizedValue must be used within a RNSGEContext'
    );
  }

  const entities = rnsgeContext.entities;

  const getValue = useCallback(
    (entity: Entity<E> | undefined, key: keyof E): T | undefined => {
      if (!entity?.id) {
        return defaultValue;
      }
      return processor ? processor(entity.data[key]) : (entity.data[key] as T);
    },
    [processor, defaultValue]
  );

  const areValuesEqual = useCallback(
    (prevValue: T | undefined, nextValue: T | undefined): boolean => {
      return comparator
        ? comparator(prevValue, nextValue)
        : prevValue === nextValue;
    },
    [comparator]
  );

  const foundEntity = useMemo((): Entity<E> | undefined => {
    if (typeof entityIdOrLabel === 'string') {
      return entities.current.entities.get(entityIdOrLabel);
    } else if (typeof entityIdOrLabel === 'object') {
      return entities.current.getEntityByLabel(entityIdOrLabel.label!);
    }
    return undefined;
  }, [entityIdOrLabel, entities]);

  const [entity, setEntity] = useState<Entity<E> | undefined>(foundEntity);

  const memoizedValue = useFrameMemo<E, T | undefined>(
    (value, entity) => getValue(entity, key),
    { entityId: entity?.id || '', key }
  );

  useEffect(() => {
    if (!entity) {
      const listener = entities.current.addListener(
        AddEntityEvent,
        ({ entity }: { entity: Entity<any> }) => {
          if (
            (typeof entityIdOrLabel === 'string' &&
              entity.id === entityIdOrLabel) ||
            (typeof entityIdOrLabel === 'object' &&
              entity.label === entityIdOrLabel.label)
          ) {
            setEntity(entity);
          }
        }
      );
      return () => {
        listener.remove();
      };
    }
  }, [entity, entityIdOrLabel, entities]);

  return memoizedValue;
}

  // src/containers/ReactNativeSkiaGameEngine/hooks/useEntityState.ts:
import {
  Dispatch,
  MutableRefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { RNSGEContext } from "../context";
import { AddEntityEvent, Entity } from "../services";
import { useFrameEffect } from "./useFrameEffect";
import { deepEqual } from "../utils/deepEqual";
import { entityIdentifier } from "./useEntityInstance";

export const useEntityState = <T>(
  entityId: string | entityIdentifier
): {
  entity: Entity<T> | Entity<T>[] | undefined | null;
  found: boolean;
} => {
  const rnsgeContext = useContext(RNSGEContext);

  const [found, setFound] = useState<boolean>(true);

  const findEntityAndReturn = useCallback(
    (
      setFound: Dispatch<boolean>,
      found: boolean,
      instance: Entity<T> | Entity<T>[] | null = null,
      setInstance: null | Dispatch<Entity<T> | Entity<T>[] | undefined> = null
    ) => {
      if (typeof entityId === "string") {
        if (!rnsgeContext.entities.current.entities.has(entityId)) {
          setFound(false);
          if (typeof setInstance === "function") setInstance(undefined);
          return;
        }
        const entity = rnsgeContext.entities.current.entities.get(entityId);
        if (Array.isArray(instance) || instance?.id != entity?.id) {
          setFound(true);
          if (typeof setInstance === "function") setInstance(entity);
          return entity;
        }
      } else if (typeof entityId === "object") {
        const { label, group } = entityId;
        if (label) {
          if (rnsgeContext.entities.current.mapLabelToEntityId.has(label)) {
            setFound(true);
            const entity =
              rnsgeContext.entities.current.getEntityByLabel(label);
            if (Array.isArray(instance) || instance?.id != entity?.id) {
              setFound(true);
              if (typeof setInstance === "function") setInstance(entity);
              return entity;
            }
          }
        } else if (group) {
          if (rnsgeContext.entities.current.mapGroupIdToEntities.has(group)) {
            const entities =
              rnsgeContext.entities.current.getEntitiesByGroup(group);
            if (!Array.isArray(instance)) {
              setFound(true);
              if (typeof setInstance === "function") setInstance(entities);
              return entities;
            } else {
              const instanceIds = instance.map((e) => e.id);
              const entitiesIds = entities.map((e) => e.id);
              if (!deepEqual(instanceIds, entitiesIds)) {
                setFound(true);
                if (typeof setInstance === "function") setInstance(entities);
                return entities;
              }
            }
          }
        }
      }
      if (found !== false) setFound(false);
      if (typeof setInstance === "function" && instance !== undefined)
        setInstance(undefined);
      return undefined;
    },
    [entityId]
  );

  const [instance, setInstance] = useState<
    Entity<T> | Entity<T>[] | undefined
  >();

  useFrameEffect(() => {
    findEntityAndReturn(setFound, found, instance, setInstance);
  }, []);

  return { entity: instance, found: found };
};

  // src/containers/ReactNativeSkiaGameEngine/hooks/useEntityValue.ts:
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

  // src/containers/ReactNativeSkiaGameEngine/hooks/useEventListener.ts:
import { useContext, useEffect } from "react";
import { RNSGEContext } from "../context/RNSGEContext";

export const useEventListener = (
  event: string,
  callback: (data?: any) => void
) => {
  const { dispatcher } = useContext(RNSGEContext);

  useEffect(() => {
    const listener = dispatcher.current.addListener(event, callback);

    return () => {
      listener.remove();
    };
  }, [dispatcher, event, callback]);
};

  // src/containers/ReactNativeSkiaGameEngine/hooks/useFrameEffect.ts:
import { useCallback, useContext, useEffect, useRef } from "react";
import { RNSGEContext } from "../context";
import { FrameUpdateEvent } from "../services";

const useThrottle = (callback: (...args: any[]) => any, limit: number) => {
  const lastCall = useRef(0);
  return useCallback(
    (...args: any[]) => {
      const now = Date.now();
      if (now - lastCall.current >= limit) {
        lastCall.current = now;
        callback(...args);
      }
    },
    [callback, limit]
  );
};

export const useFrameEffect = (
  callback: (...args: any[]) => any,
  deps: any[],
  throttleMs: number = 0
) => {
  const frames = useContext(RNSGEContext).frames;
  const stableCallback = useCallback(callback, deps);

  const throttledCallback = useThrottle(stableCallback, throttleMs);

  useEffect(() => {
    if (!frames.current) {
      console.error("Frames object is not defined in context");
      return;
    }
    const frameListener = frames.current.addListener(
      FrameUpdateEvent,
      throttledCallback
    );

    return () => {
      frameListener.remove();
    };
  }, [frames.current, throttledCallback]);
};

  // useFrameMemo Files:
    // src/containers/ReactNativeSkiaGameEngine/hooks/useFrameMemo/index.ts:
export * from './useFrameMemo';

    // src/containers/ReactNativeSkiaGameEngine/hooks/useFrameMemo/useFrameMemo.test.tsx:
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

    // src/containers/ReactNativeSkiaGameEngine/hooks/useFrameMemo/useFrameMemo.ts:
import { useContext, useEffect, useRef, useState, useMemo } from 'react';
import { Entity, FrameUpdateEvent } from '../../services';
import { RNSGEContext } from '../../context';
import { deepEqual } from '../../utils/deepEqual';

export type Factory<E extends Record<string, any>, T> = (
  currentValue: T | undefined,
  entity: Entity<E> | undefined
) => T;
export type Dep<E> = { entityId: string; key: keyof E };
export type EqualityCheck<T> = (
  prev: T | undefined,
  next: T | undefined
) => boolean;

const defaultEqualityCheck: EqualityCheck<any> = (prev, next) =>
  deepEqual(prev, next);

/**
 * A React hook that memoizes a value based on changes in an entity's properties
 * and updates it on each frame of the game loop. This is particularly useful
 * in a game engine context where you need to track and memoize values that
 * change over time with high frequency.
 *
 * @template E - The type representing the entity's data structure.
 * @template T - The type of the value being memoized.
 *
 * @param {Factory<E, T>} factory - A function that returns the value to be memoized.
 * The function receives the current value and the entity, allowing you to
 * compute the memoized value directly.
 *
 * @param {Dep<E>} dep - An object containing the entity ID and the specific property
 * key to watch for changes. The memoized value is recalculated whenever this
 * property changes.
 *
 * @param {EqualityCheck<T>} [equalityCheck=defaultEqualityCheck] - A function that compares the previous
 * and current values to determine if the memoized value should be recalculated.
 * By default, a deep comparison is used.
 *
 * @returns {T} - The memoized value, which updates whenever the specified entity
 * property changes or when a new frame is rendered and the dependencies change.
 *
 * @throws {Error} - Throws an error if used outside of the `RNSGEContext`.
 *
 * @example
 * const memoizedPosition = useFrameMemo(
 *   (currentValue, entity) => {
 *     if (entity && entity.data.position) {
 *       return calculateNewPosition(entity.data.position);
 *     }
 *     return currentValue || defaultPosition;
 *   },
 *   { entityId: 'someEntityId', key: 'position' }
 * );
 *
 * // The memoized position will be updated whenever the 'position' property
 * // of the entity changes or on each frame update.
 */
export const useFrameMemo = <E extends Record<string, any>, T>(
  factory: Factory<E, T>,
  dep: Dep<E>,
  equalityCheck: EqualityCheck<T> = defaultEqualityCheck
): T | undefined => {
  const context = useContext(RNSGEContext);
  const entities = context?.entities;
  const framesRef = context?.frames;

  if (!entities || !framesRef) {
    throw new Error('useFrameMemo must be used within a RNSGEContext');
  }

  const depsRef = useRef(dep);

  const previousValueRef = useRef<T | undefined>(
    entities.current.entities.get(dep.entityId)?.data[dep.key]
  );
  const memoizedValueRef = useRef<T | undefined>(
    entities.current.entities.get(dep.entityId)?.data[dep.key]
  );

  const initialValue = useMemo(() => {
    return factory(
      memoizedValueRef.current,
      entities.current.entities.get(dep.entityId)
    );
  }, [dep.entityId, dep.key, factory]);

  const [memoizedValue, setMemoizedValue] = useState<T | undefined>(
    initialValue
  );

  useEffect(() => {
    const updateMemoizedValue = () => {
      const entity = entities.current.entities.get(dep.entityId);
      const nextValue = entity?.data[dep.key] as T | undefined;

      if (!equalityCheck(previousValueRef.current, nextValue)) {
        previousValueRef.current = nextValue;
        memoizedValueRef.current = nextValue;

        const newValue = factory(nextValue, entity);
        setMemoizedValue(newValue);
      }
    };

    const framesListener = framesRef.current.addListener(
      FrameUpdateEvent,
      updateMemoizedValue
    );

    return () => {
      framesListener.remove();
    };
  }, [dep?.entityId, dep?.key, equalityCheck, factory, framesRef]);

  // If dep's entityId or key changes, update the memoized value instantly
  useEffect(() => {
    if (
      depsRef.current.entityId !== dep.entityId ||
      depsRef.current.key !== dep.key
    ) {
      const currentValue = entities.current.entities.get(dep.entityId)?.data[
        dep.key
      ];
      previousValueRef.current = currentValue;
      memoizedValueRef.current = currentValue;
      setMemoizedValue(
        factory(
          memoizedValueRef.current,
          entities.current.entities.get(dep.entityId)
        )
      );
    }
  }, [dep?.entityId, dep?.key]);

  return memoizedValue;
};

  // src/containers/ReactNativeSkiaGameEngine/hooks/useFrameTimeout.ts:
// src/containers/ReactNativeSkiaGameEngine/hooks/useFrameTimeout.ts
import { useContext } from "react";
import { RNSGEContext } from "../context";
import { setFrameTimeout as setFrameTimeoutFn } from "../utils/setFrameTimeout";

export const useFrameTimeout = () => {
  const { frames } = useContext(RNSGEContext);

  const setFrameTimeout = (callback: () => void, frameCount: number) => {
    return setFrameTimeoutFn(frames.current, callback, frameCount);
  };

  return setFrameTimeout;
};

  // useGameLoop Files:
    // src/containers/ReactNativeSkiaGameEngine/hooks/useGameLoop/index.ts:
export * from './useGameLoop';

    // src/containers/ReactNativeSkiaGameEngine/hooks/useGameLoop/useGameLoop.test.ts:
import { renderHook, act } from '@testing-library/react-native';
import { useGameLoop } from './useGameLoop';
import { Entities } from '../../services/Entities';
import { Systems } from '../../services/Systems';
import { EventDispatcher } from '../../services/EventDispatcher';
import {
  advanceTime,
  mockRequestAnimationFrame,
  resetTestTimers,
} from '../../utils/testUtils';

describe('useGameLoop', () => {
  let entities: { current: Entities };
  let systems: { current: Systems };
  let dispatcher: { current: EventDispatcher };

  beforeEach(() => {
    entities = { current: new Entities() };
    systems = { current: new Systems() };
    dispatcher = { current: new EventDispatcher() };

    mockRequestAnimationFrame();
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetTestTimers();
  });

  test('should initialize frames correctly', () => {
    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher)
    );

    expect(result.current.frames.current.currentFrame).toBe(0);
  });

  test('should start the game loop and update frames on each iteration', () => {
    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher)
    );

    // Simulate the first frame
    act(() => {
      advanceTime(1000 / 60);
    });

    expect(result.current.frames.current.currentFrame).toBe(0);

    // Simulate the second frame
    act(() => {
      advanceTime(1000 / 60);
    });

    expect(result.current.frames.current.currentFrame).toBe(1);
  });

  test('should call system update with correct parameters on each loop iteration', () => {
    const mockUpdate = jest.spyOn(systems.current, 'update');
    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher)
    );

    act(() => {
      advanceTime(1000 / 60);
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith(entities.current, {
      events: [],
      dispatch: dispatcher.current,
      time: expect.objectContaining({
        delta: expect.any(Number),
        current: expect.any(Number),
        previous: expect.any(Number),
      }),
      touches: [],
      screen: {},
      layout: {},
    });

    act(() => {
      advanceTime(1000 / 60);
    });

    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  test('should correctly accumulate and clear events between frames', () => {
    const mockUpdate = jest.spyOn(systems.current, 'update');
    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher)
    );

    const mockEvent = { type: 'TEST_EVENT' };

    act(() => {
      dispatcher.current.emitEvent('TEST_EVENT', mockEvent);
      advanceTime(1000 / 60);
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      entities.current,
      expect.objectContaining({
        events: [mockEvent],
      })
    );

    act(() => {
      advanceTime(1000 / 60);
    });

    expect(systems.current.update).toHaveBeenCalledWith(
      entities.current,
      expect.objectContaining({
        events: [],
      })
    );
  });

  test('should register and unregister event listeners correctly', () => {
    const addListenerSpy = jest.spyOn(
      dispatcher.current,
      'addListenerToAllEvents'
    );
    const removeListenerSpy = jest.spyOn(
      dispatcher.current,
      'removeListenerToAllEvents'
    );

    const { unmount } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher)
    );

    expect(addListenerSpy).toHaveBeenCalledTimes(1);

    unmount();

    expect(removeListenerSpy).toHaveBeenCalledTimes(1);
  });

  test('should handle multiple event emissions within a single frame', () => {
    const mockUpdate = jest.spyOn(systems.current, 'update');
    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher)
    );

    const mockEvent1 = { type: 'EVENT_1' };
    const mockEvent2 = { type: 'EVENT_2' };

    act(() => {
      dispatcher.current.emitEvent('EVENT_1', mockEvent1);
      dispatcher.current.emitEvent('EVENT_2', mockEvent2);
      advanceTime(1000 / 60);
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      entities.current,
      expect.objectContaining({
        events: [mockEvent1, mockEvent2],
      })
    );
  });

  test('should correctly calculate deltaTime and update time in system', () => {
    const mockUpdate = jest.spyOn(systems.current, 'update');
    const { result } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher)
    );

    act(() => {
      advanceTime(16.7);
      advanceTime(16.7);
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      entities.current,
      expect.objectContaining({
        time: expect.objectContaining({
          delta: expect.closeTo(16.7, 2),
          current: expect.any(Number),
          previous: expect.any(Number),
        }),
      })
    );
  });

  test('should start the game loop correctly on mount', () => {
    const requestAnimationFrameSpy = jest.spyOn(
      window,
      'requestAnimationFrame'
    );
    renderHook(() => useGameLoop(entities, systems, dispatcher));

    expect(requestAnimationFrameSpy).toHaveBeenCalled();
  });

  test('should stop the game loop and clean up on unmount', () => {
    const removeListenerSpy = jest.spyOn(
      dispatcher.current,
      'removeListenerToAllEvents'
    );
    const { unmount } = renderHook(() =>
      useGameLoop(entities, systems, dispatcher)
    );

    unmount();

    expect(removeListenerSpy).toHaveBeenCalled();
  });
});

    // src/containers/ReactNativeSkiaGameEngine/hooks/useGameLoop/useGameLoop.ts:
import { MutableRefObject, useEffect, useRef } from 'react';
import { Entities } from '../../services/Entities';
import { Systems } from '../../services/Systems';
import { Frames } from '../../services/Frames';
import { EventDispatcher } from '../../services';

/**
 * A React hook that manages the game loop, responsible for updating entities and systems
 * on each frame. The hook integrates with the `requestAnimationFrame` API to provide a smooth
 * update loop running at approximately 60 frames per second (or based on actual frame timing).
 *
 * @param {MutableRefObject<Entities>} entities - A reference to the Entities instance managing all game entities.
 * @param {MutableRefObject<Systems>} systems - A reference to the Systems instance managing all game systems.
 * @param {MutableRefObject<EventDispatcher>} dispatcher - A reference to the EventDispatcher instance for handling events.
 *
 * @returns {{
 *   frames: MutableRefObject<Frames>
 * }} - An object containing a reference to the `Frames` instance, which tracks the frame updates.
 *
 * @example
 * const { frames } = useGameLoop(entitiesRef, systemsRef, dispatcherRef);
 *
 * // Access the current frame number:
 * const currentFrame = frames.current.currentFrame;
 */
export function useGameLoop(
  entities: MutableRefObject<Entities>,
  systems: MutableRefObject<Systems>,
  dispatcher: MutableRefObject<EventDispatcher>
) {
  const frames = useRef<Frames>(new Frames());
  const events = useRef<string[]>([]);

  useEffect(() => {
    // Add a listener to capture all events dispatched during the game loop
    const listener = dispatcher.current.addListenerToAllEvents((data) => {
      events.current.push(data);
    });

    // Update function that runs on every frame
    const update = (deltaTime: number, now: number, then: number) => {
      systems.current.update(entities.current, {
        events: events.current,
        dispatch: dispatcher.current,
        time: { delta: deltaTime, current: now, previous: then },
        touches: [],
        screen: {},
        layout: {},
      });
      events.current = []; // Clear events after processing
      frames.current.updateFrame(60, deltaTime); // Update the frame counter
    };

    // Game loop function driven by requestAnimationFrame
    const gameLoop = (now: number, then: number) => {
      const deltaTime = now - then; // Calculate time difference between frames
      update(deltaTime, now, then); // Run the update
      requestAnimationFrame((nextTime) => gameLoop(nextTime, now)); // Loop
    };

    // Start the game loop
    requestAnimationFrame((nextTime) => gameLoop(nextTime, nextTime));

    // Cleanup function to remove event listeners when component unmounts
    return () => {
      dispatcher.current.removeListenerToAllEvents(listener);
    };
  }, [entities, systems, dispatcher]);

  return { frames };
}

  // src/containers/ReactNativeSkiaGameEngine/hooks/useSystem.ts:
import { useContext } from "react";
import { system } from "../services/Systems";
import { RNSGEContext } from "../context/RNSGEContext";

export function useSystem(system: system) {
  const systems = useContext(RNSGEContext).systems;

  systems.current.addSystem(system);
}

  // useSystems Files:
    // src/containers/ReactNativeSkiaGameEngine/hooks/useSystems/index.ts:
export * from './useSystems';

    // src/containers/ReactNativeSkiaGameEngine/hooks/useSystems/useSystems.test.ts:
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

    // src/containers/ReactNativeSkiaGameEngine/hooks/useSystems/useSystems.ts:
import { useRef } from 'react';
import { Systems } from '../../services/Systems';

/**
 * A React hook that provides a stable reference to a singleton instance of the `Systems` class,
 * used for managing and executing systems within the game engine.
 *
 * This hook ensures that the `Systems` instance persists across renders,
 * allowing it to manage and execute systems consistently throughout the lifecycle of the game.
 *
 * @returns {React.MutableRefObject<Systems>} - A reference to the `Systems` instance.
 *
 * @example
 * const systems = useSystems();
 *
 * // Access the Systems instance:
 * const allSystems = systems.current;
 *
 * // Add a new system:
 * systems.current.addSystem((entities, args) => {
 *   // System logic here
 * });
 *
 * // Run all systems:
 * systems.current.update(entities, args);
 */
export const useSystems = () => {
  const systemsRef = useRef<Systems>(new Systems());
  return systemsRef;
};

  // src/containers/ReactNativeSkiaGameEngine/hooks/useTouchHandler.ts:
import { useCallback, useContext, useEffect } from "react";
import { RNSGEContext } from "../context/RNSGEContext";
import { GestureType } from "react-native-gesture-handler";

export const useTouchHandler = (gesture?: GestureType) => {
  const { touchService } = useContext(RNSGEContext);

  useEffect(() => {
    if (gesture) touchService.addGesture(gesture);
  }, [gesture]);

  const addGesture = useCallback((gesture: GestureType) => {
    touchService.addGesture(gesture);
  }, []);
  return { addGesture };
};

  // useTouchService Files:
    // src/containers/ReactNativeSkiaGameEngine/hooks/useTouchService/index.ts:
export * from './useTouchService';

    // src/containers/ReactNativeSkiaGameEngine/hooks/useTouchService/useTouchService.test.ts:
import { renderHook, act } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useTouchService } from './useTouchService';

describe('useTouchService', () => {
  test('should initialize with an empty composed gesture', () => {
    const { result } = renderHook(() => useTouchService());

    // Initial composed gesture should be defined
    expect(result.current.gestures).toBeDefined();
  });

  test('should add a gesture and update the composed gesture', () => {
    const { result } = renderHook(() => useTouchService());
    const mockGesture = Gesture.Tap();

    act(() => {
      result.current.addGesture(mockGesture);
    });

    // Verify that gestures were updated
    expect(result.current.gestures).toBeDefined();
  });

  test('should compose multiple gestures correctly', () => {
    const { result } = renderHook(() => useTouchService());
    const mockGesture1 = Gesture.Tap();
    const mockGesture2 = Gesture.Pan();

    act(() => {
      result.current.addGesture(mockGesture1);
      result.current.addGesture(mockGesture2);
    });

    // Verify that gestures were updated correctly
    expect(result.current.gestures).toBeDefined();
  });

  test('should maintain gesture array stability across renders', () => {
    const { result, rerender } = renderHook(() => useTouchService());
    const mockGesture = Gesture.Tap();

    act(() => {
      result.current.addGesture(mockGesture);
    });

    const initialGestures = result.current.gestures;

    rerender({});

    // Ensure the composed gesture reference remains the same across rerenders
    expect(result.current.gestures).toBe(initialGestures);
  });

  test('should handle adding gestures after multiple renders', () => {
    const { result, rerender } = renderHook(() => useTouchService());
    const mockGesture1 = Gesture.Tap();

    act(() => {
      result.current.addGesture(mockGesture1);
    });

    rerender({});

    const mockGesture2 = Gesture.Pan();

    act(() => {
      result.current.addGesture(mockGesture2);
    });

    // Verify that gestures were updated with multiple gestures
    expect(result.current.gestures).toBeDefined();
  });
});

    // src/containers/ReactNativeSkiaGameEngine/hooks/useTouchService/useTouchService.ts:
import { useRef, useCallback, useState } from 'react';
import {
  ComposedGesture,
  Gesture,
  GestureType,
} from 'react-native-gesture-handler';

/**
 * A React hook that provides a service for managing and composing touch gestures
 * using the `react-native-gesture-handler` library.
 *
 * This hook allows you to dynamically add gestures and compose them into a single gesture
 * that can be used in the game engine or other components.
 *
 * @returns {{
 *   gestures: ComposedGesture;
 *   addGesture: (gesture: GestureType) => void;
 * }} - An object containing the composed gesture and a function to add new gestures.
 *
 * @example
 * const { gestures, addGesture } = useTouchService();
 *
 * // Add a new gesture:
 * addGesture(Gesture.Tap().onEnd(() => {
 *   console.log('Tap gesture detected');
 * }));
 *
 * // Use the composed gesture in a GestureDetector component:
 * <GestureDetector gesture={gestures}>
 *   <View>
 *     // Your components here
 *   </View>
 * </GestureDetector>
 */
export const useTouchService = () => {
  const gesturesArray = useRef<(ComposedGesture | GestureType)[]>([]);
  const [gestures, setGestures] = useState<ComposedGesture>(
    Gesture.Race(...gesturesArray.current)
  );

  const addGesture = useCallback(
    (gesture: GestureType) => {
      gesturesArray.current.push(gesture);
      setGestures(Gesture.Race(...gesturesArray.current));
    },
    [gesturesArray, setGestures]
  );
  return { gestures, addGesture };
};

// src/containers/ReactNativeSkiaGameEngine/index.stories.tsx:
import type { Meta, StoryObj } from "@storybook/react";
import { ReactNativeSkiaGameEngine } from "./RNSGE";
import { Text, View } from "react-native";
import { FC, useCallback, useEffect, useRef } from "react";
import { useAddEntity } from "./hooks/useAddEntity";
import Animated, { runOnUI, useAnimatedStyle } from "react-native-reanimated";
import { useEntityValue } from "./hooks/useEntityValue";
import { useSystem } from "./hooks/useSystem";
import { Entities } from "./services/Entities";
import { SeaGroup } from "@/components/SeaGroupRenderer/SeaGroup-rnsge";
import { useReRenderCount } from "@/hooks/useReRenderCount";
import { Canvas } from "@shopify/react-native-skia";
import { SkyBackground } from "@/components/SkyBackground";
import { StarsView } from "@/components/StarsView/StarsView-rnsge";
import { Physics } from "@/components/Physics";
import { Swipe } from "@/components/Swipe";

const SubComponent: FC<{}> = (props) => {
  const renderCount = useReRenderCount();
  console.log(`rendered subComponent1 for ${renderCount.current} times`);
  return <Text>Sub Component 1</Text>;
};

const SubComponentTwo: FC<{}> = (props) => {
  const renderCount = useReRenderCount();
  const entity = useAddEntity({ translateX: -10 });
  const translateX = useEntityValue<{ translateX: number }, number>(
    entity.id,
    "translateX"
  );
  console.log(`rendered subComponent2 for ${renderCount.current} times`);

  const updateTranslateX = useCallback((entities: Entities["entities"]) => {
    "worklet";
    const target = entities.get(entity.id);
    if (target) {
      if (target.data.translateX < 200) target.data.translateX += 1;
    }
  }, []);
  useSystem((entities) => {
    updateTranslateX(entities);
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value ? translateX.value : 0 }],
    };
  }, [translateX.value]);
  return (
    <Animated.View style={animatedStyle}>
      <Text>Sub Component 2</Text>
    </Animated.View>
  );
};

const meta = {
  title: "React Native Skia Game Engine",
  component: ReactNativeSkiaGameEngine,
  args: {},
} satisfies Meta<typeof ReactNativeSkiaGameEngine>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {},
  render: (args: any) => (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <View
        style={{
          width: 800,
          height: 300,
        }}
      >
        <ReactNativeSkiaGameEngine {...args}>
          <SkyBackground />
          <StarsView />
          <SeaGroup />
          <Physics />
          <Swipe />
        </ReactNativeSkiaGameEngine>
      </View>
    </View>
  ),
};

// src/containers/ReactNativeSkiaGameEngine/index.ts:
export * from "./RNSGE";
export * from "./context";
export * from "./hooks";
export * from "./services";

// services Files:
  // src/containers/ReactNativeSkiaGameEngine/services/Entities.test.ts:
import { Entities, AddEntityEvent, IEntityOptions } from './Entities';
import { Entity, EntityUpdateEvent, EntityChangeComparison } from './Entity';

// Mock Entity class extending the real Entity class
class MockEntity extends Entity<Record<string, any>> {
  constructor(
    id: string,
    data: Record<string, any> = {},
    comparison: EntityChangeComparison = EntityChangeComparison.Equal
  ) {
    super(data);
    this._id = id;
    this._comparison = comparison;
  }
}

describe('Entities Class', () => {
  let entities: Entities;

  beforeEach(() => {
    entities = new Entities();
  });

  test('should initialize with an empty entities map', () => {
    expect(entities.entities.size).toBe(0);
    expect(entities.mapLabelToEntityId.size).toBe(0);
    expect(entities.mapGroupIdToEntities.size).toBe(0);
  });

  test('should add an entity without options', () => {
    const entity = new MockEntity('1');
    entities.addEntity(entity);

    expect(entities.entities.size).toBe(1);
    expect(entities.entities.get('1')).toBe(entity);
    expect(entities.mapLabelToEntityId.size).toBe(0);
    expect(entities.mapGroupIdToEntities.size).toBe(0);
  });

  test('should add an entity with a label', () => {
    const entity = new MockEntity('2');
    const options: IEntityOptions = { label: 'Player' };
    entities.addEntity(entity, options);

    expect(entities.entities.size).toBe(1);
    expect(entities.mapLabelToEntityId.get('Player')).toBe('2');
  });

  test('should add an entity to multiple groups', () => {
    const entity = new MockEntity('3');
    const options: IEntityOptions = { groups: ['GroupA', 'GroupB'] };
    entities.addEntity(entity, options);

    expect(entities.mapGroupIdToEntities.get('GroupA')?.length).toBe(1);
    expect(entities.mapGroupIdToEntities.get('GroupB')?.length).toBe(1);
  });

  test('should emit AddEntityEvent when an entity is added', (done) => {
    const entity = new MockEntity('4');

    entities.addListener(AddEntityEvent, (event) => {
      expect(event.entity).toBe(entity);
      done();
    });

    entities.addEntity(entity);
  });

  test('should remove an entity by ID', () => {
    const entity = new MockEntity('5');
    entities.addEntity(entity);
    entities.removeEntity('5');

    expect(entities.entities.size).toBe(0);
    expect(entities.mapLabelToEntityId.size).toBe(0);
    expect(entities.mapGroupIdToEntities.size).toBe(0);
  });

  test('should remove an entity by label', () => {
    const entity = new MockEntity('6');
    entities.addEntity(entity, { label: 'Enemy' });
    entities.removeEntity({ label: 'Enemy' });

    expect(entities.entities.size).toBe(0);
    expect(entities.mapLabelToEntityId.has('Enemy')).toBe(false);
  });

  test('should remove entities by group', () => {
    const entity1 = new MockEntity('7');
    const entity2 = new MockEntity('8');
    entities.addEntity(entity1, { groups: ['GroupC'] });
    entities.addEntity(entity2, { groups: ['GroupC'] });
    entities.removeEntity({ group: ['GroupC'] });

    expect(entities.entities.size).toBe(0);
    expect(entities.mapGroupIdToEntities.has('GroupC')).toBe(false);
  });

  test('should not remove non-existent entity by ID', () => {
    entities.removeEntity('non-existent');
    expect(entities.entities.size).toBe(0);
  });

  test('should not remove non-existent entity by label', () => {
    entities.removeEntity({ label: 'non-existent' });
    expect(entities.entities.size).toBe(0);
  });

  test('should not remove non-existent entity by group', () => {
    entities.removeEntity({ group: ['non-existent-group'] });
    expect(entities.entities.size).toBe(0);
  });

  test('should handle removing entities from multiple groups correctly', () => {
    const entity1 = new MockEntity('9');
    const entity2 = new MockEntity('10');
    entities.addEntity(entity1, { groups: ['GroupD', 'GroupE'] });
    entities.addEntity(entity2, { groups: ['GroupD'] });
    entities.removeEntity(entity1.id);

    expect(entities.mapGroupIdToEntities.get('GroupD')?.length).toBe(1);
    expect(entities.mapGroupIdToEntities.get('GroupE')).not.toBeDefined();
  });

  test('should return an entity by label', () => {
    const entity = new MockEntity('11');
    entities.addEntity(entity, { label: 'Hero' });

    const retrievedEntity = entities.getEntityByLabel('Hero');
    expect(retrievedEntity).toBe(entity);
  });

  test('should return undefined for non-existent label', () => {
    const retrievedEntity = entities.getEntityByLabel('non-existent');
    expect(retrievedEntity).toBeUndefined();
  });

  test('should return entities by group', () => {
    const entity1 = new MockEntity('12');
    const entity2 = new MockEntity('13');
    entities.addEntity(entity1, { groups: ['GroupF'] });
    entities.addEntity(entity2, { groups: ['GroupF'] });

    const groupEntities = entities.getEntitiesByGroup('GroupF');
    expect(groupEntities.length).toBe(2);
    expect(groupEntities).toContain(entity1);
    expect(groupEntities).toContain(entity2);
  });

  test('should return an empty array for non-existent group', () => {
    const groupEntities = entities.getEntitiesByGroup('non-existent-group');
    expect(groupEntities.length).toBe(0);
  });

  test('should update entity data and emit EntityUpdateEvent', (done) => {
    const entity = new MockEntity('14', { health: 100 });
    entities.addEntity(entity);

    entity.addListener(EntityUpdateEvent, (args) => {
      expect(args.prev.health).toBe(100);
      expect(args.next.health).toBe(80);
      done();
    });

    entity.data = { health: 80 };
  });

  test('should not update entity data if comparison fails (Equal mode)', () => {
    const entity = new MockEntity('15', { health: 100 });
    entities.addEntity(entity);

    entity.data = { health: 100 };
    expect(entity.data.health).toBe(100); // No update should occur
  });

  test('should not update entity data if comparison mode is StrictEqual', (done) => {
    const entity = new MockEntity(
      '16',
      { health: 100 },
      EntityChangeComparison.StrictEqual
    );
    entities.addEntity(entity);

    entity.addListener(EntityUpdateEvent, (args) => {
      done('should not update entity data if comparison mode is StrictEqual');
    });

    entity.data = { health: 100 };
    setTimeout(() => done(), 0);
  });
});

  // src/containers/ReactNativeSkiaGameEngine/services/Entities.ts:
import EventEmitter from 'react-native/Libraries/vendor/emitter/EventEmitter';
import { Entity, uid } from './Entity';

export const AddEntityEvent = 'AddEntityEvent';

/**
 * Options for configuring an entity.
 * @typedef {Object} IEntityOptions
 * @property {string} [label] - A label to associate with the entity.
 * @property {string[]} [groups] - A list of groups the entity belongs to.
 */
export interface IEntityOptions {
  label?: string;
  groups?: string[];
}

/**
 * Manages a collection of entities with the ability to emit events on entity changes.
 * @extends EventEmitter
 */
export class Entities extends EventEmitter {
  protected _entities: Map<string, Entity<any>>;
  protected _mapLabelToEntityId: Map<string, string> = new Map<
    string,
    string
  >();
  protected _mapGroupIdToEntities: Map<string, Entity<any>[]> = new Map<
    string,
    Entity<any>[]
  >();
  /** @type {string} */
  public id: string = uid();

  /**
   * Creates an instance of Entities.
   * @param {Map<string, Entity<any>>} [initialEntities=new Map<string, Entity<any>>()] - Initial set of entities.
   */
  constructor(
    initialEntities: Map<string, Entity<any>> = new Map<string, Entity<any>>()
  ) {
    super();
    this._entities = initialEntities;
    this._initializeMapsFromEntities(initialEntities);
  }

  /**
   * Initializes the label and group maps from the provided entities.
   * @param {Map<string, Entity<any>>} entities - A map of entity IDs to entities.
   * @private
   */
  private _initializeMapsFromEntities(entities: Map<string, Entity<any>>) {
    entities.forEach((entity, id) => {
      if (entity.label) {
        this._mapLabelToEntityId.set(entity.label, id);
      }
      if (entity.groups) {
        entity.groups.forEach((group) => {
          if (!this._mapGroupIdToEntities.has(group)) {
            this._mapGroupIdToEntities.set(group, []);
          }
          this._mapGroupIdToEntities.get(group)?.push(entity);
        });
      }
    });
  }

  /**
   * Gets the map of all entities.
   * @returns {Map<string, Entity<any>>} - The map of entity IDs to entities.
   */
  public get entities(): Map<string, Entity<any>> {
    return this._entities;
  }

  /**
   * Gets the map of labels to entity IDs.
   * @returns {Map<string, string>} - The map of labels to entity IDs.
   */
  public get mapLabelToEntityId(): Map<string, string> {
    return this._mapLabelToEntityId;
  }

  /**
   * Gets the map of group IDs to lists of entities.
   * @returns {Map<string, Entity<any>[]>} - The map of group IDs to lists of entities.
   */
  public get mapGroupIdToEntities(): Map<string, Entity<any>[]> {
    return this._mapGroupIdToEntities;
  }

  /**
   * Adds a new entity to the collection and optionally associates it with a label and/or groups.
   * @param {Entity<any>} entity - The entity to add.
   * @param {IEntityOptions} [options] - Optional configurations for the entity.
   * @fires AddEntityEvent
   */
  public addEntity(entity: Entity<any>, options?: IEntityOptions) {
    this._entities.set(entity.id, entity);
    if (options?.label) {
      this._mapLabelToEntityId.set(options.label, entity.id);
    }
    if (options?.groups) {
      for (const group of options.groups) {
        if (!this._mapGroupIdToEntities.has(group)) {
          this._mapGroupIdToEntities.set(group, []);
        }
        this._mapGroupIdToEntities.get(group)?.push(entity);
      }
    }
    this.emit(AddEntityEvent, { entity });
  }

  /**
   * Removes an entity from the collection based on its ID, label, or groups.
   * @param {string|{label?: string; group?: string[]}} entityId - The entity ID, or an object specifying a label or groups to remove.
   */
  public removeEntity(entityId: string | { label?: string; group?: string[] }) {
    if (typeof entityId === 'string') {
      this._entities.delete(entityId);
      this._mapLabelToEntityId.forEach((id, label) => {
        if (id === entityId) this._mapLabelToEntityId.delete(label);
      });
      this._mapGroupIdToEntities.forEach((entities, group) => {
        const index = entities.findIndex((entity) => entity.id === entityId);
        if (index !== -1) {
          entities.splice(index, 1);
          if (entities.length === 0) this._mapGroupIdToEntities.delete(group);
        }
      });
    } else if (entityId.label) {
      const entity = this._mapLabelToEntityId.get(entityId.label);
      if (entity) this.removeEntity(entity);
    } else if (entityId.group) {
      const entityIdsToRemove: string[] = [];

      entityId.group.forEach((group) => {
        const entities = this._mapGroupIdToEntities.get(group);
        if (entities) {
          entityIdsToRemove.push(...entities.map((entity) => entity.id));
        }
      });

      entityIdsToRemove.forEach((id) => {
        this.removeEntity(id);
      });
    }
  }

  /**
   * Retrieves an entity by its label.
   * @param {string} label - The label associated with the entity.
   * @returns {Entity<any>|undefined} - The entity associated with the label, or undefined if not found.
   */
  public getEntityByLabel(label: string): Entity<any> | undefined {
    const entityId = this._mapLabelToEntityId.get(label);
    if (!entityId) return;
    return this._entities.get(entityId);
  }

  /**
   * Retrieves all entities associated with a specific group.
   * @param {string} group - The group ID.
   * @returns {Entity<any>[]} - An array of entities belonging to the group.
   */
  public getEntitiesByGroup(group: string): Entity<any>[] {
    return this._mapGroupIdToEntities.get(group) || [];
  }
}

  // src/containers/ReactNativeSkiaGameEngine/services/Entity.test.ts:
import {
  Entity,
  EntityUpdateEventArgs,
  EntityUpdateEvent,
  EntityChangeComparison,
} from './Entity';

describe('Entity class', () => {
  it('should create a new entity with the given data', () => {
    const data = { foo: 'bar' };
    const entity = new Entity(data);
    expect(entity.data).toStrictEqual(data);
  });

  it('should generate a unique identifier for the entity', () => {
    const entity1 = new Entity({ foo: 'bar' });
    const entity2 = new Entity({ foo: 'baz' });
    expect(entity1.id).not.toBe(entity2.id);
  });

  it('should assign label and groups correctly', () => {
    const data = { foo: 'bar' };
    const label = 'player';
    const groups = ['group1', 'group2'];
    const entity = new Entity(data, undefined, label, groups);

    expect(entity.label).toBe(label);
    expect(entity.groups).toEqual(groups);
  });

  it('should emit an update event when the data is changed', (done) => {
    const entity = new Entity({ foo: 'bar' });
    entity.addListener(
      EntityUpdateEvent,
      (args: EntityUpdateEventArgs<any>) => {
        expect(args.prev).toStrictEqual({ foo: 'bar' });
        expect(args.next).toStrictEqual({ foo: 'baz' });
        done();
      }
    );
    entity.data = { foo: 'baz' };
  });

  it('should emit an update event when the data is reassigned but not changed', (done) => {
    const entity = new Entity({ foo: 'bar' });
    entity.addListener(EntityUpdateEvent, (args) => {
      expect(args.prev).toStrictEqual({ foo: 'bar' });
      expect(args.next).toStrictEqual({ foo: 'bar' });
      done();
    });
    entity.data = { foo: 'bar' };
  });

  it('should handle multiple groups correctly', () => {
    const entity = new Entity({ foo: 'bar' }, undefined, 'player', [
      'group1',
      'group2',
    ]);
    expect(entity.groups).toContain('group1');
    expect(entity.groups).toContain('group2');
  });

  it('should allow an entity without a label or groups', () => {
    const entity = new Entity({ foo: 'bar' });
    expect(entity.label).toBeUndefined();
    expect(entity.groups).toEqual([]);
  });
});

  // src/containers/ReactNativeSkiaGameEngine/services/Entity.ts:
import EventEmitter from 'react-native/Libraries/vendor/emitter/EventEmitter';

export const uid = function () {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export type EntityUpdateEventArgs<T> = {
  prev: T;
  next: T;
};

export const EntityUpdateEvent = 'EntityUpdateEvent';

export enum EntityChangeComparison {
  Equal = 0,
  StrictEqual = 1,
}

/**
 * Represents an entity in the game engine.
 *
 * @template T The type of data associated with the entity.
 */
export class Entity<T extends Record<string, any>> extends EventEmitter {
  /**
   * The unique identifier of the entity.
   *
   * @type {string}
   */
  protected _id: string;

  /**
   * The data associated with the entity.
   *
   * @type {T}
   */
  protected _data: T;

  /**
   * The label associated with the entity.
   *
   * @type {string | undefined}
   */
  protected _label?: string;

  /**
   * The groups associated with the entity.
   *
   * @type {string[]}
   */
  protected _groups: string[] = [];

  /**
   * The comparison mode for checking if the entity data has changed.
   * The default value is EntityChangeComparison.Equal.
   *
   * @type {EntityChangeComparison}
   */
  protected _comparison: EntityChangeComparison = EntityChangeComparison.Equal;

  /**
   * Creates a new entity with the given data, label, and groups.
   *
   * @param {T} data The data to associate with the entity.
   * @param {EntityChangeComparison} [comparison] The comparison mode for data changes.
   * @param {string} [label] The label to associate with the entity.
   * @param {string[]} [groups] The groups to associate with the entity.
   */
  constructor(
    data: T,
    comparison?: EntityChangeComparison,
    label?: string,
    groups?: string[]
  ) {
    super();
    this._id = uid();
    this._data = data;
    this._label = label;
    this._groups = groups || [];

    if (comparison) {
      this._comparison = comparison;
    }
  }

  /**
   * Gets the unique identifier of the entity.
   *
   * @return {string} The unique identifier of the entity.
   */
  public get id(): string {
    return this._id;
  }

  /**
   * Gets the data associated with the entity.
   *
   * @return {T} The data associated with the entity.
   */
  public get data(): T {
    return this._data;
  }

  /**
   * Sets the data associated with the entity.
   *
   * @param {T} data The new data to associate with the entity.
   * @emits EntityUpdateEvent
   */
  public set data(data: T) {
    if (this._comparison === EntityChangeComparison.StrictEqual) {
      if (JSON.stringify(this._data) === JSON.stringify(data)) {
        return;
      }
    } else if (this._comparison === EntityChangeComparison.Equal) {
      if (this._data === data) {
        return;
      }
    }
    const args: EntityUpdateEventArgs<T> = { prev: this._data, next: data };
    this.emit(EntityUpdateEvent, args);
    this._data = data;
  }

  /**
   * Gets the label associated with the entity.
   *
   * @return {string | undefined} The label associated with the entity.
   */
  public get label(): string | undefined {
    return this._label;
  }

  /**
   * Gets the groups associated with the entity.
   *
   * @return {string[]} The groups associated with the entity.
   */
  public get groups(): string[] {
    return this._groups;
  }
}

  // src/containers/ReactNativeSkiaGameEngine/services/EventDispatcher.test.ts:
import { EventDispatcher } from './EventDispatcher';
import { uid } from './Entity';
import { EmitterSubscription } from 'react-native';

let mockUidCounter = 0;

jest.mock('./Entity', () => ({
  uid: jest.fn(() => `mocked-uid-${mockUidCounter++}`),
}));

describe('EventDispatcher', () => {
  let eventDispatcher: EventDispatcher;

  beforeEach(() => {
    eventDispatcher = new EventDispatcher();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockUidCounter = 0; // Reset counter after each test
  });

  test('should emit an event and trigger specific listeners', () => {
    const eventListener = jest.fn();
    eventDispatcher.addListener('TestEvent', eventListener);

    eventDispatcher.emitEvent('TestEvent', { key: 'value' });

    expect(eventListener).toHaveBeenCalledTimes(1);
    expect(eventListener).toHaveBeenCalledWith({ key: 'value' });
  });

  test('should emit an event and trigger global listeners', () => {
    const globalListener = jest.fn();
    eventDispatcher.addListenerToAllEvents(globalListener);

    eventDispatcher.emitEvent('TestEvent', { key: 'value' });

    expect(globalListener).toHaveBeenCalledTimes(1);
    expect(globalListener).toHaveBeenCalledWith({ key: 'value' });
  });

  test('should trigger both specific and global listeners', () => {
    const eventListener = jest.fn();
    const globalListener = jest.fn();
    eventDispatcher.addListener('TestEvent', eventListener);
    eventDispatcher.addListenerToAllEvents(globalListener);

    eventDispatcher.emitEvent('TestEvent', { key: 'value' });

    expect(eventListener).toHaveBeenCalledTimes(1);
    expect(globalListener).toHaveBeenCalledTimes(1);
    expect(eventListener).toHaveBeenCalledWith({ key: 'value' });
    expect(globalListener).toHaveBeenCalledWith({ key: 'value' });
  });

  test('should add a global listener and return a unique ID', () => {
    const globalListener = jest.fn();
    const id = eventDispatcher.addListenerToAllEvents(globalListener);

    expect(id).toBe('mocked-uid-0');
    expect(uid).toHaveBeenCalledTimes(1);
    expect(eventDispatcher['_subscribersToAllEvents'].size).toBe(1);
    expect(eventDispatcher['_subscribersToAllEvents'].get(id)).toBe(
      globalListener
    );
  });

  test('should remove a global listener by ID', () => {
    const globalListener = jest.fn();
    const id = eventDispatcher.addListenerToAllEvents(globalListener);

    eventDispatcher.removeListenerToAllEvents(id);

    expect(eventDispatcher['_subscribersToAllEvents'].size).toBe(0);
    expect(eventDispatcher['_subscribersToAllEvents'].has(id)).toBe(false);
  });

  test('should not throw error when removing a non-existent global listener', () => {
    expect(() =>
      eventDispatcher.removeListenerToAllEvents('non-existent-id')
    ).not.toThrow();
  });

  test('should handle multiple global listeners correctly', () => {
    const globalListener1 = jest.fn();
    const globalListener2 = jest.fn();
    eventDispatcher.addListenerToAllEvents(globalListener1);
    eventDispatcher.addListenerToAllEvents(globalListener2);

    eventDispatcher.emitEvent('GlobalTestEvent', { key: 'value' });

    expect(globalListener1).toHaveBeenCalledTimes(1);
    expect(globalListener2).toHaveBeenCalledTimes(1);
    expect(globalListener1).toHaveBeenCalledWith({ key: 'value' });
    expect(globalListener2).toHaveBeenCalledWith({ key: 'value' });
  });

  test('should handle emitting events without data', () => {
    const eventListener = jest.fn();
    const globalListener = jest.fn();
    eventDispatcher.addListener('NoDataEvent', eventListener);
    eventDispatcher.addListenerToAllEvents(globalListener);

    eventDispatcher.emitEvent('NoDataEvent');

    expect(eventListener).toHaveBeenCalledTimes(1);
    expect(eventListener).toHaveBeenCalledWith(undefined);
    expect(globalListener).toHaveBeenCalledTimes(1);
    expect(globalListener).toHaveBeenCalledWith(undefined);
  });

  test('should return an EmitterSubscription when adding a listener', () => {
    const eventListener = jest.fn();
    const subscription: EmitterSubscription = eventDispatcher.addListener(
      'TestEvent',
      eventListener
    );

    expect(subscription.remove).toBeDefined();
  });

  test('should remove a listener using the EmitterSubscription object', () => {
    const eventListener = jest.fn();
    const subscription = eventDispatcher.addListener(
      'TestEvent',
      eventListener
    );

    subscription.remove();
    eventDispatcher.emitEvent('TestEvent', { key: 'value' });

    expect(eventListener).not.toHaveBeenCalled();
  });

  test('should remove all listeners for a specific event', () => {
    const eventListener1 = jest.fn();
    const eventListener2 = jest.fn();
    eventDispatcher.addListener('TestEvent', eventListener1);
    eventDispatcher.addListener('TestEvent', eventListener2);

    eventDispatcher.removeAllListenersForEvent('TestEvent');
    eventDispatcher.emitEvent('TestEvent', { key: 'value' });

    expect(eventListener1).not.toHaveBeenCalled();
    expect(eventListener2).not.toHaveBeenCalled();
  });

  test('should remove all listeners for a specific event', () => {
    const eventListener1 = jest.fn();
    const eventListener2 = jest.fn();
    eventDispatcher.addListener('TestEvent', eventListener1);
    eventDispatcher.addListener('TestEvent', eventListener2);

    eventDispatcher.removeAllListenersForEvent('TestEvent');
    eventDispatcher.emitEvent('TestEvent', { key: 'value' });

    expect(eventListener1).not.toHaveBeenCalled();
    expect(eventListener2).not.toHaveBeenCalled();
  });

  test('should allow multiple listeners for the same event and call all of them', () => {
    const eventListener1 = jest.fn();
    const eventListener2 = jest.fn();
    eventDispatcher.addListener('MultiEvent', eventListener1);
    eventDispatcher.addListener('MultiEvent', eventListener2);

    eventDispatcher.emitEvent('MultiEvent', { key: 'value' });

    expect(eventListener1).toHaveBeenCalledTimes(1);
    expect(eventListener2).toHaveBeenCalledTimes(1);
    expect(eventListener1).toHaveBeenCalledWith({ key: 'value' });
    expect(eventListener2).toHaveBeenCalledWith({ key: 'value' });
  });
});

  // src/containers/ReactNativeSkiaGameEngine/services/EventDispatcher.ts:
import EventEmitter, {
  EmitterSubscription,
} from 'react-native/Libraries/vendor/emitter/EventEmitter';
import { uid } from './Entity';

/**
 * A global event dispatcher for the game engine, allowing events to be emitted and listened to from any part of the game.
 * This class extends `EventEmitter` and provides additional functionality for managing global event listeners,
 * making it possible to handle game-wide events seamlessly.
 *
 * @extends EventEmitter
 */
export class EventDispatcher extends EventEmitter {
  /**
   * A map of subscriber IDs to callback functions for listeners that subscribe to all events.
   * This allows any part of the game to respond to global events.
   *
   * @type {Map<string, (data: any) => void>}
   * @private
   */
  private _subscribersToAllEvents: Map<string, (data: any) => void> = new Map<
    string,
    (data: any) => void
  >();

  /**
   * Emits a global event to all listeners subscribed to the specific event and to those subscribed to all events.
   * This method allows events to be dispatched from any part of the game and received by any other part.
   *
   * @param {string} event - The name of the event to emit.
   * @param {any} [data] - Optional data to pass to the event listeners.
   */
  public emitEvent(event: string, data?: any) {
    this.emit(event, data);
    for (const [_, callback] of this._subscribersToAllEvents) {
      callback(data);
    }
  }

  /**
   * Adds a listener that will be called whenever any event is emitted within the game.
   * This allows for global event handling, where a single listener can respond to all events.
   *
   * @param {(data: any) => void} callback - The callback function to execute when any event is emitted.
   * @returns {string} The unique ID of the listener, which can be used to remove the listener later.
   */
  public addListenerToAllEvents(callback: (data: any) => void): string {
    const id = uid();
    this._subscribersToAllEvents.set(id, callback);
    return id;
  }

  /**
   * Removes a listener that was subscribed to all events, based on its unique ID.
   * This allows for precise control over global event listeners within the game.
   *
   * @param {string} id - The unique ID of the listener to remove.
   */
  public removeListenerToAllEvents(id: string) {
    this._subscribersToAllEvents.delete(id);
  }

  /**
   * Adds a listener for a specific event.
   * This wraps the `EventEmitter`'s `addListener` method and returns an EmitterSubscription.
   *
   * @param {string} event - The name of the event to listen to.
   * @param {(data: any) => void} listener - The callback function to execute when the event is emitted.
   * @param {any} [context] - Optional context to bind the listener function to.
   * @returns {EmitterSubscription} An EmitterSubscription object that can be used to remove the listener.
   */
  public addListener(
    event: string,
    listener: (data: any) => void,
    context?: any
  ): EmitterSubscription {
    return super.addListener(event, listener, context);
  }

  /**
   * Removes all listeners for a specific event.
   * This method will remove all callbacks for a given event.
   *
   * @param {string} event - The name of the event to remove listeners for.
   */
  public removeAllListenersForEvent(event: string): void {
    this.removeAllListeners(event);
  }
}

  // src/containers/ReactNativeSkiaGameEngine/services/Frames.test.ts:
import { Frames, FrameUpdateEvent } from './Frames';
import EventEmitter from 'react-native/Libraries/vendor/emitter/EventEmitter';

const oneFrameInMilliseconds = 1000 / 60;
const oneFrameIn30fps = 1000 / 30;

describe('Frames', () => {
  let frames: Frames;

  beforeEach(() => {
    frames = new Frames();
  });

  test('should initialize with currentFrame set to 0', () => {
    expect(frames.currentFrame).toBe(0);
  });

  test('should increment currentFrame based on fps and delta', () => {
    frames.updateFrame(60, oneFrameInMilliseconds); // Assuming 60 fps and 16ms per frame

    expect(frames.currentFrame).toBe(1); // 1 frame should have passed
  });

  test('should emit FrameUpdateEvent with delta when frame is updated', () => {
    const mockListener = jest.fn();
    frames.addListener(FrameUpdateEvent, mockListener);

    frames.updateFrame(60, oneFrameInMilliseconds); // 60 fps and 16ms per frame

    expect(mockListener).toHaveBeenCalledTimes(1);
    expect(mockListener).toHaveBeenCalledWith(oneFrameInMilliseconds);
  });

  test('should handle multiple frame updates correctly', () => {
    frames.updateFrame(60, oneFrameInMilliseconds); // 1st update
    frames.updateFrame(60, oneFrameInMilliseconds); // 2nd update

    expect(frames.currentFrame).toBe(2); // 2 frames should have passed
  });

  test('should not emit FrameUpdateEvent if there are no listeners', () => {
    const spyEmit = jest.spyOn(frames, 'emit');
    frames.updateFrame(60, oneFrameInMilliseconds);

    expect(spyEmit).toHaveBeenCalledTimes(1);
    expect(spyEmit).toHaveBeenCalledWith(
      FrameUpdateEvent,
      oneFrameInMilliseconds
    );
  });

  test('should handle edge cases where delta is extremely small', () => {
    frames.updateFrame(60, 0.01); // Very small delta

    expect(frames.currentFrame).toBe(0); // Frame should not increment
  });

  test('should correctly handle very large delta values', () => {
    frames.updateFrame(60, 5000); // 5 seconds delta at 60 fps
    expect(frames.currentFrame).toBe(300); // 300 frames should have passed
  });

  test('should correctly calculate frame increment based on different fps values', () => {
    frames.updateFrame(30, oneFrameIn30fps); // 30 fps and 33ms per frame

    expect(frames.currentFrame).toBe(1); // 1 frame should have passed

    frames.updateFrame(30, oneFrameIn30fps);
    expect(frames.currentFrame).toBe(2); // 2 frames should have passed
  });
});

  // src/containers/ReactNativeSkiaGameEngine/services/Frames.ts:
import EventEmitter from 'react-native/Libraries/vendor/emitter/EventEmitter';

/**
 * The event name for frame updates.
 * This event is emitted every time the frame is updated.
 */
export const FrameUpdateEvent = 'FrameUpdateEvent';

/**
 * The `Frames` class is responsible for managing and tracking frame updates within the game engine.
 * It extends `EventEmitter`, allowing other parts of the game to listen for frame updates.
 *
 * @extends EventEmitter
 */
export class Frames extends EventEmitter {
  /**
   * The current frame number.
   * This value is incremented each time the frame is updated.
   *
   * @type {number}
   * @private
   */
  private _currentFrame: number = 0;

  /**
   * Creates an instance of the `Frames` class.
   */
  constructor() {
    super();
  }

  /**
   * Gets the current frame number.
   *
   * @returns {number} The current frame number.
   */
  public get currentFrame(): number {
    return this._currentFrame;
  }

  /**
   * Updates the frame based on the provided frames per second (fps) and delta time.
   * This method increments the current frame counter and emits a `FrameUpdateEvent`.
   *
   * @param {number} fps - The frames per second rate at which the game is running.
   * @param {number} delta - The time elapsed since the last update, in milliseconds.
   */
  public updateFrame(fps: number, delta: number) {
    // Ignore delta values smaller than 1 ms
    if (delta < 1) {
      return;
    }

    // Convert delta from milliseconds to seconds
    const deltaInSeconds = delta / 1000;

    // Calculate how many frames have passed in the given delta time
    const framesPassed = fps * deltaInSeconds;

    // Increment the current frame by the number of whole frames that have passed
    this._currentFrame += Math.floor(framesPassed);

    // Emit the frame update event with the original delta (in milliseconds)
    this.emit(FrameUpdateEvent, delta);
  }
}

  // src/containers/ReactNativeSkiaGameEngine/services/Systems.test.ts:
import { RNGE_System_Args, RNGE_Time, RNGE_Touch_Item } from '@/systems/types';
import { Entities } from './Entities';
import { system, Systems } from './Systems';

describe('Systems', () => {
  let systems: Systems;
  let mockEntities: Entities;
  let mockArgs: RNGE_System_Args;

  beforeEach(() => {
    systems = new Systems();
    mockEntities = new Entities();

    const mockTouchEvent: RNGE_Touch_Item = {
      event: { pageX: 100, pageY: 200 },
      type: 'start',
    };

    const mockTime: RNGE_Time = {
      current: 1000,
      previous: 983.34,
      delta: 16.66,
    };

    mockArgs = {
      touches: [mockTouchEvent],
      screen: { width: 1920, height: 1080 },
      layout: { x: 0, y: 0, width: 1920, height: 1080 },
      events: [],
      dispatch: jest.fn(),
      time: mockTime,
    };
  });

  test('should execute systems with the correct entities and args', () => {
    const mockSystem: system = jest.fn();

    systems.addSystem(mockSystem);
    systems.update(mockEntities, mockArgs);

    expect(mockSystem).toHaveBeenCalledTimes(1);
    expect(mockSystem).toHaveBeenCalledWith(mockEntities, mockArgs);
  });

  test('should correctly handle touch events in systems', () => {
    const mockSystem: system = jest.fn((entities, args) => {
      expect(args.touches.length).toBe(1);
      expect(args.touches[0].event.pageX).toBe(100);
      expect(args.touches[0].event.pageY).toBe(200);
      expect(args.touches[0].type).toBe('start');
    });

    systems.addSystem(mockSystem);
    systems.update(mockEntities, mockArgs);

    expect(mockSystem).toHaveBeenCalledTimes(1);
  });

  test('should handle timing information correctly in systems', () => {
    const mockSystem: system = jest.fn((entities, args) => {
      expect(args.time.current).toBe(1000);
      expect(args.time.previous).toBe(983.34);
      expect(args.time.delta).toBe(16.66);
    });

    systems.addSystem(mockSystem);
    systems.update(mockEntities, mockArgs);

    expect(mockSystem).toHaveBeenCalledTimes(1);
  });

  test('should allow systems to dispatch events', () => {
    const mockDispatch = jest.fn();
    const mockSystem: system = jest.fn((entities, args) => {
      args.dispatch({ type: 'TEST_EVENT' });
    });

    mockArgs.dispatch = mockDispatch;

    systems.addSystem(mockSystem);
    systems.update(mockEntities, mockArgs);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TEST_EVENT' });
  });

  test('should handle multiple systems interacting with the same entities', () => {
    const mockSystem1: system = jest.fn((entities, args) => {
      entities.addEntity({ id: 'entity1' } as any, { label: 'entity1' });
    });

    const mockSystem2: system = jest.fn((entities, args) => {
      const entity = entities.getEntityByLabel('entity1');
      expect(entity).toBeDefined();
    });

    systems.addSystem(mockSystem1);
    systems.addSystem(mockSystem2);
    systems.update(mockEntities, mockArgs);

    expect(mockSystem1).toHaveBeenCalledTimes(1);
    expect(mockSystem2).toHaveBeenCalledTimes(1);
  });

  test('should correctly process screen and layout information', () => {
    const mockSystem: system = jest.fn((entities, args) => {
      expect(args.screen.width).toBe(1920);
      expect(args.screen.height).toBe(1080);
      expect(args.layout.width).toBe(1920);
      expect(args.layout.height).toBe(1080);
    });

    systems.addSystem(mockSystem);
    systems.update(mockEntities, mockArgs);

    expect(mockSystem).toHaveBeenCalledTimes(1);
  });
});

  // src/containers/ReactNativeSkiaGameEngine/services/Systems.ts:
import EventEmitter from 'react-native/Libraries/vendor/emitter/EventEmitter';
import { Entities } from './Entities';
import { RNGE_System_Args } from '@/systems/types';

export type system = (entities: Entities, args: RNGE_System_Args) => void;

/**
 * The `Systems` class is responsible for managing and executing an array of systems (user-defined functions)
 * that are run in every frame to update entities within the game engine.
 *
 * This class allows for registering new systems and running them sequentially in each update cycle.
 *
 * @extends EventEmitter
 */
export class Systems extends EventEmitter {
  /**
   * An array of systems (user-defined functions) that will be executed in every frame.
   *
   * @type {system[]}
   * @protected
   */
  protected _systems: system[] = [];

  /**
   * Creates an instance of the `Systems` class.
   */
  constructor() {
    super();
  }

  /**
   * Registers a new system to be executed in each frame update.
   *
   * @param {system} system - The user-defined function that will be added to the list of systems.
   */
  public addSystem(system: system) {
    this._systems.push(system);
  }

  /**
   * Executes all registered systems sequentially.
   * This method is called in every frame to update the entities.
   *
   * @param {Entities} entities - The collection of entities that the systems will update.
   * @param {RNGE_System_Args} args - Additional arguments that are passed to each system during execution.
   */
  public update(entities: Entities, args: RNGE_System_Args) {
    for (const system of this._systems) {
      system(entities, args);
    }
  }
}

  // src/containers/ReactNativeSkiaGameEngine/services/TouchHandler.ts:
import {
  ComposedGesture,
  Gesture,
  GestureType,
} from "react-native-gesture-handler";
import { uid } from "./Entity";

export enum GestureTypes {
  Tap = "tap",
  Pan = "pan",
}

export enum GestureEvents {
  start = "start",
  active = "active",
  end = "end",
  cancel = "cancel",
}

export type Handler = {
  type: GestureTypes;
  event: GestureEvents;
  handler: Function;
  bounds?: { x: number; y: number; width: number; height: number };
};

export class TouchHandler {
  private gestures: (ComposedGesture | GestureType)[] = [];
  constructor() {}
}

  // src/containers/ReactNativeSkiaGameEngine/services/index.ts:
export * from "./Entities";
export * from "./Entity";
export * from "./Frames";
export * from "./Systems";
export * from "./EventDispatcher";
export * from "./TouchHandler";

// utils Files:
  // src/containers/ReactNativeSkiaGameEngine/utils/deepEqual.ts:
export const deepEqual = (obj1: any, obj2: any): boolean => {
  if (typeof obj1 !== "object") {
    if (obj1 !== obj2) {
      return false;
    }
  }
  if (obj1 === obj2) {
    return true;
  }

  if (typeof obj1 !== typeof obj2) {
    return false;
  }

  if (typeof obj1 === "object" && obj1 !== null && obj2 !== null) {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (const key of keys1) {
      if (!deepEqual(obj1[key], obj2[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
};

  // src/containers/ReactNativeSkiaGameEngine/utils/setFrameTimeout.ts:
import { Frames, FrameUpdateEvent } from "../services";

export const setFrameTimeout = (
  frames: Frames,
  callback: () => void,
  frameCount: number
) => {
  const targetFrame = frames.currentFrame + frameCount;

  const handleFrameUpdate = (currentFrame: number) => {
    if (currentFrame >= targetFrame) {
      callback();
      listener.remove();
    }
  };

  const listener = frames.addListener(FrameUpdateEvent, handleFrameUpdate);

  return () => {
    listener.remove();
  };
};

  // src/containers/ReactNativeSkiaGameEngine/utils/testUtils.ts:
// testUtils.ts
let requestAnimationFrameCallbacks: FrameRequestCallback[] = [];
let time = Date.now();
let frameIndex = 0;

export const mockRequestAnimationFrame = () => {
  jest.spyOn(global, 'requestAnimationFrame').mockImplementation((callback) => {
    requestAnimationFrameCallbacks.push(callback);
    return requestAnimationFrameCallbacks.length - 1; // Mock frame ID
  });

  jest.spyOn(global, 'cancelAnimationFrame').mockImplementation((id) => {
    requestAnimationFrameCallbacks.splice(id as number, 1); // Remove the stored callback
  });
};

export const resetTestTimers = () => {
  jest.clearAllMocks();
  requestAnimationFrameCallbacks = [];
  time = Date.now();
  frameIndex = 0;
};

export const advanceTime = (delta: number) => {
  time += delta;
  if (requestAnimationFrameCallbacks[frameIndex]) {
    requestAnimationFrameCallbacks[frameIndex](time);
    frameIndex++;
  }
};

