import type { Meta, StoryObj } from '@storybook/react';
import { BoatView } from './BoatView-rnsge';
import { Boat } from '@/Game/Entities/Boat/Boat';
import { BoatFactory } from '@/Game/Factories/BoatFactory/BoatFactory';
import { Dimensions, Text, View } from 'react-native';
import { BOAT_BUILDS } from '@/constants/boats';
import { DIRECTION } from '@/constants/configs';
import { Canvas, Rect } from '@shopify/react-native-skia';
import {
  ReactNativeSkiaGameEngine,
  useAddEntity,
  useCanvasDimensions,
  useSystem,
} from '@/containers/ReactNativeSkiaGameEngine';
import { FC, useMemo, useRef } from 'react';
import Matter from 'matter-js';
import { SHIP_BUILDS } from '@/constants/ships';
import { ShipFactory } from '@/Game/Factories/ShipFactory/ShipFactory';
import { Ship } from '@/Game/Entities/Ship/Ship';
import { ShipView } from './ShipView-rnsge';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

interface IFORCE_TEST {
  x: number;
  y: number;
  at_time: number;
}

const ShipsViewComponent: FC<{
  shipType: SHIP_BUILDS;
  forces: IFORCE_TEST[];
}> = ({ shipType, forces = [] }) => {
  const dimensions = useCanvasDimensions();
  const shipFactory = new ShipFactory({ windowWidth });
  const ship: Ship = shipFactory.create({
    type: shipType,
    x: windowWidth / 2,
    y: windowHeight / 2,
    createdTime: global.nativePerformanceNow(),
  }) as Ship;
  const shipEntity = useAddEntity<Ship>(ship, { label: 'ship' });
  // const staticFloor = useAddEntity<any>(
  //   Matter.Bodies.rectangle(0, 0, windowWidth, 10, {
  //     isStatic: true,
  //     label: 'static-floor',
  //   })
  // );
  const engine = useRef(Matter.Engine.create());
  Matter.World.addBody(engine.current.world, shipEntity.data.body);
  // Matter.World.addBody(engine.current.world, staticFloor.data.body);

  const now = global.nativePerformanceNow();

  useSystem((entities, args) => {
    if (!shipEntity.data.body) return;
    const body = shipEntity.data.body;
    Matter.Body.setAngle(body, 0.5);
  });

  return (
    <>
      <ShipView seaEntityId="null" />
      <Rect x={0} y={0} width={windowWidth} height={10} color="red" />
    </>
  );
};

export const meta = {
  title: 'Ship View RNSGE',
  args: {
    shipType: SHIP_BUILDS.WAR_SHIP,
  },
  argTypes: {
    shipType: {
      options: {
        ...Object.keys(SHIP_BUILDS)
          .map((key) => {
            return {
              [key]: SHIP_BUILDS[key as keyof typeof SHIP_BUILDS],
            };
          })
          .reduce((acc, curr) => {
            return { ...acc, ...curr };
          }, {}),
      },
      control: { type: 'select' },
    },
  },
  render: (args: any) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: 800,
          height: 300,
        }}
      >
        <ReactNativeSkiaGameEngine>
          <BoatsViewComponent {...args} />
        </ReactNativeSkiaGameEngine>
      </View>
    </View>
  ),
} satisfies Meta<typeof BoatView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WarShip: Story = {
  args: {
    shipType: SHIP_BUILDS.WAR_SHIP,
  },
};
