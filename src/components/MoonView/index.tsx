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

const MoonView = () => {
  const { width, height } = useWindowDimensions();
  const moonRadius = 50;
  const centerX = width - width / 10 - moonRadius;
  const centerY = 0 + moonRadius * 3;

  const moonShader = Skia.Shader.MakeRadialGradient(
    { x: centerX, y: centerY },
    moonRadius,
    [Skia.Color("#B0C4DE"), Skia.Color("#FFFFFF")],
    [0, 1],
    TileMode.Clamp
  );

  const moonPaint = Skia.Paint();
  moonPaint.setShader(moonShader);
  moonPaint.setAntiAlias(true);

  const glowShader = Skia.Shader.MakeRadialGradient(
    { x: centerX, y: centerY },
    moonRadius,
    [Skia.Color("#FFFFFF00"), Skia.Color("#F0E68C")],
    [0.85, 1],
    TileMode.Clamp
  );

  const glowPaint = Skia.Paint();
  glowPaint.setShader(glowShader);
  glowPaint.setAntiAlias(true);

  const starPaint = Skia.Paint();
  starPaint.setColor(Skia.Color("#FFFFFF"));
  starPaint.setStyle(1);
  starPaint.setStrokeWidth(2);
  starPaint.setAntiAlias(true);

  const strokePaint = Skia.Paint();
  strokePaint.setColor(Skia.Color("#778899"));
  strokePaint.setStyle(1);
  strokePaint.setStrokeWidth(3);
  strokePaint.setAntiAlias(true);

  return (
    <Group>
      <Path
        path={Skia.Path.Make().addCircle(centerX, centerY, moonRadius)}
        paint={moonPaint}
      />
      <Path
        path={Skia.Path.Make().addCircle(centerX, centerY, moonRadius)}
        paint={glowPaint}
      />
    </Group>
  );
};

export default MoonView;
