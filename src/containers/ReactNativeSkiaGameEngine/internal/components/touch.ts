import type {
  PanGestureHandlerEventPayload,
  TapGestureHandlerEventPayload,
  LongPressGestureHandlerEventPayload,
  GestureTouchEvent,
} from 'react-native-gesture-handler';
import { ShapeTypes } from './render';
import { SystemProcessArgs } from '../../services-ecs/system';

// Re-export ShapeTypes for convenience
export { ShapeTypes };

export const TouchInputEventType = 'rntge/touch/input' as const;

export enum GestureKinds {
  Pan = 'Pan',
  Tap = 'Tap',
  LongPress = 'LongPress',
  Generic = 'Generic',
}

export enum TouchEventTypes {
  Start = 'Start',
  Move = 'Move',
  End = 'End',
  Cancel = 'Cancel',
  Tap = 'Tap',
  LongPress = 'LongPress',
}

export type PanGesturePayload = {
  kind: GestureKinds.Pan;
  data: PanGestureHandlerEventPayload;
};

export type TapGesturePayload = {
  kind: GestureKinds.Tap;
  data: TapGestureHandlerEventPayload;
};

export type LongPressGesturePayload = {
  kind: GestureKinds.LongPress;
  data: LongPressGestureHandlerEventPayload;
};

export type GenericGesturePayload = {
  kind: GestureKinds.Generic;
  data: Record<string, unknown>;
};
export type GestureUnionPayload =
  | PanGesturePayload
  | TapGesturePayload
  | LongPressGesturePayload
  | GenericGesturePayload;

export type TouchInputEventPayload<T = GestureUnionPayload> = {
  pointerId?: number;
  eventType: TouchEventTypes;
  timestamp: number;
  gesture: T;
  meta?: Record<string, any>;
};

export type TouchInputEvent = {
  type: typeof TouchInputEventType;
  payload: TouchInputEventPayload;
};

// Touch Component Definitions
export const TouchComponentName = 'touch';

export type TouchGestureCallbackData<T = GestureUnionPayload> = {
  entityId: number;
  pointerId: number;
  x: number;
  y: number;
  type: string;
  timestamp: number;
  raw?: any;
  gesture: T;
  systemArgs: SystemProcessArgs;
};

export type TouchGestureCallback<T = GestureUnionPayload> = (
  data: TouchGestureCallbackData<T>
) => void;

export interface TouchComponentData {
  priority?: number;
  capture?: boolean;
  shape?: {
    type: ShapeTypes;
    width?: number;
    height?: number;
    radius?: number;
    vertices?: { x: number; y: number }[];
  };
  onGestureStart?: TouchGestureCallback;
  onGesture?: TouchGestureCallback;
  onGestureEnd?: TouchGestureCallback;
}

export const createTouchComponent = (options: TouchComponentData) => {
  'worklet';
  return {
    name: TouchComponentName,
    data: options,
  };
};

// Tap Component Definitions
export const TapComponentName = 'tap';

export interface TapComponentData {
  priority?: number;
  capture?: boolean;
  shape?: {
    type: ShapeTypes;
    width?: number;
    height?: number;
    radius?: number;
    vertices?: { x: number; y: number }[];
  };
  onTap?: TouchGestureCallback<{
    kind: GestureKinds.Tap;
    data: TapGestureHandlerEventPayload;
  }>;
}

export const createTapComponent = (options: TapComponentData) => {
  'worklet';
  return {
    name: TapComponentName,
    data: options,
  };
};

// Pan Component Definitions
export const PanComponentName = 'pan';

export interface PanComponentData {
  priority?: number;
  capture?: boolean;
  checkBoundsOnUpdate?: boolean;
  shape?: {
    type: ShapeTypes;
    width?: number;
    height?: number;
    radius?: number;
    vertices?: { x: number; y: number }[];
  };
  onPanStart?: TouchGestureCallback<{
    kind: GestureKinds.Pan;
    data: PanGestureHandlerEventPayload;
  }>;
  onPanUpdate?: TouchGestureCallback<{
    kind: GestureKinds.Pan;
    data: PanGestureHandlerEventPayload;
  }>;
  onPanEnd?: TouchGestureCallback<{
    kind: GestureKinds.Pan;
    data: PanGestureHandlerEventPayload;
  }>;
}

export const createPanComponent = (options: PanComponentData) => {
  'worklet';
  return {
    name: PanComponentName,
    data: options,
  };
};

// LongPress Component Definitions
export const LongPressComponentName = 'longPress';

export interface LongPressComponentData {
  priority?: number;
  capture?: boolean;
  shape?: {
    type: ShapeTypes;
    width?: number;
    height?: number;
    radius?: number;
    vertices?: { x: number; y: number }[];
  };
  onLongPress?: TouchGestureCallback<{
    kind: GestureKinds.LongPress;
    data: LongPressGestureHandlerEventPayload;
  }>;
}

export const createLongPressComponent = (options: LongPressComponentData) => {
  'worklet';
  return {
    name: LongPressComponentName,
    data: options,
  };
};
