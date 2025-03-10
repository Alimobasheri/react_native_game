import { FC, PropsWithChildren } from 'react';
import { LayoutChangeEvent, View } from 'react-native';

export type SectionProps = {
  onLayout: (event: LayoutChangeEvent) => void;
  className?: string;
};

export const Section: FC<PropsWithChildren<SectionProps>> = ({
  className = '',
  onLayout,
  children,
}) => {
  return (
    <View
      onLayout={onLayout}
      className={'min-h-[calc(100vh-64px)] ' + className}
    >
      {children}
    </View>
  );
};
