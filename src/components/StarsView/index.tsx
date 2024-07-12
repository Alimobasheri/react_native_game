import React from "react";
import { Dimensions, View, useWindowDimensions } from "react-native";
import { Canvas, Path, Skia, Paint, Group } from "@shopify/react-native-skia";

export const generateStars = (count, width, height) => {
  const stars = [];
  for (let i = 0; i < count; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius =
      Math.random() < 0.8 ? Math.random() * 1 : Math.random() * 1 + 1;
    stars.push({ x, y, radius });
  }
  return stars;
};

const starCount = 20; // Number of stars to generate
const { width, height } = Dimensions.get("window");
const stars = generateStars(starCount, width, height * 0.3);

export const StarsView = () => {
  const { width, height } = useWindowDimensions();

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
