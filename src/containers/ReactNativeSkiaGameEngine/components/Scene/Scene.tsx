import React, { FC, PropsWithChildren } from 'react';
import { useSceneContext } from './hooks/useSceneContext';
import { useSceneTransition } from './hooks/useSceneTransition';

export interface ISceneProps extends PropsWithChildren {
  defaultSceneName: string;
  enter?: 'fade' | 'slide' | 'zoom';
  exit?: 'fade' | 'slide' | 'zoom';
  transitionConfig?: { duration?: number };
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rootComponent?: React.ComponentType<any>;
  rootComponentProps?: Record<string, any>;
}

export const Scene: FC<ISceneProps> = ({
  defaultSceneName,
  children,
  enter = 'fade',
  exit = 'fade',
  transitionConfig = { duration: 500 },
  x = 0,
  y = 0,
  width = 300,
  height = 300,
  rootComponent: RootComponent = 'Rect', // Default root component is Rect
  rootComponentProps = {},
}) => {
  const { isActive } = useSceneContext({ defaultSceneName });

  // Get animated props from the transition hook
  const { props } = useSceneTransition(isActive, enter, exit, transitionConfig);

  return (
    <RootComponent
      x={x}
      y={y}
      width={width}
      height={height}
      {...rootComponentProps}
      {...props} // Spread animated props (e.g., opacity, transform)
    >
      {children}
    </RootComponent>
  );
};
