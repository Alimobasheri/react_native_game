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

  const numberOfRays = 12;
  const rayLength = 150;
  const angleStep = (2 * Math.PI) / numberOfRays;
  const rays = [];

  // for (let i = 0; i < numberOfRays; i++) {
  //   const angle = i * angleStep;
  //   const startX = centerX + sunRadius * Math.cos(angle);
  //   const startY = centerY + sunRadius * Math.sin(angle);
  //   const endX = centerX + (sunRadius + rayLength) * Math.cos(angle);
  //   const endY = centerY + (sunRadius + rayLength) * Math.sin(angle);
  //   rays.push(
  //     <Path
  //       key={`ray-${i}`}
  //       path={`M${startX},${startY} L${endX},${endY}`}
  //       paint={rayPaint}
  //     />
  //   );
  // }

  const strokePath = `M${centerX},${centerY - sunRadius + 10} 
                      Q${centerX + 20},${centerY - sunRadius + 30},${
    centerX + 10
  },${centerY - sunRadius + 50}
                      Q${centerX - 20},${centerY - sunRadius + 70},${centerX},${
    centerY - sunRadius + 90
  }`;

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
      {/* <Path path={strokePath} paint={strokePaint} /> */}
    </Group>
  );
};

export default SunView;
