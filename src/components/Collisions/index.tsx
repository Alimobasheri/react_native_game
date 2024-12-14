import { ENTITIES_KEYS } from '@/constants/configs';
import {
  useSystem,
  useAddEntity,
  system,
} from '@/containers/ReactNativeSkiaGameEngine';
import { CollisionsSystem } from '@/systems/CollisionsSystem/CollisionsSystem';
import { FC, MutableRefObject, useCallback, useRef } from 'react';

export const Collisions: FC<{}> = () => {
  const collisionsSystem = useRef(new CollisionsSystem());

  useAddEntity<MutableRefObject<CollisionsSystem>>(collisionsSystem, {
    label: ENTITIES_KEYS.COLLISIONS_SYSTEM_INSTANCE,
  });

  const systemCallback: system = useCallback((entities, args) => {
    const collisionsSystemInstance = entities.getEntityByLabel(
      ENTITIES_KEYS.COLLISIONS_SYSTEM_INSTANCE
    );
    collisionsSystemInstance?.data.current.systemInstanceRNSGE(entities, args);
  }, []);

  useSystem(systemCallback);
  return <></>;
};
