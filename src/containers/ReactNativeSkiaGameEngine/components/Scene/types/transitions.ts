import { Camera } from '@/containers/ReactNativeSkiaGameEngine/types';
import { SharedValue } from 'react-native-reanimated';

export enum TransitionPhase {
  BeforeEnter = 'beforeEnter',
  Enter = 'enter',
  AfterEnter = 'afterEnter',
  BeforeExit = 'beforeExit',
  Exit = 'exit',
  Idle = 'idle',
}

export type TransitionArgs = {
  camera: Camera;
  phase: TransitionPhase;
  progress: SharedValue<number>;
};

export type SceneTransition = (args: TransitionArgs) => void;
