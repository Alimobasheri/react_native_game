import React, { FC, useEffect, useRef, useState } from "react";
import {
  Canvas,
  Group,
  LinearGradient,
  Path,
  Skia,
  TileMode,
  vec,
} from "@shopify/react-native-skia";
import { Dimensions, useWindowDimensions } from "react-native";
import { MountainBackground } from "@/Game/Entities/MountainBackground/MountainBackground";
import { EntityRendererProps } from "@/constants/views";
import SunView from "../SunView";
import MoonView from "../MoonView";
import { StarsView } from "../StarsView";

export const MountainBackgroundView: FC<
  EntityRendererProps<MountainBackground>
> = ({ entity }) => {
  return (
    <Group>
      {/* <SunView /> */}
      <StarsView />
      <MoonView />
      {entity.render()}
    </Group>
  );
};
