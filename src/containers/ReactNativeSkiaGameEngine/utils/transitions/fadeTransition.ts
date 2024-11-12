import {
  SceneTransition,
  TransitionPhase,
} from '../../components/Scene/types/transitions';

export const fadeTransition =
  (): SceneTransition =>
  ({ camera, phase, progress }) => {
    'worklet';
    console.log('🚀 ~ progress:', progress.value);
    console.log('🚀 ~ phase:', phase);
    switch (phase) {
      case TransitionPhase.Idle:
      case TransitionPhase.BeforeEnter:
        camera.opacity.value = 0;
        break;
      case TransitionPhase.Enter:
        camera.opacity.value = progress.value;
        break;
      case TransitionPhase.Exit:
        camera.opacity.value = 1 - progress.value;
        break;
    }
  };
