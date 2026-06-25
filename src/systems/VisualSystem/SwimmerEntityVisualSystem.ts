import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  RenderComponentData,
  RenderComponentName,
  RenderLayerData,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { getCharacterProfileForSwimmer } from '@/Game/characters/swimmerKinematicsController';
import { buildKinematicTelemetry } from '@/Game/characters/kinematicTelemetry';
import { MovementState } from '@/Game/characters/characterMovementStates';
import { VisualStrokePhase } from '@/Game/characters/visualStrokePhase';
import {
  createSwimmerDeformationScale,
  updateSwimmerEntityVisuals,
} from '@/Game/characters/swimmerEntityVisuals';
import type { SecondaryItemLayerSink } from '@/Game/characters/secondaryItemTypes';
import {
  getAccessoryMeshSize,
  getAccessoryRestOffsetY,
  getSwimmerSkin,
} from '@/Game/characters/swimmerSkins';
import {
  SWIMMER_ACCESSORY_LAYER_INDEX,
  SwimmerComponentData,
  SwimmerComponentName,
} from '@/Game/ecs-components/Swimmer';

const createAccessoryLayerSink = (
  accessoryLayer: RenderLayerData,
  restOffsetX: number,
  restOffsetY: number
): SecondaryItemLayerSink => {
  'worklet';
  return {
    setLocalTransform: (offsetX, offsetY, angleRad) => {
      accessoryLayer.position = {
        x: restOffsetX + offsetX,
        y: restOffsetY + offsetY,
      };
      accessoryLayer.angle = angleRad;
    },
    setOpacity: (opacity) => {
      accessoryLayer.opacity = opacity;
    },
  };
};

/**
 * Visual pass mediator: deformation + accessories from read-only locomotion telemetry.
 * Physics remains in SwimmerPhysicsSystem — no second kinematics tick here.
 */
export const SwimmerEntityVisualSystem: System = {
  name: 'SwimmerEntityVisualSystem',
  requiredComponents: [SwimmerComponentName, RenderComponentName],
  process: ({ entities, components, deltaTime }) => {
    'worklet';

    const deltaSeconds = deltaTime / 1000;
    const swimmerStore = components[SwimmerComponentName];
    const renderStore = components[RenderComponentName];

    if (!swimmerStore || !renderStore) {
      return;
    }

    for (let i = 0; i < entities.length; i++) {
      const entityId = entities[i];
      const swimmer = swimmerStore.get(entityId) as
        | SwimmerComponentData
        | undefined;
      const render = renderStore.get(entityId) as RenderComponentData | undefined;

      if (!swimmer || !render) {
        continue;
      }

      if (render.shape.type !== ShapeTypes.Rectangle) {
        continue;
      }

      const layers = render.renderLayers;
      if (!layers || layers.length <= SWIMMER_ACCESSORY_LAYER_INDEX) {
        continue;
      }

      const locomotion = swimmer.locomotion;
      const skin = getSwimmerSkin(swimmer.skinId);
      const profile = getCharacterProfileForSwimmer(locomotion.profileId);
      const telemetry = buildKinematicTelemetry(locomotion, swimmer.velocityX);
      const previousState =
        locomotion.previousMovementState ?? MovementState.IDLE;

      let pivotImpactSpeed: number | null = null;
      if (
        previousState !== MovementState.PIVOT_BRAKE &&
        telemetry.state === MovementState.PIVOT_BRAKE
      ) {
        pivotImpactSpeed = Math.abs(telemetry.velocityX);
      }

      const baseWidth = swimmer.meshBaseWidth ?? render.shape.width;
      const baseHeight = swimmer.meshBaseHeight ?? render.shape.height;
      const meshScaleY = locomotion.meshScaleY ?? 1;
      const accessoryLayer = layers[SWIMMER_ACCESSORY_LAYER_INDEX];
      const restOffsetY = getAccessoryRestOffsetY(skin, baseHeight, meshScaleY);
      const deformation = createSwimmerDeformationScale(
        locomotion.meshScaleX ?? 1,
        meshScaleY
      );

      const visualResult = updateSwimmerEntityVisuals(
        profile,
        deformation,
        locomotion.accessoryState,
        createAccessoryLayerSink(accessoryLayer, 0, restOffsetY),
        deltaSeconds,
        telemetry,
        swimmer.bobbingPhase ?? 0,
        pivotImpactSpeed,
        locomotion.visualPhase ?? VisualStrokePhase.IDLE,
        swimmer.isPinnedFromAbove === true && swimmer.isSideBlocked !== true
      );

      const nextWidth = baseWidth * visualResult.scaleX;
      const nextHeight = baseHeight * visualResult.scaleY;
      const accessoryBaseSize = getAccessoryMeshSize(skin, baseWidth, baseHeight);
      const nextAccessoryWidth = accessoryBaseSize.width * visualResult.scaleX;
      const nextAccessoryHeight = accessoryBaseSize.height * visualResult.scaleY;

      let renderDirty = false;

      if (Math.abs(render.shape.width - nextWidth) > 0.01) {
        render.shape.width = nextWidth;
        renderDirty = true;
      }
      if (Math.abs(render.shape.height - nextHeight) > 0.01) {
        render.shape.height = nextHeight;
        renderDirty = true;
      }

      const baseLayer = layers[0];
      if (baseLayer.shape.type === ShapeTypes.Rectangle) {
        if (Math.abs(baseLayer.shape.width - nextWidth) > 0.01) {
          baseLayer.shape.width = nextWidth;
          renderDirty = true;
        }
        if (Math.abs(baseLayer.shape.height - nextHeight) > 0.01) {
          baseLayer.shape.height = nextHeight;
          renderDirty = true;
        }
      }

      if (accessoryLayer.shape.type === ShapeTypes.Rectangle) {
        if (Math.abs(accessoryLayer.shape.width - nextAccessoryWidth) > 0.01) {
          accessoryLayer.shape.width = nextAccessoryWidth;
          renderDirty = true;
        }
        if (Math.abs(accessoryLayer.shape.height - nextAccessoryHeight) > 0.01) {
          accessoryLayer.shape.height = nextAccessoryHeight;
          renderDirty = true;
        }
      }

      if (renderDirty) {
        render.isDirty = true;
      }

      locomotion.meshScaleX = visualResult.scaleX;
      locomotion.meshScaleY = visualResult.scaleY;
      locomotion.accessoryState = visualResult.accessoryState;
      locomotion.previousMovementState = telemetry.state;
    }
  },
};
