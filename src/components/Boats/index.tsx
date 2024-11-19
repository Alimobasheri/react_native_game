import { ENTITIES_KEYS } from '@/constants/configs';
import {
  useSystem,
  useAddEntity,
  useCanvasDimensions,
  useEntityInstance,
  useEntityState,
  Entity,
} from '@/containers/ReactNativeSkiaGameEngine';
import { Boat } from '@/Game/Entities/Boat/Boat';
import { BoatSystem } from '@/systems/BoatSystem/BoatSystem';
import { PhysicsSystem } from '@/systems/PhysicsSystem/PhysicsSystem';
import { FC, MutableRefObject, useRef } from 'react';
import { BoatView } from '../BoatView/BoatView-rnsge';
import { Sea } from '@/Game/Entities/Sea/Sea';

export const Boats: FC<{}> = () => {
  const dimensions = useCanvasDimensions();
  const { entity: seaInstance, found: seaFound } = useEntityInstance<Sea>({
    label: ENTITIES_KEYS.SEA,
  });
  const boatSystem = useRef(
    new BoatSystem({
      windowWidth: dimensions.width || 0,
      windowHeight: dimensions.height || 0,
      originalWaterSUrfaceY: (
        seaInstance.current as Entity<Sea>
      )?.data.getOriginalWaterSurfaceY(),
    })
  );

  useAddEntity<MutableRefObject<BoatSystem>>(boatSystem, {
    label: ENTITIES_KEYS.BOAT_SYSTEM_INSTANCE,
  });

  useSystem((entities, args) => {
    const boatSystemInstance: Entity<MutableRefObject<BoatSystem>> | undefined =
      entities.getEntityByLabel(ENTITIES_KEYS.BOAT_SYSTEM_INSTANCE);
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
