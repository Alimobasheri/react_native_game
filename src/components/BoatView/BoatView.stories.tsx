import type { Meta, StoryObj } from "@storybook/react";
import { BoatView } from ".";
import { Boat } from "@/Game/Entities/Boat/Boat";
import { BoatFactory } from "@/Game/Factories/BoatFactory/BoatFactory";
import { Dimensions, Text, View } from "react-native";
import { BOAT_BUILDS } from "@/constants/boats";
import { DIRECTION } from "@/constants/configs";
import { Canvas, Rect } from "@shopify/react-native-skia";

const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
const boatFactory = new BoatFactory({ windowWidth });
const boat: Boat = boatFactory.create({
  type: BOAT_BUILDS.RED_PIRATE_SKULL_HEAD,
  x: windowWidth / 2,
  y: windowHeight / 2,
  direction: DIRECTION.UP,
  label: "boat_red_pirate_skull",
}) as Boat;

const meta = {
  title: "Boat View",
  component: BoatView,
  args: {
    entity: {
      body: boat.body,
      size: boat.size,
      direction: boat.direction,
      trail: boat.trail,
      imageSource: boat.imageSource,
    },
  },
  decorators: [
    (Story) => {
      return (
        <View style={{ flex: 1 }}>
          <Canvas
            style={{
              flex: 1,
            }}
          >
            <Story />
          </Canvas>
        </View>
      );
    },
  ],
} satisfies Meta<typeof BoatView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Red_Skull_Pirate: Story = {
  args: {
    entity: {
      body: boat.body,
      size: boat.size,
      direction: boat.direction,
      trail: boat.trail,
      imageSource: boat.imageSource,
    },
  },
};
