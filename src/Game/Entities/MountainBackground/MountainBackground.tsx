import React, { memo, useEffect, useRef } from "react";
import { View, Dimensions } from "react-native";
import {
  Skia,
  SkPath,
  Path,
  Group,
  TileMode,
  vec,
  Rect,
  LinearGradient,
  RoundedRect,
} from "@shopify/react-native-skia";
import { MountainBackgroundView } from "@/components/MountainBackgroundView";
import { MountainBackgroundConfig } from "./types";
import { useSharedValue } from "react-native-reanimated";
import Matter from "matter-js";

interface Mountain {
  path: SkPath;
  paint: any;
  xOffset: number;
  width: number;
  initialXOffset: number;
  rockyPaths: { path: SkPath; color: any }[];
  snowcapPath: SkPath;
}

interface Mist {
  path: SkPath;
  paint: any;
  xOffset: number;
}

const getRandomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export class MountainBackground {
  screenWidth: number;
  screenHeight: number;
  mountains: Mountain[] = [];
  speed: number = 0;
  timeDelta: number = 0;

  constructor({ screenWidth, screenHeight }: MountainBackgroundConfig) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.generateInitialMountains();
  }

  private generateRandom(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private generateMountain(xOffset: number, maxWidth?: number): Mountain {
    const width = this.generateRandom(
      0.2 * this.screenWidth,
      maxWidth || 0.4 * this.screenWidth
    );
    return this.createRandomMountain(xOffset, width);
  }

  private generateInitialMountains(): void {
    const numMountains = getRandomInt(2, 4); // 2 to 5 mountains per screen width
    for (let i = 0; i < numMountains; i++) {
      this.mountains.push(
        this.generateMountain(
          i * (this.screenWidth / numMountains),
          this.screenWidth / numMountains
        )
      );
    }
  }

  update(speed: number, timeDelta: number): void {
    this.speed = speed;
    this.timeDelta = timeDelta;

    let mountainsToRemove: number[] = [];
    let newMountains: Mountain[] = [];

    this.mountains.forEach((mountain, index) => {
      mountain.xOffset -= speed * timeDelta;

      if (
        mountain.xOffset +
          mountain.initialXOffset +
          mountain.path.getBounds().width <
        0
      ) {
        // Mark mountain for removal and prepare a new mountain to add
        mountainsToRemove.push(index);
        const newMountain = this.generateMountain(
          this.screenWidth +
            this.generateRandom(0, this.screenWidth / this.generateRandom(2, 8))
        );
        newMountains.push(newMountain);
      }
    });

    // Remove mountains marked for removal
    for (let i = mountainsToRemove.length - 1; i >= 0; i--) {
      this.mountains.splice(mountainsToRemove[i], 1);
    }

    // Add new mountains
    this.mountains.push(...newMountains);
    newMountains = null;
    mountainsToRemove = null;
  }

  createRandomMountainPath = (
    numPeaks: number,
    heightRange: { min: number; max: number },
    width: number,
    baseHeight: number
  ): SkPath => {
    const path = Skia.Path.Make();
    const tallestPeakHeight = getRandomInt(heightRange.min, heightRange.max);
    const tallesPeakIndex = Math.floor(numPeaks / 2);
    const tallestPeakWidth = width / numPeaks;
    const otherPeaksWidth = (width - tallestPeakWidth) / numPeaks;

    path.moveTo(0, baseHeight);

    // Variables to hold the last peak's coordinates
    let lastX = 0,
      lastY = baseHeight;

    // Generate peaks and valleys with smooth cubic Bezier curves
    for (let i = 0; i < numPeaks; i++) {
      const x1 = lastX;
      const y1 = lastY;

      const y2 =
        i === tallesPeakIndex
          ? baseHeight - tallestPeakHeight
          : baseHeight -
            getRandomInt(
              tallestPeakHeight - 0.4 * tallestPeakHeight,
              tallestPeakHeight - 0.2 * tallestPeakHeight
            );
      let segmentWidth = y2 * 0.66;
      const x2 = x1 + segmentWidth / 2;

      const x3 = x1 + segmentWidth;
      const y3 =
        i === numPeaks - 1
          ? baseHeight
          : getRandomInt(y2 + 0.05 * y2, y2 + 0.1 * y2);

      const curveStartX = x1 + 0.9 * (x2 - x1);
      const curveStartY = y1 + 0.9 * (y2 - y1);
      const curveEndX = x3;
      const curveEndY = y3;
      path.lineTo(curveStartX, curveStartY);
      path.quadTo(x2, y2, curveEndX, curveEndY);
      lastX = x3;
      lastY = y3;
    }

    path.lineTo(lastX, baseHeight);
    path.lineTo(0, baseHeight);
    path.close();

    return path;
  };

  createMountainPaint = (width: number, height: number) => {
    const mountainColors = [
      "rgba(44, 72, 90, 1)", // Dark top color
      "rgba(34, 52, 66, 1)", // Mid-tone color
      "rgba(22, 32, 42, 1)", // Lighter base color
    ].reverse();
    const paint = Skia.Paint();
    const shader = Skia.Shader.MakeLinearGradient(
      vec(0, this.screenHeight * 0.7 - height), // Start point
      vec(0, this.screenHeight * 0.7), // End point
      mountainColors.map((col) => Skia.Color(col)),
      [0, 0.3, 1],
      TileMode.Clamp
    );
    paint.setShader(shader);
    paint.setAntiAlias(true);
    return paint;
  };

  createRandomMountain = (xOffset: number, width: number): Mountain => {
    const numPeaks = getRandomInt(
      2,
      Math.floor((width / this.screenWidth) * 10 + 1)
    );
    const heightRange = {
      min: this.screenHeight * 0.2,
      max: this.screenHeight * 0.3,
    };
    const baseHeight = this.screenHeight - this.screenHeight * 0.3 + 7.5;
    const path = this.createRandomMountainPath(
      numPeaks,
      heightRange,
      width,
      baseHeight
    );
    const paint = this.createMountainPaint(
      path.getBounds().width,
      path.getBounds().height
    );
    const rockyPaths: { path: SkPath; color: any }[] = []; // Placeholder for rocky paths
    const snowcapPath = Skia.Path.Make(); // Placeholder for snowcap path

    return {
      path,
      paint,
      xOffset,
      initialXOffset: xOffset,
      width,
      rockyPaths,
      snowcapPath,
      id: Matter.Common.random(10 ** 6, 10 ** 9),
    };
  };

  renderer = MountainBackgroundView;
}

export const MountainViewComponent = ({ mountain }: { mountain: Mountain }) => {
  const path = useSharedValue(mountain.path);
  const paint = useSharedValue(mountain.paint);
  const translateX = useSharedValue(mountain.xOffset);
  useEffect(() => {
    translateX.value = mountain.xOffset;
  }, [mountain.xOffset]);
  return (
    <Group transform={[{ translateX: translateX.value }]}>
      <Path path={path} paint={paint} />
      <Path path={path}>
        <LinearGradient
          start={vec(
            mountain.path.getBounds().x,
            mountain.path.getBounds().y + mountain.path.getBounds().height
          )}
          end={vec(
            mountain.path.getBounds().x,
            mountain.path.getBounds().y + mountain.path.getBounds().height * 0.6
          )}
          colors={[
            Skia.Color("rgba(200, 200, 200, 0.8)"),
            Skia.Color("rgba(200, 200, 200, 0.1)"),
            Skia.Color("rgba(200, 200, 200, 0.1)"),
            Skia.Color("rgba(155, 155, 155, 0.05)"),
          ]}
          positions={[0, 0.1, 0.5, 1]}
        />
      </Path>
    </Group>
  );
};
