import { FC, useEffect, useState } from "react";
import {
  Group,
  Rect,
  Skia,
  Image,
  useImage,
  Shadow,
  Paint,
  Circle,
  vec,
  Path,
  LinearGradient,
} from "@shopify/react-native-skia";
import { DIRECTION, TRAIL_FADE_DURATION } from "../../constants/configs";
import { EntityRendererProps } from "@/constants/views";
import { Boat } from "@/Game/Entities/Boat/Boat";

export const BoatView: FC<EntityRendererProps<Boat>> = ({
  entity: { body, size, direction, trail, imageSource },
}) => {
  if (!body) return;
  const { position } = body;
  const boatImage = useImage(imageSource);
  if (!boatImage) return null;
  // Create a smooth path for the trail with fading effect
  if (direction === DIRECTION.LEFT) {
    return (
      <Group
        origin={{ x: position.x, y: position.y }}
        transform={[{ rotate: body.angle }]}
      >
        <Image
          image={boatImage}
          x={position.x - size[0] / 2}
          y={position.y - size[1] / 2}
          width={size[0]}
          height={size[1]}
        />
      </Group>
    );
  }
  return (
    <Group
      origin={{ x: position.x, y: position.y }}
      transform={[{ rotate: body.angle }]}
    >
      <Group
        origin={{ x: position.x - size[0] / 2, y: position.y - size[1] / 2 }}
      >
        <Image
          image={boatImage}
          x={position.x - size[0] / 2}
          y={position.y - size[1] / 2}
          width={size[0]}
          height={size[1]}
          origin={{ x: position.x, y: position.y }}
          transform={[
            { translateX: direction === DIRECTION.RIGHT ? -size[0] : -size[0] },
          ]}
        />
      </Group>
    </Group>
  );
};
