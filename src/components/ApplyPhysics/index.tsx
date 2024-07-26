import { useSystem } from "@/containers/ReactNativeSkiaGameEngine";
import { PhysicsSystem } from "@/systems/PhysicsSystem/PhysicsSystem";
import { FC, useRef } from "react";

export const ApplyPhysics: FC<{}> = () => {
  const physicsSystem = useRef(new PhysicsSystem());

  useSystem((entities, args) => {
    physicsSystem.current.systemInstanceRNSGE(entities, args);
  });
  return <></>;
};
