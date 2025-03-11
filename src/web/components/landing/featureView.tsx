import { FC, PropsWithChildren, ReactNode } from 'react';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  measure,
  SharedValue,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';

export enum Align {
  Left = 'flex-row',
  Right = 'flex-row-reverse',
  Top = 'flex-col',
  Bottom = 'flex-col-reverse',
}

export type FeatureViewProps = {
  index: number;
  align: Align;
  sections: SharedValue<number[]>;
  scrollOffset: SharedValue<number>;
  extra?: ReactNode;
  bgColor?: string;
};

export const FeatureView: FC<PropsWithChildren<FeatureViewProps>> = ({
  align,
  index,
  sections,
  scrollOffset,
  extra,
  bgColor = '#F2EFE7ff',
  children,
}) => {
  const viewRef = useAnimatedRef();
  const sectionOffset = useDerivedValue(() => {
    return sections.value[index];
  });

  const prevSectionHeight = useDerivedValue(
    () => sections.value[index] - (sections.value[index - 1] || 0)
  );

  const thisSectionHeight = useDerivedValue(
    () => (sections.value[index + 1] || 0) - sections.value[index]
  );

  const bgStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        scrollOffset.value,
        [
          sectionOffset.value - prevSectionHeight.value / 2 - 1,
          sectionOffset.value,
        ],
        ['#ffffff00', bgColor]
      ),
    };
  });

  const outerStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollOffset.value,
        [
          sectionOffset.value - prevSectionHeight.value / 2 - 1,
          sectionOffset.value,
        ],
        [0, 1],
        Extrapolation.CLAMP
      ),
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [
              sectionOffset.value - prevSectionHeight.value / 2 - 1,
              sectionOffset.value,
            ],
            [200, 0],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });
  const innerStyle = useAnimatedStyle(() => {
    return {
      gap: interpolate(
        scrollOffset.value,
        [
          sectionOffset.value + thisSectionHeight.value * 0.1,
          sectionOffset.value + thisSectionHeight.value * 0.6,
        ],
        [24, -24],
        Extrapolation.CLAMP
      ),
    };
  });
  return (
    <Animated.View ref={viewRef} className={`flex-1  items-center ${align}`}>
      <Animated.View
        className={`flex-1 p-10 flex-col ${
          [Align.Left, Align.Right].includes(align) ? 'w-[50%]' : 'w-[100%]'
        } h-full justify-center`}
        style={bgStyle}
      >
        <Animated.View
          className="flex-1 w-full h-full justify-center"
          style={outerStyle}
        >
          <Animated.View
            className={`flex-1 flex flex-col justify-center ${
              [Align.Left, Align.Right].includes(align)
                ? 'items-start'
                : 'items-center'
            }`}
            style={innerStyle}
          >
            {children}
          </Animated.View>
        </Animated.View>
      </Animated.View>
      {extra && (
        <Animated.View
          className={'flex-1 p-10 flex-col max-w-[50%] h-full justify-center'}
        >
          {extra}
        </Animated.View>
      )}
    </Animated.View>
  );
};
