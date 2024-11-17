import { FC, PropsWithChildren } from 'react';
import { SceneContext } from '../context';
import { useSceneProvider } from './useSceneProvider';
import { Camera } from '@/containers/ReactNativeSkiaGameEngine/types';
import { SharedValue } from 'react-native-reanimated';
import { ISceneTransitionState } from '../types/transitions';

export interface ISceneProviderProps {
  camera?: Camera;
  sceneTransitionState?: SharedValue<ISceneTransitionState>;
}

/**
 * The `SceneProvider` component wraps scenes and provides the scene context
 * to handle active scene management (enabling, disabling, transitioning scenes).
 *
 * @component
 * @example
 * <SceneProvider>
 *   <Scene defaultSceneName="gameScene" isActive={true}>
 *     <Text>Game Scene</Text>
 *   </Scene>
 * </SceneProvider>
 *
 * @param {React.ReactNode} children - The scene components to be rendered within the provider.
 * @returns {JSX.Element} Returns the wrapped scene with context.
 */
export const SceneProvider: FC<PropsWithChildren<ISceneProviderProps>> = ({
  camera,
  sceneTransitionState,
  children,
}) => {
  const value = useSceneProvider({ camera, sceneTransitionState });
  return (
    <SceneContext.Provider value={value}>{children}</SceneContext.Provider>
  );
};
