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
  dimensions: { width: null, height: null },
});
