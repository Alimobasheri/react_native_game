import React, { FC, PropsWithChildren } from 'react';
import { useSceneContext } from './hooks/useSceneContext';
import { useSceneTransition } from './hooks/useSceneTransition';
import { SceneProvider } from './provider';
import { Group, Paint, rect, SkRect } from '@shopify/react-native-skia';
import {
  ICreateCameraOptions,
  useCreateCamera,
} from '../../hooks/useCreateCamera';
import { useDerivedValue } from 'react-native-reanimated';
import { SceneTransition } from './types/transitions';

export interface ISceneProps extends PropsWithChildren {
  defaultSceneName: string;
  enter?: SceneTransition;
  exit?: SceneTransition;
  transitionConfig?: {
    duration?: number;
    enterDuration?: number;
    exitDuration?: number;
  };
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rootComponent?: React.ComponentType<any>;
  rootComponentProps?: Record<string, any>;
  isActive?: boolean;
  defaultCameraProps?: ICreateCameraOptions;
}

/**
 * `Scene` component handles individual game scenes within the game engine.
 * It supports custom transitions (fade, slide, zoom) when entering or exiting scenes.
 * Scenes can be nested inside one another, and the visibility of each scene is controlled
 * by the `isActive` prop and the scene context. Nested scenes will be rendered only if both
 * the parent and the nested scenes are active.
 *
 * @component
 * @example
 * // A basic scene with a fade transition
 * <Scene
 *   defaultSceneName="gameOver"
 *   enter={createFadeTransition()}
 *   exit={createFadeTransition()}
 *   isActive={true}
 *   transitionConfig={{ duration: 300 }}
 * >
 *   <Text>Game Over</Text>
 * </Scene>
 *
 * @example
 * // Nesting scenes where both parent and child scenes are active
 * <Scene
 *   defaultSceneName="parentScene"
 *   enter={createSlideTransition()}
 *   exit={createFadeTransition()}
 *   isActive={true}
 * >
 *   <Scene
 *     defaultSceneName="childScene"
 *     enter={createZoomTransition()}
 *     exit={createSlideTransition()}
 *     isActive={true}
 *   >
 *     <Text>Child Scene Content</Text>
 *   </Scene>
 *   <Text>Parent Scene Content</Text>
 * </Scene>
 *
 * @param {Object} props - The properties object.
 * @param {string} props.defaultSceneName - The name of the scene (used for identification).
 * @param {SceneTransition|null} [props.enter=null] - The animation to use when the scene enters.
 * @param {SceneTransition|null} [props.exit=null] - The animation to use when the scene exits.
 * @param {Object} [props.transitionConfig={ duration: 500 }] - Transition configuration for enter/exit animations.
 * @param {number} [props.transitionConfig.duration=500] - Duration for both enter and exit transitions.
 * @param {number} [props.transitionConfig.enterDuration] - Specific duration for the enter transition (overrides `duration`).
 * @param {number} [props.transitionConfig.exitDuration] - Specific duration for the exit transition (overrides `duration`).
 * @param {number} [props.x=0] - X-coordinate for scene positioning.
 * @param {number} [props.y=0] - Y-coordinate for scene positioning.
 * @param {number} [props.width=300] - Width of the scene.
 * @param {number} [props.height=300] - Height of the scene.
 * @param {React.ComponentType} [props.rootComponent=Group] - Component to be used as the root of the scene (default is Group).
 * @param {Object} [props.rootComponentProps={}] - Props to pass to the root component.
 * @param {boolean} [props.isActive=false] - Whether the scene is active (i.e., visible). If `false`, the scene and its children will not be rendered.
 *
 * @returns {JSX.Element|null} - Returns the JSX for the scene if active, otherwise returns null.
 *
 * @see {@link useSceneContext} for handling scene activity.
 * @see {@link useSceneTransition} for handling scene transitions.
 */
export const Scene: FC<ISceneProps> = ({
  defaultSceneName,
  children,
  enter = null,
  exit = null,
  transitionConfig = { duration: 500 },
  x = 0,
  y = 0,
  width = 300,
  height = 300,
  rootComponent: RootComponent = Group,
  rootComponentProps = {},
  isActive = false,
  defaultCameraProps = {},
}) => {
  const { isActive: currentIsActive } = useSceneContext(
    defaultSceneName,
    isActive
  );

  const { camera: defaultCamera, resetCamera: resetDefaultCamera } =
    useCreateCamera({
      x,
      y,
      width,
      height,
      ...defaultCameraProps,
    });

  const { isTransitioning, sceneTransitionState } = useSceneTransition({
    isActive: currentIsActive,
    camera: defaultCamera,
    enter,
    exit,
    config: transitionConfig,
  });

  const defaultCameraClip = useDerivedValue<SkRect>(() => {
    return {
      x: defaultCamera.x.value,
      y: defaultCamera.y.value,
      width: defaultCamera.width.value,
      height: defaultCamera.height.value,
    };
  }, [
    defaultCamera.x,
    defaultCamera.y,
    defaultCamera.width,
    defaultCamera.height,
  ]);

  const defaultCameraTransform = useDerivedValue(() => {
    return [
      { translateX: width / 2 },
      { translateY: height / 2 },
      { scaleX: defaultCamera.scaleX.value },
      { scaleY: defaultCamera.scaleY.value },
      { rotate: defaultCamera.rotate.value },
      { translateX: -width / 2 },
      { translateY: -height / 2 },
      { translateX: defaultCamera.translateX.value },
      { translateY: defaultCamera.translateY.value },
    ];
  }, [
    defaultCamera.translateX,
    defaultCamera.translateY,
    defaultCamera.scaleX,
    defaultCamera.scaleY,
    defaultCamera.rotate,
  ]);

  return currentIsActive || isTransitioning ? (
    <SceneProvider
      name={defaultSceneName}
      camera={defaultCamera}
      sceneTransitionState={sceneTransitionState}
    >
      <RootComponent
        clip={defaultCameraClip}
        transform={defaultCameraTransform}
        opacity={defaultCamera.opacity}
        {...rootComponentProps}
      >
        {children}
      </RootComponent>
    </SceneProvider>
  ) : null;
};
