import { ENTITIES_KEYS } from "@/constants/configs";
import {
  useSystem,
  useAddEntity,
} from "@/containers/ReactNativeSkiaGameEngine";
import { CollisionsSystem } from "@/systems/CollisionsSystem/CollisionsSystem";
import { FC, MutableRefObject, useRef } from "react";

export const Collisions: FC<{}> = () => {
  const collisionsSystem = useRef(new CollisionsSystem());

  useAddEntity<MutableRefObject<CollisionsSystem>>(collisionsSystem, {
    label: ENTITIES_KEYS.COLLISIONS_SYSTEM_INSTANCE,
  });

  useSystem((entities, args) => {
    const collisionsSystemInstance = entities.getEntityByLabel(
      ENTITIES_KEYS.COLLISIONS_SYSTEM_INSTANCE
    );
    collisionsSystemInstance?.data.current.systemInstanceRNSGE(entities, args);
  });
  return <></>;
};
