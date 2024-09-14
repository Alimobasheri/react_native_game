import { MutableRefObject } from 'react';
import {
  Entities,
  EventDispatcher,
  Frames,
  Systems,
  TouchHandler,
} from '../services';
import { ComposedGesture, GestureType } from 'react-native-gesture-handler';
import Animations from '../services/Animations';

export interface ICanvasDimensions {
  width: number | null;
  height: number | null;
}

export interface IRNSGEContextValue {
  entities: MutableRefObject<Entities>;
  systems: MutableRefObject<Systems>;
  frames: MutableRefObject<Frames>;
  animations: MutableRefObject<Animations>;
  dispatcher: MutableRefObject<EventDispatcher>;
  touchService: {
    gestures: ComposedGesture;
    addGesture: (gesture: GestureType) => void;
  };
  dimensions: ICanvasDimensions;
}
