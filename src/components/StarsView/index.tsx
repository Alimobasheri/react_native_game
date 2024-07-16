import React, { FC } from "react";
import { Dimensions, View, useWindowDimensions } from "react-native";
import { Canvas, Path, Skia, Paint, Group } from "@shopify/react-native-skia";
import { EntityRendererProps } from "@/constants/views";
import { Stars } from "@/Game/Entities/BackgroundEntities/Stars/Stars";

export const StarsView: FC<EntityRendererProps<Stars>> = ({
  entity: { stars },
}) => {
  const starPaint = Skia.Paint();
  starPaint.setColor(Skia.Color("#FFFFFF"));
  starPaint.setStyle(0);
  starPaint.setAntiAlias(true);

  return (
    <Group>
      {stars.map((star, index) => (
        <Path
          key={index}
          path={Skia.Path.Make().addCircle(star.x, star.y, star.radius)}
          paint={starPaint}
        />
      ))}
    </Group>
  );
};
