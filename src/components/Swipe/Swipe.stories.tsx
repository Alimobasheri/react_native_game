import type { Meta, StoryObj } from '@storybook/react';
import { Text, View } from 'react-native';
import { FC, useCallback, useEffect, useMemo, useRef } from 'react';
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
import { SeaViewShader } from '../SeaView/SeaView-rnsge-shader';

const meta = {
  title: 'Swipe',
  component: Swipe,
  args: {},
} satisfies Meta<typeof Swipe>;

export default meta;

type Story = StoryObj<typeof meta>;

const SeaGroupComponent: FC<{}> = (props) => {
  const dimensions = useCanvasDimensions();
  if (!dimensions.width || !dimensions.height) return null;
  const config = useMemo(() => {
    if (!dimensions.width || !dimensions.height) return {};
    const width = dimensions.width * 1.2;

    return {
      x: width / 2,
      y: dimensions.height * 0.7,
      width: width,
      height: dimensions.height * 0.3,
      layersCount: 3,
      mainLayerIndex: 1,
      gradientColors: WATER_GRADIENT_COLORS[0],
    };
  }, [dimensions.width, dimensions.height]);
  const seaEntitiy = useAddEntity<Sea>(new Sea(config), {
    label: 'sea',
  });

  const seaSystem = useRef(new SeaSystem(ENGINES.RNSGE));

  useAddEntity(seaSystem, {
    label: ENTITIES_KEYS.SEA_SYSTEM_INSTANCE,
  });

  useSystem((entities, args) => {
    const seaSystem = entities.getEntityByLabel(
      ENTITIES_KEYS.SEA_SYSTEM_INSTANCE
    );
    const sea = entities.getEntityByLabel(ENTITIES_KEYS.SEA);
    if (!sea || !seaSystem) return;
    seaSystem.data.current.systemInstanceRNSGE(sea, args);
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
            <SeaViewShader {...args} layerIndex={1} />
          </Group>
          <Swipe />
        </ReactNativeSkiaGameEngine>
      </View>
    </View>
  ),
};
