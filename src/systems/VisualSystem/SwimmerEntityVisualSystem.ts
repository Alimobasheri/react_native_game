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
  getFeatureMeshSize,
  getFeatureRestOffsetY,
  getPinnedCrestRestOffsetY,
  getSwimmerAccessoryLayerIndex,
  getSwimmerFeatureLayerIndex,
  getSwimmerSkin,
} from '@/Game/characters/swimmerSkins';
import {
  SwimmerComponentData,
  SwimmerComponentName,
} from '@/Game/ecs-components/Swimmer';

/** Extra Y squash on crest when pinned — keeps tuft inside ceiling gap. */
const PINNED_CREST_EXTRA_SCALE_Y = 0.72;

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

const scaleLayerRect = (
  layer: RenderLayerData,
  scaleX: number,
  scaleY: number,
  baseWidth: number,
  baseHeight: number
): boolean => {
  'worklet';
  if (layer.shape.type !== ShapeTypes.Rectangle) {
    return false;
  }

  const nextWidth = baseWidth * scaleX;
  const nextHeight = baseHeight * scaleY;
  let dirty = false;

  if (Math.abs(layer.shape.width - nextWidth) > 0.01) {
    layer.shape.width = nextWidth;
    dirty = true;
  }
  if (Math.abs(layer.shape.height - nextHeight) > 0.01) {
    layer.shape.height = nextHeight;
    dirty = true;
  }

  return dirty;
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
      if (!layers || layers.length < 2) {
        continue;
      }

      const locomotion = swimmer.locomotion;
      const skin = getSwimmerSkin(swimmer.skinId);
      const accessoryLayerIndex = getSwimmerAccessoryLayerIndex(skin);
      if (layers.length <= accessoryLayerIndex) {
        continue;
      }

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
      const isPinned =
        swimmer.isPinnedFromAbove === true && swimmer.isSideBlocked !== true;

      const accessoryLayer = layers[accessoryLayerIndex];
      const featureLayerIndex = getSwimmerFeatureLayerIndex(skin);
      const featureLayer =
        featureLayerIndex !== null ? layers[featureLayerIndex] : null;

      const accessoryBaseSize = getAccessoryMeshSize(skin, baseWidth, baseHeight);

      const deformation = createSwimmerDeformationScale(
        locomotion.meshScaleX ?? 1,
        meshScaleY
      );

      const normalRestOffsetY = getAccessoryRestOffsetY(skin, baseHeight, meshScaleY);

      const visualResult = updateSwimmerEntityVisuals(
        profile,
        deformation,
        locomotion.accessoryState,
        createAccessoryLayerSink(accessoryLayer, 0, normalRestOffsetY),
        deltaSeconds,
        telemetry,
        swimmer.bobbingPhase ?? 0,
        pivotImpactSpeed,
        locomotion.visualPhase ?? VisualStrokePhase.IDLE,
        isPinned,
        {
          crestMode: skin.crestAccessory === true,
          crestLayerHeight: accessoryBaseSize.height * meshScaleY,
        }
      );

      const nextWidth = baseWidth * visualResult.scaleX;
      const nextHeight = baseHeight * visualResult.scaleY;
      const nextAccessoryWidth = accessoryBaseSize.width * visualResult.scaleX;
      const nextAccessoryHeight = isPinned
        ? accessoryBaseSize.height *
          visualResult.scaleY *
          PINNED_CREST_EXTRA_SCALE_Y
        : accessoryBaseSize.height * visualResult.scaleY;

      if (isPinned) {
        const pinnedRestY = getPinnedCrestRestOffsetY(
          baseHeight,
          visualResult.scaleY,
          nextAccessoryHeight
        );
        const springOffsetX = accessoryLayer.position?.x ?? 0;
        const springOffsetY =
          (accessoryLayer.position?.y ?? pinnedRestY) - normalRestOffsetY;
        accessoryLayer.position = {
          x: springOffsetX,
          y: pinnedRestY + springOffsetY,
        };
      }

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
      if (
        scaleLayerRect(
          baseLayer,
          visualResult.scaleX,
          visualResult.scaleY,
          baseWidth,
          baseHeight
        )
      ) {
        renderDirty = true;
      }

      if (featureLayer && skin.feature) {
        const featureBaseSize = getFeatureMeshSize(skin.feature, baseWidth);
        if (
          scaleLayerRect(
            featureLayer,
            visualResult.scaleX,
            visualResult.scaleY,
            featureBaseSize.width,
            featureBaseSize.height
          )
        ) {
          renderDirty = true;
        }
        const featureRestY = getFeatureRestOffsetY(
          skin.feature,
          baseHeight,
          visualResult.scaleY
        );
        if (
          !featureLayer.position ||
          Math.abs(featureLayer.position.y - featureRestY) > 0.01
        ) {
          featureLayer.position = { x: 0, y: featureRestY };
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
