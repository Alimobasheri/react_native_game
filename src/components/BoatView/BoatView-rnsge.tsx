import { FC, MutableRefObject, useEffect, useMemo, useState } from 'react';
import {
  Group,
  Image,
  useImage,
  SkPoint,
  Transforms3d,
} from '@shopify/react-native-skia';
import { DIRECTION, TRAIL_FADE_DURATION } from '../../constants/configs';
import { EntityRendererProps } from '@/constants/views';
import { Boat } from '@/Game/Entities/Boat/Boat';
import {
  Entity,
  useEntityInstance,
  useEntityMemoizedValue,
} from '@/containers/ReactNativeSkiaGameEngine';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';

export const BoatView: FC<{ entityId: string }> = ({ entityId }) => {
  const { entity, found } = useEntityInstance<Boat>(entityId) as {
    entity: MutableRefObject<Entity<Boat>>;
    found: MutableRefObject<boolean>;
  };
  const [sharedBody, _] = useState(entity.current.data.sharedBody);

  const imageSource = useEntityMemoizedValue<Boat, number>(
    entityId,
    'imageSource'
  );
  const direction = useEntityMemoizedValue<Boat, DIRECTION>(
    entityId,
    'direction'
  );
  const size = useEntityMemoizedValue<Boat, number[]>(entityId, 'size', {
    defaultValue: [0, 0],
  }) as number[];
  const initialX = useMemo(
    () => (found ? entity.current?.data.body.position.x : 0),
    [found]
  );
  const initialY = useMemo(
    () => (found ? entity.current?.data.body.position.y : 0),
    [found]
  );

  const origin = useDerivedValue(() => {
    return {
      x: (sharedBody?.value.position.x || 0) - (size?.[0] || 0) / 2,
      y: (sharedBody?.value.position.y || 0) - (size?.[1] || 0) / 2,
    };
  }, [sharedBody]);

  const transform = useDerivedValue<Transforms2d>(() => {
    return [
      { rotate: sharedBody?.value.angle },
      { translateX: (sharedBody?.value.position.x || 0) - initialX },
      { translateY: (sharedBody?.value.position.y || 0) - initialY },
    ];
  }, [sharedBody]);

  const imageOrigin = useDerivedValue<SkPoint>(() => {
    return { x: initialX - size[0] / 2, y: initialY - size[1] / 2 };
  }, [initialX, initialY, size[0], size[1]]);

  const posX = useMemo(() => {
    return initialX - size[0] / 2;
  }, [initialX, size[0]]);

  const posY = useMemo(() => {
    return initialY - size[1] / 2;
  }, [initialY, size[1]]);

  const imageTransform = useDerivedValue<Transforms3d>(() => {
    return [{ scaleX: -1 }];
  }, []);

  const imageDirectionTranslateX = useDerivedValue<Transforms3d>(() => {
    return [{ translateX: -size[0] }];
  }, [size?.[0]]);

  if (!found) return;
  const boatImage = useImage(imageSource);
  if (!boatImage) return null;
  // Create a smooth path for the trail with fading effect
  if (direction === DIRECTION.LEFT) {
    return (
      <Group origin={origin} transform={transform}>
        <Image
          image={boatImage}
          x={posX}
          y={posY}
          width={size[0]}
          height={size[1]}
        />
      </Group>
    );
  }
  return (
    <Group origin={origin} transform={transform}>
      <Group origin={imageOrigin} transform={imageTransform}>
        <Image
          image={boatImage}
          x={posX}
          y={posY}
          width={size[0]}
          height={size[1]}
          origin={origin}
          transform={imageDirectionTranslateX}
        />
      </Group>
    </Group>
  );
};
