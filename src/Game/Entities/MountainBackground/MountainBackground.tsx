// import { MountainBackgroundView } from "@/components/MountainBackgroundView";

// interface Point {
//   x: number;
//   y: number;
// }

// export class MountainBackground {
//   private width: number;
//   private height: number;
//   private mountains: Point[][];
//   private speed: number;
//   private amplitude: number;
//   private frequency: number;
//   private phase: number;

//   constructor(
//     width: number,
//     height: number,
//     speed: number = 0.005,
//     amplitude: number = 100,
//     frequency: number = 0.02
//   ) {
//     this.width = width;
//     this.height = height;
//     this.speed = speed;
//     this.amplitude = amplitude;
//     this.frequency = frequency;
//     this.phase = 0;
//     this.mountains = [];

//     this.generateMountains();
//   }

//   private generateMountains() {
//     for (let i = 0; i < 3; i++) {
//       const mountain: Point[] = [];
//       for (let x = 0; x <= this.width * 2; x += 10) {
//         const localAmplitude =
//           this.amplitude + (Math.random() - 0.5) * this.amplitude * 0.3; // Controlled amplitude variance
//         const localFrequency =
//           this.frequency + (Math.random() - 0.5) * this.frequency * 0.2; // Controlled frequency variance
//         const y =
//           this.height / 2 +
//           Math.sin((x + this.phase) * localFrequency) * localAmplitude +
//           (Math.random() - 0.5) * this.amplitude * 0.1; // Reduced variance for dents
//         mountain.push({ x, y });
//       }
//       this.mountains.push(mountain);
//     }
//   }

//   public update(deltaTime: number) {
//     this.phase += this.speed * deltaTime;
//     if (this.phase > 100) this.phase = 0;

//     this.mountains.forEach((mountain) => {
//       mountain.forEach((point) => {
//         point.x -= this.speed * deltaTime;
//       });
//       // If the first point moves out of screen, remove it and add a new point at the end
//       if (mountain[0].x < -10) {
//         mountain.shift();
//         const lastPoint = mountain[mountain.length - 1];
//         const newX = lastPoint.x + 10;
//         const newY =
//           this.height / 2 +
//           Math.sin((newX + this.phase) * this.frequency) * this.amplitude;
//         mountain.push({ x: newX, y: newY });
//       }
//     });
//   }

//   public getMountains(): Point[][] {
//     return this.mountains;
//   }

//   renderer = MountainBackgroundView;
// }

