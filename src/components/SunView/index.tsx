import React from "react";
import { View, useWindowDimensions } from "react-native";
import {
  Canvas,
  Path,
  Skia,
  Paint,
  Shader,
  TileMode,
  Group,
} from "@shopify/react-native-skia";

const SunView = () => {
  const { width, height } = useWindowDimensions();
  const sunRadius = 50;
  const centerX = width / 3 - sunRadius;
  const centerY = 0 + sunRadius * 1.5;

  const sunShader = Skia.Shader.MakeRadialGradient(
    { x: centerX, y: centerY },
    sunRadius,
    [Skia.Color("#FF8C00"), Skia.Color("#FFD700")],
    [0, 1],
    TileMode.Clamp
  );

  const sunPaint = Skia.Paint();
  sunPaint.setShader(sunShader);
  sunPaint.setAntiAlias(true);

  const shinyShader = Skia.Shader.MakeRadialGradient(
    { x: centerX, y: centerY },
    sunRadius,
    [Skia.Color("#FFFFFF00"), Skia.Color("#FFFFFF")],
    [0.85, 1],
    TileMode.Clamp
  );

  const shinyPaint = Skia.Paint();
  shinyPaint.setShader(shinyShader);
  shinyPaint.setAntiAlias(true);

  const rayPaint = Skia.Paint();
  rayPaint.setColor(Skia.Color("#FFA500"));
  rayPaint.setStyle(1);
  rayPaint.setStrokeWidth(5);
  rayPaint.setAntiAlias(true);

  const strokePaint = Skia.Paint();
  strokePaint.setColor(Skia.Color("#FF4500"));
  strokePaint.setStyle(1);
  strokePaint.setStrokeWidth(3);
  strokePaint.setAntiAlias(true);

  return (
    <Group>
      <Path
        path={Skia.Path.Make().addCircle(centerX, centerY, sunRadius)}
        paint={sunPaint}
      />
      <Path
        path={Skia.Path.Make().addCircle(centerX, centerY, sunRadius)}
        paint={shinyPaint}
      />
    </Group>
  );
};

export default SunView;
