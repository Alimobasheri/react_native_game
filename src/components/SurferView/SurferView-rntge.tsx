import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntity/useAddEntity';
import { useAddMatterBody } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddMatterBody/useAddMatterBody';
import { useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddSystem/useAddSystem';
import { createRenderComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createPositionComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/position';
import { createSpriteSheetAnimatedComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/sprite';
import { createAnimationClipComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/animationClip';
import { createAnimatorStateComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/animatorState';
import { CreateMatterBodyArgs } from '@/containers/ReactNativeSkiaGameEngine/internal/systems/physics/bodiesTypes';
import { createSurferComponent } from '@/Game/ecs-components/Surfer';
import { SurferPhysicsSystem } from '@/systems/PhysicsSystem/SurferPhysicsSystem';
import { hashString } from '@/containers/ReactNativeSkiaGameEngine/utils/hasString';
import { BlendMode } from 'react-native';
import { FC, useMemo } from 'react';

const surferSize = 128;

export const SurferView: FC<{ x: number; y: number; relaxed?: boolean }> = ({
  x,
  y,
  relaxed = false,
}) => {
  const components = useMemo(
    () => [
      createSurferComponent({ direction: 'right' }),
      createPositionComponent({ x, y }),

      // Advanced animation system with state-based frame selection
      createSpriteSheetAnimatedComponent('surfer', {
        frameWidth: 1024 / 4, // 256px per frame
        frameHeight: 1024 / 4, // 256px per frame
        framesPerRow: 4, // 4x4 grid
        totalFrames: 16,
        frameDuration: 150,
        loop: true,
        isPlaying: true,
      }),

      // // Animation clip component for state-based animation
      // createAnimationClipComponent({
      //   assetId: 'surferAnimations',
      //   clipId: 'surfing', // Start with surfing animation
      //   frameIndex: 0,
      //   elapsedTime: 0,
      //   speed: 1.0,
      //   isPlaying: true,
      // }),

      // Animator state with relaxed parameter
      // createAnimatorStateComponent({
      //   stateMachineId: 'surferAnimations',
      //   currentStateId: hashString('surfing'),
      //   parameters: { relaxed: false },
      // }),

      createRenderComponent({
        shape: { type: 'rectangle', width: surferSize, height: surferSize },
        fillColor: '#0099ff',
        visible: true,
        image: 'surfer',
      }),
    ],
    [x, y]
  );

  const { entityId } = useAddEntity({ components });

  const matterBodyArgs: CreateMatterBodyArgs = useMemo(
    () => ({
      type: 'rectangle',
      options: {
        x,
        y,
        width: surferSize, // Match render component size
        height: surferSize,
        options: {
          isStatic: false, // Allow physics simulation
          density: 0.0001, // Very light density for floating
          frictionAir: 0.01, // Some air friction
          restitution: 0.2, // Some bounce
          collisionFilter: {
            group: 0x0003, // Unique collision group for surfer
            category: 0x0004,
            mask: 0x0001 | 0x0002, // Can collide with default and ships
          },
        },
      },
    }),
    [x, y]
  );

  const { bodyId } = useAddMatterBody({ args: matterBodyArgs, entityId });

  // Register the surfer physics system
  useAddSystem({ system: SurferPhysicsSystem });

  return null;
};
