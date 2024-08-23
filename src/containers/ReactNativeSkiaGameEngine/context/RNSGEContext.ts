import { createContext } from 'react';
import { IRNSGEContextValue } from './types';
import { Entities, Frames, Systems, EventDispatcher } from '../services';
import { Gesture } from 'react-native-gesture-handler';

export const RNSGEContext = createContext<IRNSGEContextValue | undefined>(
  undefined
);
