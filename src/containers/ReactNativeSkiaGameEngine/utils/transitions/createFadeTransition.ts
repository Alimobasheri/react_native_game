import {
  SceneTransition,
  TransitionPhase,
} from '../../components/Scene/types/transitions';

export const createFadeTransition =
  (): SceneTransition =>
  ({ camera, phase, progress }) => {
    'worklet';

    switch (phase) {
      case TransitionPhase.Idle:
      case TransitionPhase.BeforeEnter:
        camera.opacity.value = 0;
        break;
      case TransitionPhase.Enter:
        camera.opacity.value = progress.value;
        break;
      case TransitionPhase.Exit:
        camera.opacity.value = progress.value;
        break;
    }
  };
