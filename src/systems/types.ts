import { EventDispatcher } from '@/containers/ReactNativeSkiaGameEngine';

/**
 * Represents a single touch event with its coordinates.
 */
export type RNGE_Touch_Event = {
  pageX: number; // The X coordinate of the touch event on the page
  pageY: number; // The Y coordinate of the touch event on the page
};

/**
 * Represents an item in the touch input list, including the event and its type.
 */
export type RNGE_Touch_Item = {
  event: RNGE_Touch_Event; // The touch event details
  type: 'start' | 'end'; // The type of the touch event, indicating if it started or ended
};

/**
 * Represents timing information, including the current time, the previous time, and the time delta between frames.
 */
export type RNGE_Time = {
  current: number; // The current time (timestamp)
  previous: number; // The previous time recorded
  delta: number; // The time difference between the current and previous frame, in milliseconds
};

/**
 * Represents the arguments passed to each system function on every frame update.
 */
export type RNGE_System_Args = {
  touches: RNGE_Touch_Item[]; // An array of touch items, representing touch events that have occurred
  screen: any; // Screen information, typically including dimensions and orientation
  layout: any; // Layout information, which may include positioning, size, and other layout-related details
  events: any[]; // A list of custom events that might be relevant to the current frame
  dispatcher: EventDispatcher; // A function to dispatch actions or events, often used to trigger state changes or events
  time: RNGE_Time; // Timing information, including the current time, previous time, and time delta
};

export type RNGE_Entities = Record<string, any>;

export enum ENGINES {
  RNGE = 'rnge',
  RNSGE = 'rnsge',
}

export interface IGameSystem {
  systemInstance: (
    entities: RNGE_Entities,
    args: RNGE_System_Args
  ) => RNGE_Entities;
  systemManager: (
    entities: RNGE_Entities,
    args: RNGE_System_Args
  ) => RNGE_Entities;
}
