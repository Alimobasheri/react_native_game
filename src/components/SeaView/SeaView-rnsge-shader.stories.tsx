import type { Meta, StoryObj } from '@storybook/react';
import { Text, View } from 'react-native';
import { FC, useCallback, useEffect, useMemo, useRef } from 'react';
import { SeaViewShader } from './SeaView-rnsge-shader';
import { Sea } from '@/Game/Entities/Sea/Sea';
import { ENTITIES_KEYS, getSeaConfigDefaults } from '@/constants/configs';
import {
  ReactNativeSkiaGameEngine,
  useAddEntity,
  useCanvasDimensions,
  useSystem,
} from '@/containers/ReactNativeSkiaGameEngine';
import { WATER_GRADIENT_COLORS } from '@/constants/waterConfigs';
import { Blend, Fill, Group, Rect } from '@shopify/react-native-skia';
import { SeaSystem } from '@/systems/SeaSystem/SeaSystem';
import { ENGINES } from '@/systems/types';
import { Swipe } from '../Swipe';
import { useCreateState } from '@/Game/Entities/State/useCreateState';
import { InitialGameState } from '@/constants/gameState';
import { useDispatchEvent } from '@/containers/ReactNativeSkiaGameEngine/hooks/useDispatchEvent';

const meta = {
  title: 'Sea View Shader',
  component: SeaViewShader,
  args: {},
} satisfies Meta<typeof SeaViewShader>;

export default meta;

type Story = StoryObj<typeof meta>;

const SeaGroupComponent: FC<{}> = (props) => {
  const dimensions = useCanvasDimensions();
  if (!dimensions.width || !dimensions.height) return null;
  useCreateState({
    ...InitialGameState,
    isRunning: true,
  });
  const emitEvent = useDispatchEvent();

  const seaConfig = useMemo(() => {
    return new Sea({
      ...getSeaConfigDefaults(dimensions.width || 0, dimensions.height || 0),
      emitEvent,
    });
  }, []);
  const seaEntitiy = useAddEntity<Sea>(seaConfig, {
    label: 'sea',
  });

  const seaSystem = useRef(new SeaSystem(ENGINES.RNSGE));

  useAddEntity(seaSystem, {
    label: ENTITIES_KEYS.SEA_SYSTEM_INSTANCE,
  });

  useSystem((entities, args) => {
    const seaSystemEn = entities.getEntityByLabel<typeof seaSystem>(
      ENTITIES_KEYS.SEA_SYSTEM_INSTANCE
    );
    const sea = entities.getEntityByLabel(ENTITIES_KEYS.SEA);
    if (!sea || !seaSystemEn) return;
    seaSystemEn.data.current.systemInstanceRNSGE(sea, args);
  });

  return null;
};

export const Basic: Story = {
  args: {},
  render: (args: any) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: 800,
          height: 300,
        }}
      >
        <ReactNativeSkiaGameEngine onEventListeners={{}}>
          <SeaGroupComponent />
          <Group>
            {/* <SeaViewShader {...args} layerIndex={2} /> */}
            <SeaViewShader {...args} layerIndex={1} />
            {/* <SeaViewShader {...args} layerIndex={0} /> */}
          </Group>
          <Swipe />
        </ReactNativeSkiaGameEngine>
      </View>
    </View>
  ),
};
