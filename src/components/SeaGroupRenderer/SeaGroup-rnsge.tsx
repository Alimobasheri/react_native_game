import { Boat } from '@/Game/Entities/Boat/Boat';
import { Sea } from '@/Game/Entities/Sea/Sea';
import { Ship } from '@/Game/Entities/Ship/Ship';
import { EntityRendererProps } from '@/constants/views';
import { FC, memo, useCallback, useMemo, useRef } from 'react';
import {
  ENTITIES_KEYS,
  getSeaConfigDefaults,
  TRAIL_FADE_DURATION,
} from '@/constants/configs';
import { ShipView } from '../ShipView/ShipView-rnsge';
import { BoatView } from '../BoatView';
import {
  Group,
  LinearGradient,
  Path,
  Rect,
  Skia,
  TileMode,
  vec,
} from '@shopify/react-native-skia';
import { WATER_GRADIENT_COLORS } from '@/constants/waterConfigs';
import { useWindowDimensions } from 'react-native';
import {
  Entities,
  system,
  useAddEntity,
  useCanvasDimensions,
  useEntityValue,
  useSystem,
} from '@/containers/ReactNativeSkiaGameEngine';
import { SeaSystem } from '@/systems/SeaSystem/SeaSystem';
import { ENGINES } from '@/systems/types';
import { useEntityMemoizedValue } from '@/containers/ReactNativeSkiaGameEngine/hooks/useEntityMemoizedValue';
import { SeaView } from '../SeaView/SeaView-rnsge';
import { SeaViewShader } from '../SeaView/SeaView-rnsge-shader';
import { Boats } from '../Boats';
import { useDispatchEvent } from '@/containers/ReactNativeSkiaGameEngine/hooks/useDispatchEvent';

export type SeaGroupEntities = {
  [key: string]: Sea | Ship | Boat;
};
export type seaGroupEntity = {
  entities: SeaGroupEntities;
  windowWidth: number;
  windowHeight: number;
};
export const SeaGroup: FC<{}> = (props) => {
  const { width, height } = useCanvasDimensions();
  const emitEvent = useDispatchEvent();

  const seaConfig = useMemo(() => {
    return new Sea({
      ...getSeaConfigDefaults(width || 0, height || 0),
      emitEvent,
    });
  }, []);
  const seaEntity = useAddEntity<Sea>(seaConfig, {
    label: 'sea',
  });

  const seaSystem = useRef(new SeaSystem(ENGINES.RNSGE));

  useAddEntity(seaSystem, {
    label: ENTITIES_KEYS.SEA_SYSTEM_INSTANCE,
  });

  const systemCallback: system = useCallback((entities, args) => {
    const seaSystemEn = entities.getEntityByLabel<typeof seaSystem>(
      ENTITIES_KEYS.SEA_SYSTEM_INSTANCE
    );
    const sea = entities.getEntityByLabel(ENTITIES_KEYS.SEA);
    if (!sea || !seaSystemEn) return;
    seaSystemEn.data.current.systemInstanceRNSGE(sea, args);
  }, []);

  useSystem(systemCallback);
  const layersCount = useEntityMemoizedValue<Sea, number>(
    seaEntity.id,
    'layers',
    {
      processor: (layers: Sea['layers'] | undefined) => {
        return !!layers ? layers.length : 0;
      },
    }
  );
  const mainLayerIndex = useEntityMemoizedValue<Sea, number>(
    seaEntity.id,
    'mainLayerIndex'
  );
  const bottomLayerRenders = useCallback(() => {
    if ((!mainLayerIndex && mainLayerIndex !== 0) || !layersCount) return null;
    const renderLayers: React.JSX.Element[] = [];
    for (let i = 0; i <= mainLayerIndex; i++) {
      renderLayers.push(
        <SeaViewShader
          key={i.toString()}
          entityId={seaEntity.id}
          layerIndex={i}
        />
      );
    }
    return renderLayers;
  }, [layersCount, mainLayerIndex]);

  const boats = useCallback(() => {
    return <Boats />;
  }, []);
  const topLayerRenders = useCallback(() => {
    if ((!mainLayerIndex && mainLayerIndex !== 0) || !layersCount) return null;
    const renderLayers: React.JSX.Element[] = [];
    for (let i = mainLayerIndex + 1; i < layersCount; i++) {
      renderLayers.push(
        <SeaViewShader
          key={i.toString()}
          entityId={seaEntity.id}
          layerIndex={i}
        />
      );
    }
    return renderLayers;
  }, [layersCount, mainLayerIndex]);
  return (
    <Group>
      {topLayerRenders()}
      <ShipView key="ship" seaEntityId={seaEntity.id} />
      {boats()}
      {bottomLayerRenders()}
    </Group>
  );
};
