import React, { FC } from "react";
import { Group } from "@shopify/react-native-skia";
import { MountainBackground } from "@/Game/Entities/MountainBackground/MountainBackground";
import { EntityRendererProps } from "@/constants/views";

export const MountainBackgroundView: FC<
  EntityRendererProps<MountainBackground>
> = ({ entity }) => {
  return <Group>{entity.render()}</Group>;
};
