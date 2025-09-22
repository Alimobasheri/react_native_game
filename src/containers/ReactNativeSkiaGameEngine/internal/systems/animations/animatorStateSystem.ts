import {
  ClipAnimationData,
  TransitionOp,
} from '@/containers/ReactNativeSkiaGameEngine/types-ecs/render';
import { System } from '../../../services-ecs/system';
import {
  AnimatorStateComponentData,
  AnimatorStateComponentName,
} from '../../components/animatorState';
import {
  AnimationClipComponentData,
  AnimationClipComponentName,
} from '../../components/animationClip';
import { hashString } from '@/containers/ReactNativeSkiaGameEngine/utils/hasString';

const compare = (param: any, value: any, op: TransitionOp) => {
  'worklet';
  switch (op) {
    case TransitionOp.EQUAL:
      return param === value;
    case TransitionOp.NOT_EQUAL:
      return param !== value;
    case TransitionOp.GREATER_THAN:
      return param > value;
    case TransitionOp.LESS_THAN:
      return param < value;
    case TransitionOp.GREATER_THAN_OR_EQUAL:
      return param >= value;
    case TransitionOp.LESS_THAN_OR_EQUAL:
      return param <= value;
    default:
      return false;
  }
};

export const animatorStateSystem: System = {
  requiredComponents: [AnimatorStateComponentName, AnimationClipComponentName],
  process: ({ entities, components, assets }) => {
    'worklet';

    const animationAssets: Record<string, ClipAnimationData> =
      assets.value.clipAnimations;

    entities.forEach((entity) => {
      const animator: AnimatorStateComponentData =
        components[AnimatorStateComponentName].get(entity);
      const animationClip: AnimationClipComponentData =
        components[AnimationClipComponentName].get(entity);
      if (!animator || !animationClip) return;

      const machine = animationAssets[animator.stateMachineId];
      if (!machine) return;

      for (const transition of machine.stateMachine.transitions) {
        if (hashString(transition.from) === animator.currentStateId) {
          const param = animator.parameters[transition.condition.param];
          if (
            compare(param, transition.condition.value, transition.condition.op)
          ) {
            animator.currentStateId = hashString(transition.to);
            animationClip.clipId = transition.to;
            animationClip.frameIndex = 0;
            animationClip.elapsedTime = 0;
            break;
          }
        }
      }
    });
  },
};
