import React, { FC } from "react";
import { Path, Skia, Group } from "@shopify/react-native-skia";
import { EntityRendererProps } from "@/constants/views";
import { Moon } from "@/Game/Entities/BackgroundEntities/Moon/Moon";

const MoonView: FC<EntityRendererProps<Moon>> = ({
  entity: { centerX, centerY, radius, moonPaint, glowPaint },
}) => {
  return (
    <Group>
      <Path
        path={Skia.Path.Make().addCircle(centerX, centerY, radius)}
        paint={moonPaint}
      />
      <Path
        path={Skia.Path.Make().addCircle(centerX, centerY, radius)}
        paint={glowPaint}
      />
    </Group>
  );
};

export default MoonView;
