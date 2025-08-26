import { Group, Picture, SkPicture } from '@shopify/react-native-skia';
import { FC } from 'react';
import { SharedValue } from 'react-native-reanimated';

export type RenderEntitiesProps = {
  picture: SharedValue<SkPicture | null>;
};

export const RenderEntities: FC<RenderEntitiesProps> = ({ picture }) => {
  return (
    <Group>
      <Picture picture={picture} />
    </Group>
  );
};
