import {
  SceneTransition,
  TransitionPhase,
} from '../../components/Scene/types/transitions';

export enum SlideXDirection {
  Left = -1,
  None = 0,
  Right = 1,
}

export enum SlideYDirection {
  Up = -1,
  None = 0,
  Down = 1,
}

export interface ISlideTransitionConfig {
  x?: SlideXDirection;
  y?: SlideYDirection;
}

export const createSlideTransition = (
  config?: ISlideTransitionConfig
): SceneTransition => {
  const { x = SlideXDirection.Left, y = SlideYDirection.None } = config || {};
  return ({ camera, phase, progress }) => {
    'worklet';
    switch (phase) {
      case TransitionPhase.BeforeEnter:
        camera.translateX.value = camera.width.value * x;
        camera.translateY.value = camera.height.value * y;
        break;
      case TransitionPhase.Enter:
        camera.translateX.value = (1 - progress.value) * camera.width.value * x;
        camera.translateY.value =
          (1 - progress.value) * camera.height.value * y;
        break;
      case TransitionPhase.Exit:
        camera.translateX.value = (1 - progress.value) * camera.width.value * x;
        camera.translateY.value =
          (1 - progress.value) * camera.height.value * y;
        break;
    }
  };
};
