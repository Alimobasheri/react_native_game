import React, { FC, useMemo, useRef } from "react";
import { Dimensions, View, useWindowDimensions } from "react-native";
import { Canvas, Path, Skia, Paint, Group } from "@shopify/react-native-skia";
import { EntityRendererProps } from "@/constants/views";
import { Stars } from "@/Game/Entities/BackgroundEntities/Stars/Stars";
import {
  useAddEntity,
  useEntityMemoizedValue,
} from "@/containers/ReactNativeSkiaGameEngine";
import { Star } from "@/Game/Entities/BackgroundEntities/Stars/types";

export const StarsView: FC<{}> = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const starsData = useRef(
    new Stars({ screenWidth, screenHeight, initialStarsCount: 100 })
  );
  const starsEntity = useAddEntity(starsData.current);
  const stars = useEntityMemoizedValue<Stars, Star[]>(
    starsEntity.id,
    "stars"
  ) as Star[];
  const starPaint = useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#FFFFFF"));
    paint.setStyle(0);
    paint.setAntiAlias(true);
    return paint;
  }, []);

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
