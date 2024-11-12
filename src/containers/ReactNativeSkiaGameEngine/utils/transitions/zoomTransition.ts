import {
  SceneTransition,
  TransitionPhase,
} from '../../components/Scene/types/transitions';

interface ZoomTransitionConfig {
  from?: number;
  to?: number;
}

export const zoomTransition =
  (config?: ZoomTransitionConfig): SceneTransition =>
  ({ camera, phase, progress }) => {
    'worklet';
    const { from = 1, to = 1.5 } = config || {};
    switch (phase) {
      case TransitionPhase.Idle:
      case TransitionPhase.BeforeEnter:
        camera.scaleX.value = from;
        camera.scaleY.value = from;
        break;
      case TransitionPhase.Enter:
        camera.scaleX.value = progress.value * (to - from) + from;
        camera.scaleY.value = progress.value * (to - from) + from;
        break;
      case TransitionPhase.Exit:
        camera.scaleX.value = (1 - progress.value) * (to - from) + from;
        camera.scaleY.value = (1 - progress.value) * (to - from) + from;
        break;
    }
  };
