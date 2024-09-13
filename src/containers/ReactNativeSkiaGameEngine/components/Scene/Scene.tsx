import React, { FC, PropsWithChildren } from 'react';
import { useSceneContext } from './hooks/useSceneContext';
import { useSceneTransition } from './hooks/useSceneTransition';
import { SceneProvider } from './provider';

export interface ISceneProps extends PropsWithChildren {
  defaultSceneName: string;
  enter?: 'fade' | 'slide' | 'zoom' | null;
  exit?: 'fade' | 'slide' | 'zoom' | null;
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
 *   enter="fade"
 *   exit="fade"
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
 *   enter="slide"
 *   exit="fade"
 *   isActive={true}
 * >
 *   <Scene
 *     defaultSceneName="childScene"
 *     enter="zoom"
 *     exit="slide"
 *     isActive={true}
 *   >
 *     <Text>Child Scene Content</Text>
 *   </Scene>
 *   <Text>Parent Scene Content</Text>
 * </Scene>
 *
 * @param {Object} props - The properties object.
 * @param {string} props.defaultSceneName - The name of the scene (used for identification).
 * @param {'fade'|'slide'|'zoom'|null} [props.enter=null] - The animation to use when the scene enters.
 * @param {'fade'|'slide'|'zoom'|null} [props.exit=null] - The animation to use when the scene exits.
 * @param {Object} [props.transitionConfig={ duration: 500 }] - Transition configuration for enter/exit animations.
 * @param {number} [props.transitionConfig.duration=500] - Duration for both enter and exit transitions.
 * @param {number} [props.transitionConfig.enterDuration] - Specific duration for the enter transition (overrides `duration`).
 * @param {number} [props.transitionConfig.exitDuration] - Specific duration for the exit transition (overrides `duration`).
 * @param {number} [props.x=0] - X-coordinate for scene positioning.
 * @param {number} [props.y=0] - Y-coordinate for scene positioning.
 * @param {number} [props.width=300] - Width of the scene.
 * @param {number} [props.height=300] - Height of the scene.
 * @param {React.ComponentType} [props.rootComponent='Rect'] - Component to be used as the root of the scene (default is Rect).
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
  rootComponent: RootComponent = 'Rect',
  rootComponentProps = {},
  isActive = false,
}) => {
  const { isActive: currentIsActive } = useSceneContext(
    defaultSceneName,
    isActive
  );

  const { props } = useSceneTransition(
    currentIsActive,
    enter,
    exit,
    transitionConfig
  );

  return currentIsActive ? (
    <SceneProvider>
      <RootComponent
        x={x}
        y={y}
        width={width}
        height={height}
        {...rootComponentProps}
        {...props}
      >
        {children}
      </RootComponent>
    </SceneProvider>
  ) : null;
};
