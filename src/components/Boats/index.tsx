import { ENTITIES_KEYS } from "@/constants/configs";
import {
  useSystem,
  useAddEntity,
  useCanvasDimensions,
  useEntityInstance,
  useEntityState,
} from "@/containers/ReactNativeSkiaGameEngine";
import { Boat } from "@/Game/Entities/Boat/Boat";
import { BoatSystem } from "@/systems/BoatSystem/BoatSystem";
import { PhysicsSystem } from "@/systems/PhysicsSystem/PhysicsSystem";
import { FC, MutableRefObject, useRef } from "react";
import { BoatView } from "../BoatView/BoatView-rnsge";
import { Sea } from "@/Game/Entities/Sea/Sea";

export const Boats: FC<{}> = () => {
  const dimensions = useCanvasDimensions();
  console.log("🚀 ~ dimensions:", dimensions);
  const { entity: seaInstance, found: seaFound } = useEntityInstance<Sea>({
    label: ENTITIES_KEYS.SEA,
  });
  const boatSystem = useRef(
    new BoatSystem({
      windowWidth: dimensions.width,
      windowHeight: dimensions.height,
      originalWaterSUrfaceY:
        seaInstance.current.data.getOriginalWaterSurfaceY(),
    })
  );

  useAddEntity<MutableRefObject<BoatSystem>>(boatSystem, {
    label: ENTITIES_KEYS.BOAT_SYSTEM_INSTANCE,
  });

  useSystem((entities, args) => {
    const boatSystemInstance = entities.getEntityByLabel(
      ENTITIES_KEYS.BOAT_SYSTEM_INSTANCE
    );
    boatSystemInstance?.data.current.systemInstanceRNSGE(entities, args);
  });

  const { entity: baotsInstances, found } = useEntityState<Boat>({
    group: ENTITIES_KEYS.BOAT_GROUP,
  });
  if (!found || !baotsInstances || !Array.isArray(baotsInstances)) return;
  return baotsInstances.map((boat) => (
    <BoatView key={boat.id} entityId={boat.id} />
  ));
};
