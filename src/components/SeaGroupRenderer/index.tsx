import { Boat } from "@/Game/Entities/Boat/Boat";
import { Sea } from "@/Game/Entities/Sea/Sea";
import { Ship } from "@/Game/Entities/Ship/Ship";
import { EntityRendererProps } from "@/constants/views";
import { FC, useCallback, useMemo } from "react";
import { SeaView } from "../SeaView";
import { ENTITIES_KEYS } from "@/constants/configs";
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
  const { width: windowWidth } = useWindowDimensions();
  const sea: Sea = props.entity.entities["sea"] as Sea;
  const layers = sea.layers;
  const bottomLayerRenders = useCallback(() => {
    const renderLayers = [];
    for (let i = 0; i <= sea.mainLayerIndex; i++) {
      const layer: Sea = layers[i];
      if (i === sea.mainLayerIndex)
        renderLayers.push(
          <SeaView
            key={i.toString()}
            entity={layer}
            screen={props.screen}
            layout={props.layout}
          />
        );
      else
        renderLayers.push(
          <Rect
            key={i.toString()}
            x={layer.startingX}
            y={layer.startingY}
            width={layer.width}
            height={layer.height}
          >
            <LinearGradient
              colors={WATER_GRADIENT_COLORS[i]}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 1 }}
            />
          </Rect>
        );
    }
    return renderLayers;
  }, []);

  const shipAndBoatsRender = useCallback(() => {
    const ship: Ship = props.entity.entities["ship"] as Ship;
    const boats: Boat[] = Object.keys(props.entity.entities)
      .filter((key: string) => key.startsWith(ENTITIES_KEYS.BOAT_LABEL))
      .map((key) => props.entity.entities[key] as Boat);

    const renders = [];
    renders.push(
      <ShipView
        key={"ship"}
        entity={ship}
        screen={props.screen}
        layout={props.layout}
      />
    );
    boats.forEach((boat) =>
      renders.push(
        <BoatView
          key={boat.body?.label}
          entity={boat}
          screen={props.screen}
          layout={props.layout}
        />
      )
    );

    return renders;
  }, []);

  const topLayerRenders = useCallback(() => {
    let entity = layers[sea.layers.length - 1];
    const beachEnd =
      layers[sea.layers.length - 1].getOriginalWaterSurfaceY() - 20;
    const beachPath = Skia.Path.Make();
    beachPath.moveTo(0, entity.getOriginalWaterSurfaceY()); // Starting point on the left edge
    beachPath.lineTo(0, beachEnd); // Move down to the bottom left corner
    beachPath.lineTo(windowWidth, beachEnd); // Move right to the bottom right corner
    beachPath.lineTo(windowWidth, entity.getOriginalWaterSurfaceY()); // Move up to the top right point
    beachPath.close(); // Close the path
    const beachPaint = Skia.Paint();
    const beachGradient = Skia.Shader.MakeLinearGradient(
      vec(0, entity.getOriginalWaterSurfaceY()), // Starting point of the gradient
      vec(0, beachEnd + 15), // Ending point of the gradient
      [Skia.Color("#ffe9c9"), Skia.Color("#E3A665")], // Gradient colors from top to bottom
      null, // No color positions specified
      TileMode.Clamp // Gradient tiling mode
    );
    beachPaint.setShader(beachGradient);
    const renderLayers = [];
    for (let i = sea.mainLayerIndex + 1; i < sea.layers.length; i++) {
      const layer: Sea = layers[i];
      renderLayers.push(
        <Rect
          key={i.toString()}
          x={layer.startingX}
          y={layer.startingY}
          width={layer.width}
          height={layer.height}
        >
          <LinearGradient
            colors={WATER_GRADIENT_COLORS[i]}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 1 }}
          />
        </Rect>
      );
    }
    renderLayers.push(
      <Path path={beachPath} style={"fill"} paint={beachPaint}></Path>
    );
    return renderLayers;
  }, []);

  return (
    <Group>
      {topLayerRenders()}
      {shipAndBoatsRender()}
      {bottomLayerRenders()}
    </Group>
  );
};