import React, { useEffect, useRef } from "react";
import { View, Dimensions } from "react-native";
import {
  Skia,
  SkPath,
  Path,
  SkiaView,
  Group,
  TileMode,
  Paint,
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
    const height = this.generateRandom(0.3 * screenHeight, 0.5 * screenHeight);
    const width = this.generateRandom(0.2 * screenWidth, 0.4 * screenWidth);
    const path = Skia.Path.Make();
    const baseY = screenHeight - screenHeight * 0.3;

    path.moveTo(xOffset, baseY);
    path.lineTo(xOffset + width / 2, baseY - height);
    path.lineTo(xOffset + width, baseY);
    path.close();

    const mountainPath = {
      path,
      color: "#708090",
      xOffset,
      initialXOffset: xOffset,
      width,
    };

    // Add lighting and shadow gradients
    const gradient = Skia.Shader.MakeLinearGradient(
      vec(xOffset, baseY - height), // Start point
      vec(xOffset + width / 2, baseY), // End point
      [Skia.Color("#666666"), Skia.Color("#333333")], // Grey shades for lighting and shadow
      [0, 1],
      TileMode.Clamp
    );

    // Add strokes along the mountain path
    const strokePath = Skia.Path.Make();
    strokePath.moveTo(xOffset, baseY);
    strokePath.lineTo(xOffset + width / 2, baseY - height);
    strokePath.lineTo(xOffset + width, baseY);

    // Add snowcaps
    const snowcapPath = Skia.Path.Make();
    snowcapPath.moveTo(xOffset + width / 2, baseY - height);
    snowcapPath.lineTo(xOffset + width / 2 - width * 0.1, baseY - height * 0.8);
    snowcapPath.lineTo(xOffset + width / 2 + width * 0.1, baseY - height * 0.8);
    snowcapPath.close();

    // Add triangular lights and shadows
    // Add rocky paths
    const rockyPaths = [];

    // First rocky path
    const rockyPath1 = Skia.Path.Make();
    rockyPath1.moveTo(xOffset + width / 2, baseY - height);
    rockyPath1.lineTo(xOffset + width / 3, baseY - height * 0.6);
    rockyPath1.lineTo(xOffset + width / 2.5, baseY);
    rockyPath1.close();
    rockyPaths.push({ path: rockyPath1, color: Skia.Color("#666666") });

    // Second rocky path
    const rockyPath2 = Skia.Path.Make();
    rockyPath2.moveTo(xOffset + width / 2, baseY - height);
    rockyPath2.lineTo(xOffset + (2 * width) / 3, baseY - height * 0.5);
    rockyPath2.lineTo(xOffset + width / 1.8, baseY);
    rockyPath2.close();
    rockyPaths.push({ path: rockyPath2, color: Skia.Color("#555555") });

    // Third rocky path
    const rockyPath3 = Skia.Path.Make();
    rockyPath3.moveTo(xOffset + width / 2, baseY - height);
    rockyPath3.lineTo(xOffset + width / 4, baseY - height * 0.4);
    rockyPath3.lineTo(xOffset + width / 3, baseY);
    rockyPath3.close();
    rockyPaths.push({ path: rockyPath3, color: Skia.Color("#777777") });

    // Fourth rocky path
    const rockyPath4 = Skia.Path.Make();
    rockyPath4.moveTo(xOffset + width / 2, baseY - height);
    rockyPath4.lineTo(xOffset + (3 * width) / 4, baseY - height * 0.3);
    rockyPath4.lineTo(xOffset + (2.5 * width) / 3, baseY);
    rockyPath4.close();
    rockyPaths.push({ path: rockyPath4, color: Skia.Color("#888888") });

    const mountain = {
      ...mountainPath,
      gradient,
      strokePath,
      snowcapPath,
      rockyPaths,
    };

    return mountain;
  }

  private generateInitialMountains(): void {
    const numMountains = Math.floor(screenWidth / 200) + 2; // 3 to 4 mountains per screen width
    for (let i = 0; i < numMountains; i++) {
      this.mountains.push(this.generateMountain(i * (screenWidth / 3)));
    }
  }

  update(speed: number, timeDelta: number): void {
    this.speed = speed;
    this.timeDelta = timeDelta;

    this.mountains.forEach((mountain, index) => {
      mountain.xOffset -= speed * timeDelta;
      if (mountain.xOffset + mountain.initialXOffset + mountain.width < 0) {
        console.log(
          "🚀 ~ MountainBackground ~ this.mountains.forEach ~ mountain.xOffset:",
          mountain.xOffset
        );
        // Remove and add a new mountain
        this.mountains.splice(index, 1);
        const newMountain = this.generateMountain(
          screenWidth + this.generateRandom(0, screenWidth / 2)
        );
        this.mountains.push(newMountain);
      }
    });
  }

  render(): JSX.Element[] {
    return this.mountains.map((mountain, index) => {
      const transformedPath = mountain.path.copy();
      transformedPath.transform(Skia.Matrix().translate(mountain.xOffset, 0));

      const transformedStrokePath = mountain.strokePath.copy();
      transformedStrokePath.transform(
        Skia.Matrix().translate(mountain.xOffset, 0)
      );

      const transformedSnowcapPath = mountain.snowcapPath.copy();
      transformedSnowcapPath.transform(
        Skia.Matrix().translate(mountain.xOffset, 0)
      );

      const paint = Skia.Paint();
      paint.setShader(mountain.gradient);

      return (
        <Group key={index}>
          <Path
            path={transformedStrokePath}
            color={"#555555"}
            strokeWidth={2}
          />
          <Path path={transformedPath} paint={paint} />
          {mountain.rockyPaths.map((rockyPath, rockyIndex) => {
            const transformedRockyPath = rockyPath.path.copy();
            transformedRockyPath.transform(
              Skia.Matrix().translate(mountain.xOffset, 0)
            );
            return (
              <Path
                key={rockyIndex}
                path={transformedRockyPath}
                color={rockyPath.color}
              />
            );
          })}
          <Path path={transformedSnowcapPath} color={"#FFFFFF"} />
        </Group>
      );
    });
  }

  renderer = MountainBackgroundView;
}

interface MountainBackgroundComponentProps {
  speed: number;
  timeDelta: number;
}

// const MountainBackgroundComponent: React.FC<
//   MountainBackgroundComponentProps
// > = ({ speed, timeDelta }) => {
//   const mountainBackgroundRef = useRef<MountainBackground>(
//     new MountainBackground()
//   );

//   useEffect(() => {
//     const interval = setInterval(() => {
//       mountainBackgroundRef.current.update(speed, timeDelta);
//     }, 16); // roughly 60fps

//     return () => clearInterval(interval);
//   }, [speed, timeDelta]);

//   return (
//     <View style={{ flex: 1 }}>{mountainBackgroundRef.current.render()}</View>
//   );
// };

// export default MountainBackgroundComponent;
