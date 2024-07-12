import React, { useEffect, useRef } from "react";
import { View, Dimensions } from "react-native";
import {
  Skia,
  SkPath,
  Path,
  Group,
  TileMode,
  vec,
} from "@shopify/react-native-skia";
import { MountainBackgroundView } from "@/components/MountainBackgroundView";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface Mountain {
  path: SkPath;
  color: string;
  xOffset: number;
  width: number;
  initialXOffset: number;
}

export class MountainBackground {
  mountains: Mountain[] = [];
  speed: number = 0;
  timeDelta: number = 0;

  constructor() {
    this.generateInitialMountains();
  }

  private generateRandom(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private generateMountain(xOffset: number): Mountain {
    const height = this.generateRandom(0.2 * screenHeight, 0.7 * screenHeight);
    const width = this.generateRandom(0.2 * screenWidth, 0.5 * screenWidth);
    const path = Skia.Path.Make();
    const baseY = screenHeight - screenHeight * 0.3 + 15;

    path.moveTo(xOffset, baseY);
    // path.lineTo();
    const mountainPathLeftBreak = [
      this.generateRandom(xOffset + width / 3, xOffset + width / 2),
      this.generateRandom(baseY - height * 0.5, baseY - height * 0.8),
    ];
    path.lineTo(mountainPathLeftBreak[0], mountainPathLeftBreak[1]);
    path.lineTo(xOffset + width / 2, baseY - height);
    path.lineTo(xOffset + width, baseY);
    path.close();

    const mountainPath = {
      path,
      color: "#708090",
      xOffset,
      initialXOffset: xOffset,
      width,
      height,
    };

    // Add lighting and shadow gradients
    // const gradient = Skia.Shader.MakeLinearGradient(
    //   vec(xOffset, baseY - height), // Start point
    //   vec(xOffset + width, baseY - height), // End point
    //   [
    //     Skia.Color("rgba(176, 168, 185, 1)"),
    //     Skia.Color("rgba(53, 51, 57, 1)"),
    //     Skia.Color("rgba(53, 51, 57, 1)"),
    //   ], // Grey shades for lighting and shadow
    //   [0, 0.6, 1],
    //   TileMode.Clamp
    // );

    const paint = Skia.Paint();
    paint.setColor(Skia.Color("rgba(41, 61, 59, 1)"));
    // paint.setShader(gradient);
    // Add strokes along the mountain path
    const strokePath = Skia.Path.Make();
    strokePath.moveTo(xOffset, baseY);
    strokePath.lineTo(xOffset + width / 2, baseY - height);
    strokePath.lineTo(xOffset + width, baseY);

    // Add triangular lights and shadows
    // Add rocky paths
    const rockyPaths = [];

    // First rocky path
    const rockyPath1 = Skia.Path.Make();
    const breakOfP1 = this.generateRandom(
      baseY - height * 0.6,
      baseY - height * 0.9
    );
    rockyPath1.moveTo(xOffset + width / 2, breakOfP1);
    rockyPath1.lineTo(xOffset + width / 2, baseY - height);
    rockyPath1.lineTo(mountainPathLeftBreak[0], mountainPathLeftBreak[1]);
    rockyPath1.lineTo(xOffset, baseY);
    rockyPath1.lineTo(xOffset + width / 4, baseY);
    rockyPath1.close();
    rockyPaths.push({
      path: rockyPath1,
      color: Skia.Color("rgba(200, 200, 200, 0.15)"),
    });

    // Second rocky path
    const rockyPath2 = Skia.Path.Make();
    const breakofP2 = this.generateRandom(
      baseY - height * 0.6,
      baseY - height * 0.7
    );
    rockyPath2.moveTo(xOffset + width / 2, baseY - height);
    rockyPath2.lineTo(xOffset + width / 2, breakOfP1);
    rockyPath2.lineTo(xOffset + width / 4, baseY);
    rockyPath2.lineTo(xOffset + width / 1.5, baseY);
    rockyPath2.lineTo(xOffset + width / 2, breakofP2);
    rockyPath2.close();
    rockyPaths.push({
      path: rockyPath2,
      color: Skia.Color("rgba(200, 200, 200, 0.075)"),
    });

    // Add snowcaps
    const snowcapPath = Skia.Path.Make();

    snowcapPath.moveTo(xOffset + width / 2, breakOfP1 + 10);
    snowcapPath.lineTo(xOffset + width / 2, baseY - height);
    snowcapPath.lineTo(mountainPathLeftBreak[0], mountainPathLeftBreak[1]);
    snowcapPath.lineTo(xOffset, baseY);
    const xOffsetBottomBreak = this.generateRandom(width / 25, width / 20);
    snowcapPath.lineTo(xOffset + xOffsetBottomBreak, baseY);
    snowcapPath.close();

    snowcapPath.close();

    const mountain = {
      ...mountainPath,
      paint,
      strokePath,
      snowcapPath,
      rockyPaths,
    };

    return mountain;
  }

  private generateInitialMountains(): void {
    const numMountains = this.generateRandom(2, 5); // 3 to 4 mountains per screen width
    for (let i = 0; i < numMountains; i++) {
      this.mountains.push(
        this.generateMountain(i * (screenWidth / numMountains - 20))
      );
    }
  }

  update(speed: number, timeDelta: number): void {
    this.speed = speed;
    this.timeDelta = timeDelta;

    let mountainsToRemove = [];
    let newMountains = [];

    this.mountains.forEach((mountain, index) => {
      mountain.xOffset -= speed * timeDelta;

      if (mountain.xOffset + mountain.initialXOffset + mountain.width < 0) {
        // Mark mountain for removal and prepare a new mountain to add
        mountainsToRemove.push(index);
        const newMountain = this.generateMountain(
          screenWidth +
            this.generateRandom(0, screenWidth / this.generateRandom(2, 8))
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

  render(): JSX.Element {
    return (
      <Group>
        {this.mountains.map((mountain, index) => (
          <Group key={`mountain-group_${index}`}>
            <Group key={index} transform={[{ translateX: mountain.xOffset }]}>
              <Path path={mountain.path} paint={mountain.paint} />
              {mountain.rockyPaths.map((rockyPath, rockyIndex) => (
                <Path
                  key={rockyIndex}
                  path={rockyPath.path}
                  color={rockyPath.color}
                />
              ))}
            </Group>
            <Group
              key={`mountain-flip-${index}`}
              transform={[
                { translateX: mountain.xOffset },
                // { scaleY: -1 },
                // {
                //   translateY: -screenHeight / 2,
                //   // screenHeight -
                //   // screenHeight * 0.3 +
                //   // 15 +
                //   // mountain.height * 2,
                // },
              ]}
            >
              <Group
                origin={{
                  x: mountain.xOffset - mountain.width,
                  y: screenHeight - (screenHeight * 0.3 + 15),
                }}
                transform={[
                  { scaleY: -1 },
                  { translateY: -screenHeight * 0.15 },
                ]}
              >
                <Path
                  path={mountain.path}
                  color={Skia.Color("rgba(30, 30, 30, 0.5")}
                />
              </Group>
            </Group>
          </Group>
        ))}
      </Group>
    );
  }

  renderer = MountainBackgroundView;
}
