import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntity/useAddEntity';
import {
  createWorldYSortedRenderComponent,
  RenderSortOrigin,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createPanComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/touch';
import { createSwimmerComponent } from '@/Game/ecs-components/Swimmer';
import { useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddSystem/useAddSystem';
import { SwimmerPhysicsSystem } from '@/systems/PhysicsSystem/SwimmerPhysicsSystem';
import { SwimmerRenderBootstrapSystem } from '@/systems/VisualSystem/SwimmerRenderBootstrapSystem';
import { SwimmerLifeSystem } from '@/Game/characters/life/SwimmerLifeSystem';
import { SwimmerEntityVisualSystem } from '@/systems/VisualSystem/SwimmerEntityVisualSystem';
import { SwimmerWaterContactFxSystem } from '@/systems/VisualSystem/SwimmerWaterContactFxSystem';
import { LAYOUT_CONSTANTS } from '@/Layout';
import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';
import {
  SwimmerComponentName,
  SwimmerComponentData,
} from '@/Game/ecs-components/Swimmer';
import { SwimmerRenderLayer } from '@/Game/render/swimmerRenderLayers';
import { createDefaultSwimmerLocomotion } from '@/Game/characters/swimmerLocomotionDefaults';
import {
  DEFAULT_SWIMMER_SKIN_ID,
  getSwimmerSkin,
  type SwimmerSkinId,
} from '@/Game/characters/swimmerSkins';
import type { SwimmerLifeDebugMode } from '@/Game/characters/life/swimmerLifeTypes';
import '@/Game/characters/characterProfiles';
import { FC, useMemo } from 'react';

const centerColumn = Math.floor(LAYOUT_CONSTANTS.COLUMNS / 2);

function getColumnCenterXJS(
  column: number,
  containerCenterX: number,
  containerWidth: number
): number {
  const columnWidth = containerWidth / LAYOUT_CONSTANTS.COLUMNS;
  return (
    containerCenterX -
    containerWidth / 2 +
    columnWidth * column +
    columnWidth / 2
  );
}

export const SwimmerView: FC<{
  x?: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
  containerCenterX: number;
  containerCenterY: number;
  /** Grid column index (0..COLUMNS-1). If provided, x is ignored and set to column center. */
  initialColumn?: number;
  /** When true, swimmer moves by column (tap left/right); when false, by pan velocity. */
  useColumnControl?: boolean;
  /** When true, disables dispatching any game-over events (storybook/debug use). */
  disableGameOver?: boolean;
  /** Visual skin id (defaults to goggled). */
  skinId?: SwimmerSkinId;
  /** Storybook: composite shader debug gate G0–G3. */
  lifeDebugMode?: SwimmerLifeDebugMode;
  /** Storybook: override internal motion intensity. */
  internalIntensity?: number;
}> = ({
  x: xProp,
  y,
  containerWidth,
  containerHeight,
  containerCenterX,
  containerCenterY,
  initialColumn = centerColumn,
  useColumnControl = false,
  disableGameOver = false,
  skinId = DEFAULT_SWIMMER_SKIN_ID,
  lifeDebugMode,
  internalIntensity,
}) => {
  const skin = useMemo(() => getSwimmerSkin(skinId), [skinId]);

  const x = useMemo(() => {
    if (useColumnControl || initialColumn !== undefined) {
      return getColumnCenterXJS(
        initialColumn,
        containerCenterX,
        containerWidth
      );
    }
    return xProp ?? containerCenterX;
  }, [
    useColumnControl,
    initialColumn,
    containerCenterX,
    containerWidth,
    xProp,
  ]);

  const { swimmerWidth, swimmerHeight } = useMemo(() => {
    const columnWidth = containerWidth / LAYOUT_CONSTANTS.COLUMNS;
    const width =
      columnWidth * swimmerVisualTuning.VISUAL_WIDTH_COLUMN_RATIO;

    const height =
      swimmerVisualTuning.VISUAL_HEIGHT_TO_WIDTH_RATIO * width;

    return { swimmerWidth: width, swimmerHeight: height };
  }, [containerWidth, containerHeight]);

  const components = useMemo(() => {
    const locomotion = {
      ...createDefaultSwimmerLocomotion(),
      profileId: skin.profileId,
      ...(lifeDebugMode != null ? { lifeDebugMode } : {}),
      ...(internalIntensity != null ? { internalIntensity } : {}),
    };

    const base = [
      createSwimmerComponent({
        x,
        y,
        velocityX: 0,
        locomotion,
        waterSurfaceY: y,
        containerWidth,
        containerCenterX,
        containerCenterY,
        isInInitialPhase: false,
        isCollidingWithObstacle: false,
        isPinnedFromAbove: false,
        pinnedCeilingMinX: undefined,
        pinnedCeilingMaxX: undefined,
        fallingVelocityY: 0,
        useColumnControl,
        column: initialColumn,
        angle: 0,
        gameOverDispatched: false,
        disableGameOver,
        meshBaseWidth: swimmerWidth,
        meshBaseHeight: swimmerHeight,
        skinId: skin.id,
      }),
      createWorldYSortedRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: swimmerWidth,
          height: swimmerHeight,
        },
        position: { x, y },
        visible: true,
        renderLayer: SwimmerRenderLayer.Swimmer,
        origin: RenderSortOrigin.Bottom,
      }),
    ];
    const panComponent = createPanComponent({
      onPanUpdate: (data) => {
        'worklet';
        const ecs = data.systemArgs.ecs;
        const swimmerEntities = ecs.getEntitiesWithComponents([
          SwimmerComponentName,
        ]);
        if (swimmerEntities.length === 0) return;
        const velocityX = data.gesture.data.velocityX * 0.5;
        swimmerEntities.forEach((entityId) => {
          ecs.updateComponent(
            entityId,
            SwimmerComponentName,
            (swimmer: SwimmerComponentData) => {
              swimmer.velocityX = velocityX;
            }
          );
        });
      },
      onPanEnd: (data) => {
        'worklet';
        const ecs = data.systemArgs.ecs;
        const swimmerEntities = ecs.getEntitiesWithComponents([
          SwimmerComponentName,
        ]);
        swimmerEntities.forEach((entityId) => {
          ecs.updateComponent(
            entityId,
            SwimmerComponentName,
            (swimmer: SwimmerComponentData) => {
              swimmer.velocityX = 0;
            }
          );
        });
      },
    });
    return useColumnControl ? base : [...base, panComponent];
  }, [
    x,
    y,
    containerWidth,
    containerHeight,
    containerCenterX,
    containerCenterY,
    useColumnControl,
    initialColumn,
    disableGameOver,
    swimmerWidth,
    swimmerHeight,
    skin,
    lifeDebugMode,
    internalIntensity,
  ]);

  useAddEntity({ components });

  useAddSystem({ system: SwimmerPhysicsSystem });
  useAddSystem({ system: SwimmerRenderBootstrapSystem });
  useAddSystem({ system: SwimmerLifeSystem });
  useAddSystem({ system: SwimmerEntityVisualSystem });
  useAddSystem({ system: SwimmerWaterContactFxSystem });

  return null;
};
