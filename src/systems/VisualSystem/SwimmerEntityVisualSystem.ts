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
  getCrestRestPosition,
  getFeatureMeshSize,
  getFeatureRestOffsetY,
  getPinnedCrestRestOffsetY,
  getPinnedCrestRestPosition,
  getSwimmerAccessoryLayerIndex,
  getSwimmerFeatureLayerIndex,
  getSwimmerInternalLayerIndex,
  getSwimmerSkin,
  skinUsesCrestAnchorLayout,
} from '@/Game/characters/swimmerSkins';
import { updateFeatureBlink } from '@/Game/characters/swimmerFeatureBlink';
import {
  getInternalRippleBandSize,
  updateInternalRipple,
} from '@/Game/characters/swimmerInternalRipple';
import {
  getInternalKelpSwayBandSize,
  updateInternalKelpSway,
} from '@/Game/characters/swimmerInternalKelpSway';
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
    setLocalTransform: (offsetX, offsetY, angleRad, skewX = 0) => {
      accessoryLayer.position = {
        x: restOffsetX + offsetX,
        y: restOffsetY + offsetY,
      };
      accessoryLayer.angle = angleRad;
      accessoryLayer.skewX = skewX;
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
      const internalLayerIndex = getSwimmerInternalLayerIndex(skin);
      const internalLayer =
        internalLayerIndex !== null ? layers[internalLayerIndex] : null;
      const featureLayerIndex = getSwimmerFeatureLayerIndex(skin);
      const featureLayer =
        featureLayerIndex !== null ? layers[featureLayerIndex] : null;

      const accessoryBaseSize = getAccessoryMeshSize(skin, baseWidth, baseHeight);

      const deformation = createSwimmerDeformationScale(
        locomotion.meshScaleX ?? 1,
        meshScaleY
      );

      const normalRest = skinUsesCrestAnchorLayout(skin)
        ? getCrestRestPosition(
            skin,
            baseWidth,
            baseHeight,
            accessoryBaseSize.width,
            accessoryBaseSize.height,
            1,
            meshScaleY
          )
        : {
            x: 0,
            y: getAccessoryRestOffsetY(skin, baseHeight, meshScaleY),
          };

      const visualResult = updateSwimmerEntityVisuals(
        profile,
        deformation,
        locomotion.accessoryState,
        createAccessoryLayerSink(
          accessoryLayer,
          normalRest.x,
          normalRest.y
        ),
        deltaSeconds,
        telemetry,
        swimmer.bobbingPhase ?? 0,
        pivotImpactSpeed,
        locomotion.visualPhase ?? VisualStrokePhase.IDLE,
        isPinned,
        {
          crestMode: skin.crestAccessory === true,
          crestAccessoryStyle: skin.crestAccessoryStyle ?? 'upright',
          crestLayerWidth: accessoryBaseSize.width * (locomotion.meshScaleX ?? 1),
          crestLayerHeight: accessoryBaseSize.height * meshScaleY,
          crestAnchorXRatio: skin.accessoryAnchorXRatio,
          crestAnchorYRatio: skin.accessoryAnchorYRatio,
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
        const pinnedRest = getPinnedCrestRestPosition(
          skin,
          baseWidth,
          baseHeight,
          visualResult.scaleY,
          nextAccessoryWidth,
          nextAccessoryHeight
        );
        const springOffsetX =
          (accessoryLayer.position?.x ?? pinnedRest.x) - normalRest.x;
        const springOffsetY =
          (accessoryLayer.position?.y ?? pinnedRest.y) - normalRest.y;
        accessoryLayer.position = {
          x: pinnedRest.x + springOffsetX,
          y: pinnedRest.y + springOffsetY,
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

      if (internalLayer && skin.internalMotion && skin.internalMotion !== 'none') {
        if (skin.internalMotion === 'kelpSway') {
          const kelp = updateInternalKelpSway(
            locomotion.internalRippleState,
            baseWidth,
            baseHeight,
            deltaSeconds
          );
          locomotion.internalRippleState = kelp.state;
          const bandSize = getInternalKelpSwayBandSize(baseWidth, baseHeight);
          if (
            scaleLayerRect(
              internalLayer,
              visualResult.scaleX,
              visualResult.scaleY,
              bandSize.width,
              bandSize.height
            )
          ) {
            renderDirty = true;
          }
          const nextPosX = kelp.offsetX;
          const nextPosY = kelp.offsetY;
          if (
            !internalLayer.position ||
            Math.abs(internalLayer.position.x - nextPosX) > 0.01 ||
            Math.abs(internalLayer.position.y - nextPosY) > 0.01
          ) {
            internalLayer.position = { x: nextPosX, y: nextPosY };
            renderDirty = true;
          }
          if (
            internalLayer.opacity == null ||
            Math.abs(internalLayer.opacity - kelp.opacity) > 0.01
          ) {
            internalLayer.opacity = kelp.opacity;
            renderDirty = true;
          }
        } else {
          const ripple = updateInternalRipple(
            locomotion.internalRippleState,
            baseHeight,
            deltaSeconds
          );
          locomotion.internalRippleState = ripple.state;
          const bandSize = getInternalRippleBandSize(baseWidth, baseHeight);
          if (
            scaleLayerRect(
              internalLayer,
              visualResult.scaleX,
              visualResult.scaleY,
              bandSize.width,
              bandSize.height
            )
          ) {
            renderDirty = true;
          }
          if (
            !internalLayer.position ||
            Math.abs(internalLayer.position.y - ripple.offsetY) > 0.01
          ) {
            internalLayer.position = { x: 0, y: ripple.offsetY };
            renderDirty = true;
          }
          if (
            internalLayer.opacity == null ||
            Math.abs(internalLayer.opacity - ripple.opacity) > 0.01
          ) {
            internalLayer.opacity = ripple.opacity;
            renderDirty = true;
          }
        }
      }

      if (featureLayer && skin.feature) {
        const featureBaseSize = getFeatureMeshSize(skin.feature, baseWidth);
        let featureScaleY = visualResult.scaleY;
        let featureOpacity = featureLayer.opacity ?? 1;

        if (skin.blinkType === 'tinyDotBlink' || skin.blinkType === 'sleepyBlink') {
          const blink = updateFeatureBlink(
            locomotion.featureBlinkState,
            entityId,
            deltaSeconds,
            skin.blinkType
          );
          locomotion.featureBlinkState = blink.state;
          featureScaleY *= blink.scaleY;
          featureOpacity = blink.opacity;
        }

        if (
          scaleLayerRect(
            featureLayer,
            visualResult.scaleX,
            featureScaleY,
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
        if (
          featureLayer.opacity == null ||
          Math.abs(featureLayer.opacity - featureOpacity) > 0.01
        ) {
          featureLayer.opacity = featureOpacity;
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

      if (
        (skin.internalMotion && skin.internalMotion !== 'none') ||
        skin.blinkType === 'tinyDotBlink' ||
        skin.blinkType === 'sleepyBlink'
      ) {
        renderDirty = true;
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
