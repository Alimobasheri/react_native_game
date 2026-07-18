import { SystemProcessArgs } from '../../services-ecs/system';

export const KeyboardInputEventType = 'rntge/keyboard/input' as const;

export enum KeyboardEventTypes {
  Down = 'Down',
  Up = 'Up',
}

export type KeyboardInputEventPayload = {
  eventType: KeyboardEventTypes;
  key: string;
  code: string;
  repeat: boolean;
  timestamp: number;
  meta?: Record<string, unknown>;
};

export type KeyboardInputEvent = {
  type: typeof KeyboardInputEventType;
  payload: KeyboardInputEventPayload;
};

export const KeyboardComponentName = 'keyboard';

export type KeyboardCallbackData = {
  entityId: number;
  key: string;
  code: string;
  repeat: boolean;
  timestamp: number;
  systemArgs: SystemProcessArgs;
};

export type KeyboardCallback = (data: KeyboardCallbackData) => void;

export interface KeyboardComponentData {
  /** If set, only these `key` values invoke callbacks. Omit to receive all keys. */
  keys?: string[];
  onKeyDown?: KeyboardCallback;
  onKeyUp?: KeyboardCallback;
}

export const createKeyboardComponent = (options: KeyboardComponentData) => {
  'worklet';
  return {
    name: KeyboardComponentName,
    data: options,
  };
};
