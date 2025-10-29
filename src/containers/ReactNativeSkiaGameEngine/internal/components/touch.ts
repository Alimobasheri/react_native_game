import type {
  PanGestureHandlerEventPayload,
  TapGestureHandlerEventPayload,
  LongPressGestureHandlerEventPayload,
  GestureTouchEvent,
} from 'react-native-gesture-handler';
import { ShapeTypes } from './render';

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

export type GestureUnionPayload =
  | {
      kind: GestureKinds.Pan;
      data: PanGestureHandlerEventPayload | GestureTouchEvent;
    }
  | {
      kind: GestureKinds.Tap;
      data: TapGestureHandlerEventPayload | GestureTouchEvent;
    }
  | {
      kind: GestureKinds.LongPress;
      data: LongPressGestureHandlerEventPayload | GestureTouchEvent;
    }
  | {
      kind: GestureKinds.Generic;
      data: Record<string, unknown>;
    };

export type TouchInputEventPayload = {
  pointerId?: number;
  eventType: TouchEventTypes;
  timestamp: number;
  gesture: GestureUnionPayload;
  meta?: Record<string, any>;
};

export type TouchInputEvent = {
  type: typeof TouchInputEventType;
  payload: TouchInputEventPayload;
};

// Touch Component Definitions
export const TouchComponentName = 'touch';

export type TouchGestureCallback<T = GestureUnionPayload> = (data: {
  entityId: number;
  pointerId: number;
  x: number;
  y: number;
  type: string;
  timestamp: number;
  raw?: any;
  gesture: T;
}) => void;

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
