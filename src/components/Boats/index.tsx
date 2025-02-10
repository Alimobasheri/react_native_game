import { ENTITIES_KEYS } from '@/constants/configs';
import {
  useSystem,
  useAddEntity,
  useCanvasDimensions,
  useEntityInstance,
  useEntityState,
  Entity,
  system,
  useEntityMemoizedValue,
} from '@/containers/ReactNativeSkiaGameEngine';
import { Boat } from '@/Game/Entities/Boat/Boat';
import { BoatSystem } from '@/systems/BoatSystem/BoatSystem';
import { PhysicsSystem } from '@/systems/PhysicsSystem/PhysicsSystem';
import {
  FC,
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { BoatView } from '../BoatView/BoatView-rnsge';
import { Sea } from '@/Game/Entities/Sea/Sea';
import { State } from '@/Game/Entities/State/State';
import {
  runOnJS,
  runOnUI,
  SharedValue,
  useAnimatedReaction,
} from 'react-native-reanimated';

export const Boats: FC<{}> = () => {
  const dimensions = useCanvasDimensions();
  const [isActive, setIsActive] = useState(false);
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

  const isRunning = useEntityMemoizedValue<State, SharedValue<boolean>>(
    { label: ENTITIES_KEYS.STATE },
    '_isRunning'
  ) as SharedValue<boolean>;

  const addListener = useCallback(() => {
    'worklet';
    isRunning.addListener(1, (newIsRunning) => {
      runOnJS(setIsActive)(newIsRunning);
    });
  }, [isRunning]);

  const removeListener = useCallback(() => {
    'worklet';
    isRunning.removeListener(1);
  }, [isRunning]);

  useEffect(() => {
    runOnUI(addListener)();

    return () => runOnUI(removeListener)();
  }, [isRunning]);

  const systemCallback: system = useCallback(
    (entities, args) => {
      if (!isActive) return;
      const boatSystemInstance:
        | Entity<MutableRefObject<BoatSystem>>
        | undefined = entities.getEntityByLabel(
        ENTITIES_KEYS.BOAT_SYSTEM_INSTANCE
      );
      boatSystemInstance?.data.current.systemInstanceRNSGE(entities, args);
    },
    [isActive]
  );

  useSystem(systemCallback);

  const { entity: baotsInstances, found } = useEntityState<Boat>({
    group: ENTITIES_KEYS.BOAT_GROUP,
  });
  if (!found || !baotsInstances || !Array.isArray(baotsInstances)) return;
  return baotsInstances.map((boat) => (
    <BoatView key={boat.id} entityId={boat.id} />
  ));
};
