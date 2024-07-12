import { Boat } from "@/Game/Entities/Boat/Boat";
import { Sea } from "@/Game/Entities/Sea/Sea";
import { Ship } from "@/Game/Entities/Ship/Ship";
import { EntityRendererProps } from "@/constants/views";
import { FC, useCallback, useMemo } from "react";
import { SeaView } from "../SeaView";
import { ENTITIES_KEYS, TRAIL_FADE_DURATION } from "@/constants/configs";
import { ShipView } from "../ShipView";
import { BoatView } from "../BoatView";
import {
  Group,
  LinearGradient,
  Path,
  Rect,
  Skia,
  TileMode,
  vec,
} from "@shopify/react-native-skia";
import { WATER_GRADIENT_COLORS } from "@/constants/waterConfigs";
import { useWindowDimensions } from "react-native";

export type SeaGroupEntities = {
  [key: string]: Sea | Ship | Boat;
};
export type seaGroupEntity = {
  entities: SeaGroupEntities;
};
export const SeaGroupRenderer: FC<EntityRendererProps<seaGroupEntity>> = (
  props
) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const sea: Sea = props.entity.entities["sea"] as Sea;
  const layers = sea.layers;
  const bottomLayerRenders = useCallback(() => {
    const renderLayers = [];
    for (let i = 0; i <= sea.mainLayerIndex; i++) {
      const layer: Sea = layers[i];
      renderLayers.push(
        <SeaView
          key={i.toString()}
          entity={layer}
          screen={props.screen}
          layout={props.layout}
        />
      );
      // else
      //   renderLayers.push(
      //     <Rect
      //       key={i.toString()}
      //       x={layer.startingX}
      //       y={layer.startingY}
      //       width={layer.width}
      //       height={layer.height}
      //     >
      //       <LinearGradient
      //         colors={WATER_GRADIENT_COLORS[i]}
      //         start={{ x: 0, y: 1 }}
      //         end={{ x: 1, y: 1 }}
      //       />
      //     </Rect>
      //   );
    }
    return renderLayers;
  }, []);

  const shipAndBoatsRender = useCallback(() => {
    const ship: Ship = props.entity.entities["ship"] as Ship;
    const boats: Boat[] = Object.keys(props.entity.entities)
      .filter((key: string) => key.startsWith(ENTITIES_KEYS.BOAT_LABEL))
      .map((key) => props.entity.entities[key] as Boat);
    const now = Date.now();

    const renders = [];
    renders.push(
      <ShipView
        key={"ship"}
        entity={ship}
        screen={props.screen}
        layout={props.layout}
      />
    );
    boats.forEach((boat) => {
      const { trail } = boat;
      renders.push(
        <Group key={"boatGroup"}>
          {/* Render the trail */}
          {trail.map((trailPoint, index) => {
            if (index === 0 || !trailPoint.render) return null;
            const prevPoint = trail
              .slice(0, index)
              .reverse()
              .find((p) => p.render);
            if (!prevPoint) return null;
            const age = now - trailPoint.timestamp;
            const opacity = Math.max(0.7 - age / TRAIL_FADE_DURATION, 0);
            const width =
              2 +
              (trailPoint.velocityX / 10) * (age / TRAIL_FADE_DURATION) * 20; // Increase width over time

            // Calculate the part of the trail above the water surface
            const waterSurfaceYPrev = prevPoint.y;
            const waterSurfaceYCurr = trailPoint.y;

            const aboveWaterYStart = Math.min(prevPoint.y, waterSurfaceYPrev);
            const aboveWaterYEnd = Math.min(trailPoint.y, waterSurfaceYCurr);

            // Adjust y-coordinates for the upper half of the path
            const adjustedAboveWaterYStart = aboveWaterYStart - width / 2;
            const adjustedAboveWaterYEnd = aboveWaterYEnd - width / 2;

            // Create the path for the above-water part of the trail using a series of arcs
            const path = Skia.Path.Make();
            path.moveTo(prevPoint.x, adjustedAboveWaterYStart);
            for (let i = 0; i < width; i++) {
              const arcX =
                prevPoint.x + (trailPoint.x - prevPoint.x) * (i / width);
              const arcY =
                adjustedAboveWaterYStart + Math.sin((i / width) * Math.PI) * 10; // splash effect
              path.lineTo(arcX, arcY);
            }
            path.lineTo(trailPoint.x, adjustedAboveWaterYEnd);

            return (
              <Path
                key={index}
                path={path}
                color={`rgba(255, 255, 255, ${opacity})`}
                strokeWidth={width}
                style={"stroke"}
                // style={"fill"}
              ></Path>
            );
          })}
          <BoatView
            key={boat.body?.label}
            entity={boat}
            screen={props.screen}
            layout={props.layout}
          />
        </Group>
      );
    });

    return renders;
  }, []);

  const topLayerRenders = useCallback(() => {
    let entity = layers[sea.layers.length - 1];
    // const beachEnd =
    //   layers[sea.layers.length - 1].getOriginalWaterSurfaceY() - 20;
    // const beachPath = Skia.Path.Make();
    // beachPath.moveTo(0, entity.getOriginalWaterSurfaceY()); // Starting point on the left edge
    // beachPath.lineTo(0, beachEnd); // Move down to the bottom left corner
    // beachPath.lineTo(windowWidth, beachEnd); // Move right to the bottom right corner
    // beachPath.lineTo(windowWidth, entity.getOriginalWaterSurfaceY()); // Move up to the top right point
    // beachPath.close(); // Close the path
    // const beachPaint = Skia.Paint();
    // const beachGradient = Skia.Shader.MakeLinearGradient(
    //   vec(0, entity.getOriginalWaterSurfaceY()), // Starting point of the gradient
    //   vec(0, beachEnd + 10), // Ending point of the gradient
    //   [Skia.Color("#ffffff"), Skia.Color("#F4C542")], // Gradient colors from top to bottom
    //   null, // No color positions specified
    //   TileMode.Clamp // Gradient tiling mode
    // );
    // beachPaint.setShader(beachGradient);
    const renderLayers = [];
    for (let i = sea.mainLayerIndex + 1; i < sea.layers.length; i++) {
      const layer: Sea = layers[i];
      renderLayers.push(
        <SeaView
          key={i.toString()}
          entity={layer}
          screen={props.screen}
          layout={props.layout}
        />
      );
    }
    // renderLayers.push(
    //   <Group>
    //     <Path
    //       key={"beach"}
    //       path={beachPath}
    //       style={"fill"}
    //       paint={beachPaint}
    //     ></Path>
    //   </Group>
    // );
    return renderLayers;
  }, []);

  return (
    <Group key={"seaGroup"}>
      <Rect
        key={"seaBackground"}
        x={0}
        y={windowHeight - sea.height + 7.5}
        width={windowWidth}
        height={windowHeight}
        style={"fill"}
      >
        <LinearGradient
          colors={WATER_GRADIENT_COLORS.map((col) => col[0]).reverse()}
          start={{ x: 0, y: windowHeight * 0.7 + 15 }}
          end={{ x: 0, y: windowHeight }}
        />
      </Rect>
      {topLayerRenders()}
      {shipAndBoatsRender()}
      {bottomLayerRenders()}
    </Group>
  );
};
