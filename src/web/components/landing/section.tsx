import { FC, PropsWithChildren } from 'react';
import { LayoutChangeEvent, PointerEvent, View } from 'react-native';
import Animated, { AnimatedRef } from 'react-native-reanimated';

export type SectionProps = {
  onLayout: (event: LayoutChangeEvent) => void;
  onPointerMove?: (event: PointerEvent) => void;
  onPointerLeave?: (event: PointerEvent) => void;
  className?: string;
};

export const Section: FC<PropsWithChildren<SectionProps>> = ({
  className = '',
  onLayout,
  onPointerMove,
  onPointerLeave,
  children,
}) => {
  return (
    <Animated.View
      onLayout={onLayout}
      className={'min-h-[calc(100vh-64px)] ' + className}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </Animated.View>
  );
};
