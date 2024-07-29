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
