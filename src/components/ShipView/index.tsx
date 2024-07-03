import { Ship } from "@/Game/Entities/Ship/Ship";
import { IShip } from "@/Game/Entities/Ship/types";
import { EntityRendererProps } from "@/constants/views";
import { Group, Image, useImage } from "@shopify/react-native-skia";
import { FC } from "react";

export const ShipView: FC<EntityRendererProps<Ship>> = ({ entity }) => {
  const { body, size } = entity;
  if (!body) return null;
  const { position } = body;
  const boatImage = useImage(require("../../../assets/warship.png"));
  if (!boatImage) return null;
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
      {/* <Shadow
        dx={size[0] / 4}
        dy={size[1] / 4}
        blur={10}
        color="rgba(0, 0, 0, 0.5)"
        x={position.x - size[0] / 2}
        y={position.y - size[1] / 2}
      /> */}
    </Group>
  );
};
