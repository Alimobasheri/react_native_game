import { FC, useEffect, useMemo, useState } from 'react';
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
  Transforms2d,
  SkPoint,
} from '@shopify/react-native-skia';
import { DIRECTION, TRAIL_FADE_DURATION } from '../../constants/configs';
import { EntityRendererProps } from '@/constants/views';
import { Boat } from '@/Game/Entities/Boat/Boat';
import {
  useEntityInstance,
  useEntityMemoizedValue,
  useEntityValue,
} from '@/containers/ReactNativeSkiaGameEngine';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';

export const BoatView: FC<{ entityId: string }> = ({ entityId }) => {
  const { entity, found } = useEntityInstance<Boat>(entityId);
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
  const x = useEntityValue<Boat, number>(entityId, 'body', {
    processor: (body: Matter.Body | undefined) => {
      if (!body) return NaN;
      return body.position.x;
    },
  }) as SharedValue<number>;

  const y = useEntityValue<Boat, number>(entityId, 'body', {
    processor: (body: Matter.Body | undefined) => {
      if (!body) return NaN;
      return body.position.y;
    },
  }) as SharedValue<number>;

  const angle = useEntityValue<Boat, number>(entityId, 'body', {
    processor: (body: Matter.Body | undefined) => {
      if (!body) return NaN;
      return body.angle;
    },
  }) as SharedValue<number>;

  const origin = useDerivedValue(() => {
    return {
      x: x.value - (size?.[0] || 0) / 2,
      y: y.value - (size?.[1] || 0) / 2,
    };
  }, []);

  const translateX = useDerivedValue<number>(() => {
    return x.value - initialX;
  }, [x]);

  const translateY = useDerivedValue<number>(() => {
    return y.value - initialY;
  }, [y]);

  const transform = useDerivedValue<Transforms2d>(() => {
    return [
      { rotate: angle.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ];
  }, [angle, translateX, translateY]);

  const imageRotateTransform = useDerivedValue<Transforms2d>(() => {
    return [{ rotate: angle.value }];
  }, [angle]);

  const imageOrigin = useDerivedValue<SkPoint>(() => {
    return { x: initialX - size[0] / 2, y: initialY - size[1] / 2 };
  }, [initialX, initialY, size[0], size[1]]);

  const posX = useMemo(() => {
    return initialX - size[0] / 2;
  }, [initialX, size[0]]);

  const posY = useMemo(() => {
    return initialY - size[1] / 2;
  }, [initialY, size[1]]);

  const imageTransform = useDerivedValue<Transforms2d>(() => {
    return [{ scaleX: -1 }];
  }, [translateX, translateY]);

  const imageDirectionTranslateX = useDerivedValue<Transforms2d>(() => {
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
