import { FC, PropsWithChildren } from 'react';
import { SceneContext } from '../context';
import { useSceneProvider } from './useSceneProvider';

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
export const SceneProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const value = useSceneProvider();
  return (
    <SceneContext.Provider value={value}>{children}</SceneContext.Provider>
  );
};
