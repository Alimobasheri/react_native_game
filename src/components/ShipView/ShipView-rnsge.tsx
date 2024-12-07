import { Sea } from '@/Game/Entities/Sea/Sea';
import { Ship } from '@/Game/Entities/Ship/Ship';
import { IShip } from '@/Game/Entities/Ship/types';
import { ShipFactory } from '@/Game/Factories/ShipFactory/ShipFactory';
import {
  BUOYANTS_GROUP,
  ENTITIES_KEYS,
  VEHICLES_GROUP,
} from '@/constants/configs';
import { SHIP_BUILDS } from '@/constants/ships';
import { EntityRendererProps } from '@/constants/views';
import {
  Entity,
  system,
  useAddEntity,
  useCanvasDimensions,
  useEntityInstance,
  useEntityMemoizedValue,
  useEntityValue,
  useSystem,
} from '@/containers/ReactNativeSkiaGameEngine';
import { useFrameEffect } from '@/containers/ReactNativeSkiaGameEngine/hooks/useFrameEffect';
import { useReRenderCount } from '@/hooks/useReRenderCount';
import { PhysicsSystem } from '@/systems/PhysicsSystem/PhysicsSystem';
import { ShipSystem } from '@/systems/ShipSystem/ShipSystem';
import {
  Canvas,
  Group,
  Image,
  ImageProps,
  ImageShader,
  Rect,
  Skia,
  SkiaProps,
  Transforms2d,
  useImage,
} from '@shopify/react-native-skia';
import Matter from 'matter-js';
import {
  FC,
  memo,
  MutableRefObject,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { TranslateXTransform, useWindowDimensions } from 'react-native';
import {
  SharedValue,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

export interface IShipViewProps {
  seaEntityId: string;
}

const ShipImage = memo((props: SkiaProps<ImageProps>) => {
  const renderCount = useReRenderCount();
  return <Image {...props} />;
});

export const ShipView: FC<IShipViewProps> = ({ seaEntityId }) => {
  const { entity: seaEntityInstance } = useEntityInstance<Sea>(seaEntityId) as {
    entity: MutableRefObject<Entity<Sea>>;
  };

  const { entity: physicsSystemInstance, found } = useEntityInstance<
    MutableRefObject<PhysicsSystem>
  >({ label: ENTITIES_KEYS.PHYSICS_SYSTEM_INSTANCE });
  const addedBodyToWorld = useRef<boolean>(false);

  const { width: windowWidth } = useCanvasDimensions();

  const numebrOfFrames = 1;
  const numebrOfCols = 1;
  const numebrOfRows = 1;

  const shipFactoryRef = useRef<ShipFactory>(new ShipFactory({ windowWidth }));

  const initialX = useMemo(() => windowWidth / 2, [windowWidth]);
  const initialY = useMemo(
    () => seaEntityInstance.current.data.getOriginalWaterSurfaceY(),
    []
  );

  const shipData = useMemo(
    () =>
      shipFactoryRef.current.create({
        type: SHIP_BUILDS.FisherBoat,
        x: initialX,
        y: initialY,
        createdTime: global.nativePerformanceNow(),
      }),
    []
  );
  const shipEntity = useAddEntity(shipData, {
    label: ENTITIES_KEYS.SHIP,
    groups: [VEHICLES_GROUP, BUOYANTS_GROUP],
  }) as Entity<Ship>;

  const x = useEntityValue<Ship, number>(shipEntity.id, 'body', {
    processor: (body: Matter.Body | undefined) => {
      if (!body) return NaN;
      return body.position.x;
    },
  }) as SharedValue<number>;
  console.log('🚀 ~ x:', x.value);

  const y = useEntityValue<Ship, number>(shipEntity.id, 'body', {
    processor: (body: Matter.Body | undefined) => {
      if (!body) return NaN;
      return body.position.y;
    },
  }) as SharedValue<number>;
  console.log('🚀 ~ y:', y.value);

  const angle = useEntityValue<Ship, number>(shipEntity.id, 'body', {
    processor: (body: Matter.Body | undefined) => {
      if (!body) return NaN;
      return body.angle;
    },
  }) as SharedValue<number>;

  const size = useEntityValue<Ship, [number, number]>(shipEntity.id, 'size', {
    defaultValue: [0, 0],
  }) as SharedValue<[number, number]>;

  const origin = useDerivedValue(() => {
    return { x: x.value - size.value[0] / 2, y: y.value - size.value[1] / 2 };
  }, [size.value]);

  const translateX = useDerivedValue<number>(() => {
    return x.value - initialX;
  }, [x.value]);

  const translateY = useDerivedValue<number>(() => {
    return y.value - initialY;
  }, [y.value]);

  const transform = useDerivedValue<Transforms2d>(() => {
    return [
      { rotate: angle.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ];
  }, [angle.value, translateX.value, translateY.value]);

  const shipSystem = useMemo(() => new ShipSystem(), []);
  const systemCallback: system = useCallback(
    (entities, args) => {
      shipSystem.systemInstanceRNSGE(entities, args, shipEntity);
    },
    [shipSystem]
  );
  useSystem(systemCallback);

  useFrameEffect(() => {
    if (!found) return;
    if (addedBodyToWorld.current) return;
    physicsSystemInstance.current?.data.current.addBodyToWorld(
      shipEntity.data.body
    );
    addedBodyToWorld.current = true;
  }, [found]);

  const frameWidth = useDerivedValue(() => {
    return size.value[0] / numebrOfCols;
  }, [size.value]);
  const frameHeight = useDerivedValue(() => {
    return size.value[1] / numebrOfRows;
  }, [size.value]);

  // The current frame to display (can be updated based on game logic)
  const frameIndex = useSharedValue(0);

  useFrameEffect(
    () => {
      frameIndex.value = (frameIndex.value + 1) % numebrOfFrames;
    },
    [],
    90
  );

  const groupClip = useDerivedValue(() => {
    const width = size.value[0] / numebrOfCols;
    const height = size.value[1] / numebrOfRows;
    return {
      rect: {
        x: initialX - width / 2,
        y: initialY - height / 2,
        width,
        height,
      },
      rx: 0,
      ry: 0,
    };
  }, [size.value]);

  const spriteRect = useDerivedValue(() => {
    const width = size.value[0] / numebrOfCols;
    const height = size.value[1] / numebrOfRows;
    return {
      x: initialX - width / 2,
      y: initialY - height / 2,
      width: size.value[0],
      height: size.value[1],
    };
  }, [initialX, initialY, size.value]);

  const spriteTransform = useDerivedValue(() => {
    return [
      {
        translateX: -(frameIndex.value % numebrOfCols) * frameWidth.value,
      },
      {
        translateY:
          -Math.floor(frameIndex.value / numebrOfCols) * frameHeight.value,
      },
    ];
  }, [frameWidth.value, frameHeight.value, frameIndex]);

  if (!size.value) return null;

  const boatImage = useImage(require('../../../assets/fisher_boat3.png'));
  if (!boatImage) return null;

  return (
    <Group origin={origin} transform={transform}>
      {/* <ShipImage
        image={boatImage}
        x={initialX - size.value[0] / 2}
        y={initialY - size.value[1] / 2}
        width={size.value[0]}
        height={size.value[1]}
      /> */}
      <Rect
        x={initialX - size.value[0] / numebrOfCols / 2}
        y={initialY - size.value[1] / numebrOfRows / 2}
        width={size.value[0] / numebrOfCols}
        height={size.value[1] / numebrOfRows}
        color={'rgba(0, 0, 0, 1)'}
        style={'stroke'}
      />
      <Group clip={groupClip}>
        <Image
          image={boatImage}
          width={size.value[0]}
          height={size.value[1]}
          rect={spriteRect}
          transform={spriteTransform}
        />
      </Group>

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
