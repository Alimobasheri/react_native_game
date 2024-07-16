import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import {
  Canvas,
  Skia,
  Path,
  Paint,
  Group,
  TileMode,
  RoundedRect,
} from "@shopify/react-native-skia";

// Get window dimensions
const { width: windowWidth, height: windowHeight } = Dimensions.get("window");

const createSimpleCloudPath = (x, y, width, height) => {
  const path = Skia.Path.Make();
  const radius = height / 2;
  path.addRoundRect({ x, y, width, height }, radius, radius);
  return path;
};

const createGradientPaint = (x, y, width, height) => {
  const paint = Skia.Paint();
  const shader = Skia.Shader.MakeLinearGradient(
    { x, y },
    { x: x, y: y + height },
    [
      Skia.Color("rgba(255, 255, 255, 0.5)"),
      Skia.Color("rgba(255, 255, 255, 0.5)"),
      Skia.Color("rgba(169, 169, 169, 0.2)"),
      Skia.Color("rgba(169, 169, 169, 0.2)"),
    ],
    [0, y + height / 2, y + height / 2, y + height],
    TileMode.Clamp
  );
  paint.setShader(shader);
  return paint;
};

// Function to generate random cloud data
const generateClouds = (count) => {
  const clouds = [];
  for (let i = 0; i < count; i++) {
    const width = Math.random() * (windowWidth * 0.1) + windowWidth * 0.05; // Random width
    const height = width * 0.33;
    const x = Math.random() * windowWidth; // Random X position
    const y = Math.random() * (windowHeight * 0.5); // Random Y position (upper half of the screen)

    clouds.push({
      id: i,
      x,
      y,
      width,
      height,
      paint: createGradientPaint(x, y, width, height),
    });
  }
  return clouds;
};

const clouds = generateClouds(5);

const CloudsView = ({ count = 5 }) => {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color("rgba(169, 169, 169, 0.7)"));

  return clouds.map((cloud, index) => (
    <Group key={index}>
      <RoundedRect
        x={cloud.x}
        y={cloud.y}
        width={cloud.width}
        height={cloud.height}
        r={cloud.height / 4}
        paint={cloud.paint}
      />
    </Group>
  ));
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  cloud: {
    position: "absolute",
  },
});

export default CloudsView;
