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
import { FC, useRef } from 'react';
import Matter from 'matter-js';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

interface IFORCE_TEST {
  x: number;
  y: number;
  at_time: number;
}

const BoatsViewComponent: FC<{
  boatType: BOAT_BUILDS;
  forces: IFORCE_TEST[];
}> = ({ boatType, forces = [] }) => {
  const dimensions = useCanvasDimensions();
  const boatFactory = new BoatFactory({ windowWidth });
  const boat: Boat = boatFactory.create({
    type: boatType,
    x: windowWidth / 2,
    y: windowHeight / 2,
    direction: DIRECTION.RIGHT,
    label: boatType,
    createdTime: global.nativePerformanceNow(),
  }) as Boat;
  const boatEntity = useAddEntity<Boat>(boat, boat);
  const staticFloor = useAddEntity<any>(
    Matter.Bodies.rectangle(0, 0, windowWidth, 10, {
      isStatic: true,
      label: 'static-floor',
    })
  );
  const engine = useRef(Matter.Engine.create());
  Matter.World.addBody(engine.current.world, boatEntity.data.body);
  Matter.World.addBody(engine.current.world, staticFloor.data.body);

  const now = global.nativePerformanceNow();

  useSystem((entities, args) => {
    if (!boatEntity.data.body) return;
    let appliedForce = false;
    forces.forEach((force) => {
      if (!boatEntity.data.body) return;
      const { x, y, at_time } = force;
      if (args.time.current - now < at_time) return;
      const body = boatEntity.data.body;
      const forcePosition = Matter.Vector.create(
        body.position.x + x,
        body.position.y + y
      );
      const forceVector = Matter.Vector.create(10, 10);
      Matter.Body.applyForce(body, forcePosition, forceVector);
      appliedForce = true;
    });
    if (!appliedForce) {
      Matter.Body.setVelocity(boatEntity.data.body, { x: 0, y: 0 });
      Matter.Body.setPosition(boatEntity.data.body, {
        x: windowWidth / 2,
        y: windowHeight / 2,
      });
    }
    Matter.Engine.update(engine.current, args.time.delta);
  });

  return (
    <>
      <BoatView entityId={boatEntity.id} />
      <Rect x={0} y={0} width={windowWidth} height={10} color="red" />
    </>
  );
};

export const meta = {
  title: 'Boat View RNSGE',
  args: {
    boatType: BOAT_BUILDS.RED_PIRATE_SKULL_HEAD,
  },
  argTypes: {
    boatType: {
      options: {
        ...Object.keys(BOAT_BUILDS)
          .map((key) => {
            return {
              [key]: BOAT_BUILDS[key as keyof typeof BOAT_BUILDS],
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

export const Red_Skull_Pirate: Story = {
  args: {
    boatType: BOAT_BUILDS.RED_PIRATE_SKULL_HEAD,
  },
};

export const BOAT_LAB: Story = {
  args: {
    boatType: BOAT_BUILDS.RED_PIRATE_SKULL_HEAD,
    forces: [
      {
        x: 12,
        y: 12,
        at_time: 1000000,
      },
    ],
  },
  argTypes: {
    forces: {
      control: { type: 'object' },
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
};
