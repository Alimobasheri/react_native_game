import {
  makeMutable,
  runOnJS,
  runOnUI,
  SharedValue,
  useSharedValue,
} from 'react-native-reanimated';
import {
  ActiveAnimation,
  Animation,
  AnimationConfig,
  RegisterAnimationArg,
} from '../../services/Animations';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { RNSGEContext } from '../../context';
import { useAnimationsController } from '../useAnimationsController/useAnimationsController';
import { uid } from '../../services';

export interface IRegisterExtendableProps {
  isRunning?: boolean;
  animation?: Animation;
  config?: AnimationConfig;
}

export interface ICreateRegisterArgs {
  value: number;
  isRunning: boolean;
  tempAnimationCacheKey: string;
  config?: AnimationConfig;
}

export interface IUseCreateAnimationArgs extends IRegisterExtendableProps {
  sharedValue: SharedValue<any>;
}

export const useCreateAnimation = ({
  sharedValue,
  animation,
  config,
}: IUseCreateAnimationArgs) => {
  const context = useContext(RNSGEContext);

  if (!context) {
    throw new Error(
      'useAnimationsController must be used within a RNSGEContext'
    );
  }

  const activeAnimationRef = useRef<ActiveAnimation | null>(null);
  const animationCache = useRef<Record<string, Animation>>({});

  const {
    registerAnimation: registerAnimationControl,
    stopAnimation,
    pauseAnimation,
    resumeAnimation,
    removeAnimation,
  } = useAnimationsController();

  const createAndRegisterAnimation = useCallback(
    ({
      value,
      isRunning,
      config: configArg,
      tempAnimationCacheKey,
    }: ICreateRegisterArgs): void => {
      const registerAnimationArg: RegisterAnimationArg = {
        sharedValue,
        originalValue: value,
        animation: animationCache.current[tempAnimationCacheKey],
        startTime: makeMutable<number | null>(null),
        accumulatedTime: makeMutable(0),
        isRunning: makeMutable(isRunning === undefined ? true : isRunning),
        config: { ...(config || {}), ...(configArg || {}) },
        direction: makeMutable<-1 | 1>(1),
        loopCount: makeMutable(0),
        lastUpdateTime: makeMutable(0),
        waitingForNextLoop: makeMutable(false),
        loopStartTime: makeMutable(0),
      };

      activeAnimationRef.current =
        registerAnimationControl(registerAnimationArg);
      delete animationCache.current[tempAnimationCacheKey];
      // animationCache.value[activeAnimationRef.current.id] = animationCache.value[tempAnimationCacheKey]
    },
    [sharedValue, config]
  );

  const registerAnimationUI = useCallback(
    ({
      isRunning,
      config,
      tempAnimationCacheKey,
    }: Omit<ICreateRegisterArgs, 'value'>) => {
      'worklet';
      runOnJS(createAndRegisterAnimation)({
        value: sharedValue.value,
        isRunning,
        config,
        tempAnimationCacheKey,
      });
    },
    [createAndRegisterAnimation, sharedValue]
  );

  const registerAnimation = useCallback(
    (args: IRegisterExtendableProps = {}) => {
      const { isRunning, animation: animationArg, config: configArg } = args;
      const animationProp = animationArg ?? animation;
      if (!animationProp) {
        throw new Error('animation is required');
      }
      const tempAnimationCacheKey = uid();
      animationCache.current[tempAnimationCacheKey] = animationProp;
      runOnUI(registerAnimationUI)({
        isRunning: isRunning === undefined ? false : true,
        config: configArg,
        tempAnimationCacheKey,
      });
    },
    [registerAnimationUI]
  );

  const pause = useCallback(() => {
    if (activeAnimationRef.current) pauseAnimation(activeAnimationRef.current);
  }, [activeAnimationRef.current]);

  const resume = useCallback(() => {
    if (activeAnimationRef.current) resumeAnimation(activeAnimationRef.current);
  }, [activeAnimationRef.current]);

  const stop = useCallback(() => {
    if (activeAnimationRef.current) stopAnimation(activeAnimationRef.current);
  }, [activeAnimationRef.current]);

  const remove = useCallback(() => {
    if (activeAnimationRef.current) {
      removeAnimation(activeAnimationRef.current);
    }
  }, [activeAnimationRef.current]);

  useEffect(() => {
    return remove;
  }, []);

  return {
    animation,
    animationInstance: activeAnimationRef,
    registerAnimation,
    pause,
    resume,
    stop,
    remove,
  };
};
