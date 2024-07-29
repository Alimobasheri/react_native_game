Directory Folder Name contents:
// src/containers/ReactNativeSkiaGameEngine/RNSGE.tsx:
import { FC, memo, PropsWithChildren, useEffect, useMemo } from "react";
import { useEntities, useGameLoop, useSystems, useTouchService } from "./hooks";
import { RNSGEContext } from "./context";
import { MemoizedContainer } from "./components/MemoizedContainer";
import { Canvas } from "@shopify/react-native-skia";
import { EventDispatcher } from "./services";
import { useDispatcher } from "./hooks/useDispatcher";
import {
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

export const ReactNativeSkiaGameEngine: FC<PropsWithChildren> = memo(
  ({ children }) => {
    const entities = useEntities();
    const systems = useSystems();
    const dispatcher = useDispatcher();
    const touchService = useTouchService();
    console.log("🚀 ~ touchService:", touchService);
    const { frames } = useGameLoop(entities, systems, dispatcher);
    const value = useMemo(
      () => ({
        entities: entities,
        systems: systems,
        frames: frames,
        dispatcher,
        touchService,
      }),
      [touchService.gestures]
    );
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={touchService.gestures}>
          <Canvas style={{ flex: 1 }}>
            <RNSGEContext.Provider value={value}>
              <MemoizedContainer>{children}</MemoizedContainer>
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
import { createContext } from "react";
import { IRNSGEContextValue } from "./types";
import { Entities, Frames, Systems, EventDispatcher } from "../services";
import { Gesture } from "react-native-gesture-handler";

export const RNSGEContext = createContext<IRNSGEContextValue>({
  entities: { current: new Entities() },
  systems: { current: new Systems() },
  frames: { current: new Frames() },
  dispatcher: { current: new EventDispatcher() },
  touchService: {
    gestures: Gesture.Race(),
    addGesture: () => {},
  },
});

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

export interface IRNSGEContextValue {
  entities: MutableRefObject<Entities>;
  systems: MutableRefObject<Systems>;
  frames: MutableRefObject<Frames>;
  dispatcher: MutableRefObject<EventDispatcher>;
  touchService: {
    gestures: ComposedGesture;
    addGesture: (gesture: GestureType) => void;
  };
}

// hooks Files:
  // src/containers/ReactNativeSkiaGameEngine/hooks/index.ts:
export * from "./useAddEntity";
export * from "./useEntities";
export * from "./useEntityValue";
export * from "./useGameLoop";
export * from "./useSystem";
export * from "./useSystems";
export * from "./useFrameMemo";
export * from "./useEntityInstance";
export * from "./useEntityMemoizedValue";
export * from "./useTouchHandler";
export * from "./useTouchService";

  // src/containers/ReactNativeSkiaGameEngine/hooks/useAddEntity.ts:
import { FC, useContext, useMemo } from "react";
import { RNSGEContext } from "../context/RNSGEContext";
import { Entity } from "../services/Entity";
import { EntityRendererProps } from "@/constants/views";
import { IEntityOptions } from "../services";

export function useAddEntity<T>(data: T, options?: IEntityOptions) {
  const context = useContext(RNSGEContext);

  const entity = useMemo(() => {
    const entityInstance = new Entity<T>(data);
    context.entities.current.addEntity(entityInstance, options);
    return entityInstance;
  }, []);

  return entity;
}

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

  // src/containers/ReactNativeSkiaGameEngine/hooks/useDispatcher.ts:
import { useRef } from "react";
import { EventDispatcher } from "../services";

export const useDispatcher = () => {
  const dispatcherRef = useRef<EventDispatcher>(new EventDispatcher());
  return dispatcherRef;
};

  // src/containers/ReactNativeSkiaGameEngine/hooks/useEntities.ts:
import { useRef } from "react";
import { Entities } from "../services/Entities";

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
      found.current;
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

  // src/containers/ReactNativeSkiaGameEngine/hooks/useEntityMemoizedValue.ts:
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { RNSGEContext } from "../context/RNSGEContext";
import { Entity } from "../services/Entity";
import { useSharedValue } from "react-native-reanimated";
import { AddEntityEvent } from "../services/Entities";
import { FrameUpdateEvent } from "../services/Frames";
import { useFrameMemo } from "./useFrameMemo";
import { EntityOptions } from "./useEntityValue";

export function useEntityMemoizedValue<E, T>(
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

  const memoizedValue = useFrameMemo<E, T | undefined>(
    () => {
      return getValue(entity, key) as T | undefined;
    },
    [entityId, key],
    getValue
  );

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

  return memoizedValue;
}

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

const useThrottle = (callback: () => any, limit: number) => {
  const lastCall = useRef(0);
  return useCallback(() => {
    const now = Date.now();
    if (now - lastCall.current >= limit) {
      lastCall.current = now;
      callback();
    }
  }, [callback, limit]);
};

export const useFrameEffect = (
  callback: () => any,
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

  // src/containers/ReactNativeSkiaGameEngine/hooks/useFrameMemo.ts:
import { useContext, useEffect, useRef, useState } from "react";
import { Entity, Frames, FrameUpdateEvent } from "../services";
import { RNSGEContext } from "../context";

export type GetValue<E, T> = (
  entity: Entity<E> | undefined,
  key: keyof E
) => T | E[keyof E] | undefined;
export type Factory<T> = () => T;
export type Comparator = (prevDeps: any, nextDeps: any) => boolean;
export type Dep<E> = [string, keyof E];

const deepEqual = (obj1: any, obj2: any): boolean => {
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

  // src/containers/ReactNativeSkiaGameEngine/hooks/useGameLoop.ts:
import { MutableRefObject, useEffect, useRef } from "react";
import { Entities } from "../services/Entities";
import { Systems } from "../services/Systems";
import { Frames } from "../services/Frames";
import { EventDispatcher } from "../services";

export function useGameLoop(
  entities: MutableRefObject<Entities>,
  systems: MutableRefObject<Systems>,
  dispatcher: MutableRefObject<EventDispatcher>
) {
  const frames = useRef<Frames>(new Frames());
  const events = useRef<string[]>([]);

  useEffect(() => {
    const listener = dispatcher.current.addListenerToAllEvents((data) => {
      events.current.push(data);
    });
    const update = (deltaTime: number, now: number, then: number) => {
      systems.current.update(entities.current, {
        events: events.current,
        dispatch: dispatcher.current.emit,
        time: { delta: deltaTime, current: now, previous: then },
      });
      events.current = [];
      frames.current.updateFrame(60, deltaTime);
    };

    const gameLoop = (now: number, then: number) => {
      const deltaTime = now - then; // for 60fps
      update(deltaTime, now, then);
      requestAnimationFrame((nextTime) => gameLoop(nextTime, now));
    };

    requestAnimationFrame((nextTime) => gameLoop(nextTime, nextTime));

    return () => {
      dispatcher.current.removeListenerToAllEvents(listener);
    };
  }, []);

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

  // src/containers/ReactNativeSkiaGameEngine/hooks/useSystems.ts:
import { useRef } from "react";
import { Systems } from "../services/Systems";

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

  // src/containers/ReactNativeSkiaGameEngine/hooks/useTouchService.ts:
import { useRef, useCallback, useState } from "react";
import {
  ComposedGesture,
  Gesture,
  GestureType,
} from "react-native-gesture-handler";

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
    <ReactNativeSkiaGameEngine {...args}>
      <SkyBackground />
      <StarsView />
      <SeaGroup />
      <Physics />
      <Swipe />
    </ReactNativeSkiaGameEngine>
  ),
};

// src/containers/ReactNativeSkiaGameEngine/index.ts:
export * from "./RNSGE";
export * from "./context";
export * from "./hooks";
export * from "./services";

// services Files:
  // src/containers/ReactNativeSkiaGameEngine/services/Entities.ts:
import EventEmitter from "react-native/Libraries/vendor/emitter/EventEmitter";
import { Entity, uid } from "./Entity";

export const AddEntityEvent = "AddEntityEvent";

export interface IEntityOptions {
  label?: string;
  groups?: string[];
}

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
  public id: string = uid();

  constructor(
    initialEntities: Map<string, Entity<any>> = new Map<string, Entity<any>>()
  ) {
    super();
    this._entities = initialEntities;
  }

  public get entities(): Map<string, Entity<any>> {
    return this._entities;
  }

  public get mapLabelToEntityId(): Map<string, string> {
    return this._mapLabelToEntityId;
  }

  public get mapGroupIdToEntities(): Map<string, Entity<any>[]> {
    return this._mapGroupIdToEntities;
  }

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
    setTimeout(() => this.emit(AddEntityEvent, { entity }));
  }

  public getEntityByLabel(label: string): Entity<any> | undefined {
    const entityId = this._mapLabelToEntityId.get(label);
    if (!entityId) return;
    return this._entities.get(entityId);
  }

  public getEntitiesByGroup(group: string): Entity<any>[] {
    return this._mapGroupIdToEntities.get(group) || [];
  }
}

  // src/containers/ReactNativeSkiaGameEngine/services/Entity.ts:
import { EntityRendererProps } from "@/constants/views";
import { FC } from "react";
import EventEmitter from "react-native/Libraries/vendor/emitter/EventEmitter";

export const uid = function () {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const EntityUpdateEvent = "EntityUpdateEvent";

export type EntityUpdateEventArgs<T> = {
  prev: T;
  next: T;
};

export class Entity<T> extends EventEmitter {
  protected _id: string;
  protected _data: T;

  constructor(data: T) {
    super();
    this._id = uid();
    this._data = data;
  }

  public get id(): string {
    return this._id;
  }

  public get data(): T {
    return this._data;
  }

  public set data(data: any) {
    const args: EntityUpdateEventArgs<T> = { prev: this._data, next: data };
    this.emit(EntityUpdateEvent, args);
    this._data = data;
  }
}

  // src/containers/ReactNativeSkiaGameEngine/services/EventDispatcher.ts:
import EventEmitter from "react-native/Libraries/vendor/emitter/EventEmitter";
import { uid } from "./Entity";

export class EventDispatcher extends EventEmitter {
  private _subscribersToAllEvents: Map<string, (data: any) => void> = new Map<
    string,
    (data: any) => void
  >();
  public emitEvent(event: string, data?: any) {
    this.emit(event, data);
    for (const [_, callback] of this._subscribersToAllEvents) {
      callback(data);
    }
  }

  public addListenerToAllEvents(callback: (data: any) => void): string {
    const id = uid();
    this._subscribersToAllEvents.set(id, callback);

    return id;
  }

  public removeListenerToAllEvents(id: string) {
    this._subscribersToAllEvents.delete(id);
  }
}

  // src/containers/ReactNativeSkiaGameEngine/services/Frames.ts:
import EventEmitter from "react-native/Libraries/vendor/emitter/EventEmitter";

export const FrameUpdateEvent = "FrameUpdateEvent";

export class Frames extends EventEmitter {
  private _currentFrame: number = 0;

  constructor() {
    super();
  }

  public get currentFrame(): number {
    return this._currentFrame;
  }

  public updateFrame(fps: number, delta: number) {
    this._currentFrame += Math.floor(1 / fps / delta);
    this.emit(FrameUpdateEvent, this._currentFrame);
  }
}

  // src/containers/ReactNativeSkiaGameEngine/services/Systems.ts:
import EventEmitter from "react-native/Libraries/vendor/emitter/EventEmitter";
import { Entities } from "./Entities";
import { RNGE_System_Args } from "@/systems/types";

export type system = (entities: Entities, args: RNGE_System_Args) => void;

export class Systems extends EventEmitter {
  protected _systems: system[] = [];
  constructor() {
    super();
  }

  public addSystem(system: system) {
    this._systems.push(system);
  }

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

