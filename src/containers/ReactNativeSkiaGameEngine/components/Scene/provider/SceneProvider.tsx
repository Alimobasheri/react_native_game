import { FC, PropsWithChildren } from 'react';
import { SceneContext } from '../context';
import { useSceneProvider } from './useSceneProvider';
import { Camera } from '@/containers/ReactNativeSkiaGameEngine/types';
import { SharedValue } from 'react-native-reanimated';
import { ISceneTransitionState } from '../types/transitions';
import { MemoizedContainer } from '../../MemoizedContainer';

export interface ISceneProviderProps {
  name: string;
  camera?: Camera;
  sceneTransitionState?: SharedValue<ISceneTransitionState>;
  currentIsActive?: boolean;
  currentIsTransitioning?: boolean;
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
  name,
  camera,
  sceneTransitionState,
  currentIsActive,
  currentIsTransitioning,
  children,
}) => {
  const value = useSceneProvider({
    name,
    camera,
    sceneTransitionState,
    currentIsActive,
    currentIsTransitioning,
  });
  return (
    <SceneContext.Provider value={value}>
      <MemoizedContainer>{children}</MemoizedContainer>
    </SceneContext.Provider>
  );
};
