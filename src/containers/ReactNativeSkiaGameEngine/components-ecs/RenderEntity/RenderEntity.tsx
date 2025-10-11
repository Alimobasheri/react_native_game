import { FC, useState } from 'react';
import {
  Group,
  Skia,
  PaintStyle,
  SkPicture,
  Picture,
  SkMatrix,
} from '@shopify/react-native-skia';
import { MatterBodyComponentName } from '../../internal/components/matterBody';
import { IBodyDefinition } from 'matter-js';
import { ComponentStore } from '../../services-ecs/component';
import { Entity } from '../../services-ecs/entity';
import {
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';

export type RenderEntityProps = {
  entityId: number;
};

export const RenderEntity: FC<RenderEntityProps> = ({ entityId }) => {
  // This derived value creates the picture once and reuses it.
  // It will only re-run if the underlying drawing data for the entity changes.
  const picture = useSharedValue<SkPicture | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);

  useAnimatedReaction(
    () => picture.value !== null,
    (isInit) => {
      if (isInit && !isInitialized) {
        runOnJS(setIsInitialized)(true);
      } else if (!isInit && isInitialized) {
        runOnJS(setIsInitialized)(false);
      }
    },
    [entityId]
  );

  if (!isInitialized) return null;

  return (
    <Group>
      <Picture picture={picture as SharedValue<SkPicture>} />
    </Group>
  );
};
