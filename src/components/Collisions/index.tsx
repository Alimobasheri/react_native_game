import { ENTITIES_KEYS } from '@/constants/configs';
import {
  useSystem,
  useAddEntity,
  system,
  useEntityMemoizedValue,
} from '@/containers/ReactNativeSkiaGameEngine';
import { State } from '@/Game/Entities/State/State';
import { CollisionsSystem } from '@/systems/CollisionsSystem/CollisionsSystem';
import { FC, MutableRefObject, useCallback, useRef, useState } from 'react';
import {
  runOnJS,
  SharedValue,
  useAnimatedReaction,
} from 'react-native-reanimated';

export const Collisions: FC<{}> = () => {
  const [isActive, setIsActive] = useState(false);
  const collisionsSystem = useRef(new CollisionsSystem());

  useAddEntity<MutableRefObject<CollisionsSystem>>(collisionsSystem, {
    label: ENTITIES_KEYS.COLLISIONS_SYSTEM_INSTANCE,
  });

  const isRunning = useEntityMemoizedValue<State, SharedValue<boolean>>(
    { label: ENTITIES_KEYS.STATE },
    '_isRunning'
  ) as SharedValue<boolean>;

  const isGamePlayExited = useEntityMemoizedValue<State, SharedValue<boolean>>(
    { label: ENTITIES_KEYS.STATE },
    '_isGamePlayExited'
  ) as SharedValue<boolean>;

  useAnimatedReaction(
    () => !isRunning.value || isGamePlayExited.value,
    (isInActive) => {
      if (isActive === isInActive) runOnJS(setIsActive)(!isInActive);
    },
    [isRunning]
  );

  const systemCallback: system = useCallback(
    (entities, args) => {
      if (!isActive) return;
      const collisionsSystemInstance = entities.getEntityByLabel(
        ENTITIES_KEYS.COLLISIONS_SYSTEM_INSTANCE
      );
      collisionsSystemInstance?.data.current.systemInstanceRNSGE(
        entities,
        args
      );
    },
    [isActive]
  );

  useSystem(systemCallback);
  return null;
};
