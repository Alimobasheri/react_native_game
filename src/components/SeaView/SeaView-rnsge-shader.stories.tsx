import type { Meta, StoryObj } from "@storybook/react";
import { Text, View } from "react-native";
import { FC, useCallback, useEffect, useMemo, useRef } from "react";
import { SeaViewShader } from "./SeaView-rnsge-shader";
import { Sea } from "@/Game/Entities/Sea/Sea";
import { getSeaConfigDefaults } from "@/constants/configs";
import {
  ReactNativeSkiaGameEngine,
  useAddEntity,
  useCanvasDimensions,
} from "@/containers/ReactNativeSkiaGameEngine";
import { WATER_GRADIENT_COLORS } from "@/constants/waterConfigs";
import { Blend, Fill, Group, Rect } from "@shopify/react-native-skia";

const meta = {
  title: "Sea View Shader",
  component: SeaViewShader,
  args: {},
} satisfies Meta<typeof SeaViewShader>;

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
    label: "sea",
  });

  return null;
};

export const Basic: Story = {
  args: {},
  render: (args: any) => (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <View
        style={{
          width: 800,
          height: 300,
        }}
      >
        <ReactNativeSkiaGameEngine>
          <SeaGroupComponent />
          <Group>
            <SeaViewShader {...args} layerIndex={2} />
            <SeaViewShader {...args} layerIndex={1} />
            <SeaViewShader {...args} layerIndex={0} />
          </Group>
        </ReactNativeSkiaGameEngine>
      </View>
    </View>
  ),
};
