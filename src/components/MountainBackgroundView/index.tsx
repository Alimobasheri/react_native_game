import React, { FC, useEffect, useRef, useState } from "react";
import {
  Canvas,
  LinearGradient,
  Path,
  Skia,
  TileMode,
  vec,
} from "@shopify/react-native-skia";
import { Dimensions, useWindowDimensions } from "react-native";
import { MountainBackground } from "@/Game/Entities/MountainBackground/MountainBackground";
import { EntityRendererProps } from "@/constants/views";

export const MountainBackgroundView: FC<
  EntityRendererProps<MountainBackground>
> = ({ entity }) => {
  const { width, height } = useWindowDimensions();
  const mountains = entity.mountains;
  // const path = Skia.Path.Make();
  // path.moveTo(mountain[0].x, mountain[0].y);
  // for (let i = 1; i < mountain.length; i++) {
  //   path.lineTo(mountain[i].x, mountain[i].y);
  // }
  // path.lineTo(width, height);
  // path.lineTo(0, height);
  // path.close();
  // const paint = Skia.Paint();
  // const gradient = Skia.Shader.MakeLinearGradient(
  //   vec(0, 0),
  //   vec(0, height),
  //   [
  //     Skia.Color(`rgba(100, 100, 100, ${0.5 + index * 0.3})`),
  //     Skia.Color(`rgba(50, 50, 50, ${0.3 + index * 0.3})`),
  //   ],
  //   [0, 1],
  //   TileMode.Clamp
  // );
  // paint.setShader(gradient);
  return entity.render();
};
