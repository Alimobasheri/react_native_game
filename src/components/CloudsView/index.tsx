import React, { FC } from "react";
import { Skia, Group, RoundedRect } from "@shopify/react-native-skia";
import { EntityRendererProps } from "@/constants/views";
import { Clouds } from "@/Game/Entities/BackgroundEntities/Clouds/Clouds";

const CloudsView: FC<EntityRendererProps<Clouds>> = ({
  entity: { clouds },
}) => {
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

export default CloudsView;
