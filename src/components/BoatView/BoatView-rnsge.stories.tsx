import type { Meta, StoryObj } from "@storybook/react";
import { BoatView } from "./BoatView-rnsge";
import { Boat } from "@/Game/Entities/Boat/Boat";
import { BoatFactory } from "@/Game/Factories/BoatFactory/BoatFactory";
import { Dimensions, Text, View } from "react-native";
import { BOAT_BUILDS } from "@/constants/boats";
import { DIRECTION } from "@/constants/configs";
import { Canvas, Rect } from "@shopify/react-native-skia";
import {
  ReactNativeSkiaGameEngine,
  useAddEntity,
  useCanvasDimensions,
} from "@/containers/ReactNativeSkiaGameEngine";
import { FC } from "react";

const { width: windowWidth, height: windowHeight } = Dimensions.get("window");

const BoatsViewComponent: FC<{ boatType: BOAT_BUILDS }> = ({ boatType }) => {
  const dimensions = useCanvasDimensions();
  const boatFactory = new BoatFactory({ windowWidth });
  const boat: Boat = boatFactory.create({
    type: boatType,
    x: windowWidth / 2,
    y: windowHeight / 2,
    direction: DIRECTION.RIGHT,
    label: "boat_red_pirate_skull",
    createdTime: global.nativePerformanceNow(),
  }) as Boat;
  const boatEntity = useAddEntity<Boat>(boat, boat);

  return <BoatView entityId={boatEntity.id} />;
};

export const meta = {
  title: "Boat View RNSGE",
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
      control: { type: "select" },
    },
  },
  render: (args: any) => (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
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
