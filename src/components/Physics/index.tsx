import { ENTITIES_KEYS } from "@/constants/configs";
import {
  useSystem,
  useAddEntity,
} from "@/containers/ReactNativeSkiaGameEngine";
import { PhysicsSystem } from "@/systems/PhysicsSystem/PhysicsSystem";
import { FC, MutableRefObject, useRef } from "react";

export const Physics: FC<{}> = () => {
  const physicsSystem = useRef(new PhysicsSystem());

  useAddEntity<MutableRefObject<PhysicsSystem>>(physicsSystem, {
    label: ENTITIES_KEYS.PHYSICS_SYSTEM_INSTANCE,
  });

  useSystem((entities, args) => {
    const physicsSystemInstance = entities.getEntityByLabel(
      ENTITIES_KEYS.PHYSICS_SYSTEM_INSTANCE
    );
    physicsSystemInstance?.data.current.systemInstanceRNSGE(entities, args);
  });
  return <></>;
};
