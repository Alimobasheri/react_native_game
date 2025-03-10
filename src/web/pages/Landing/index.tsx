import {
  View,
  StyleSheet,
  Text,
  Pressable,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FC, PropsWithChildren, useCallback, useMemo } from 'react';
import { MontserratText } from '@/web/components/ui/montserratText/MontserratText';
import { LoadGame } from 'Game/loadGame';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeInUp,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useScrollViewOffset,
  useSharedValue,
  ZoomInLeft,
} from 'react-native-reanimated';
import { AnimatedScrollView } from 'react-native-reanimated/lib/typescript/component/ScrollView';
import { PhoneMockup } from '@/web/components/landing/phoneMockup';
import { Section } from '@/web/components/landing/section';
import { Introduction } from '@/web/components/landing/features/introduction';
import { Engine, engineCode } from '@/web/components/landing/features/engine';
import { CodeBlock } from '@/web/components/ui/codeBlock/codeBlock';
import { Skia, skiaCode } from '@/web/components/landing/features/skia';
import { Align, FeatureView } from '@/web/components/landing/featureView';
import {
  Animations,
  animationsCode,
} from '@/web/components/landing/features/animations';

export const Landing: FC = () => {
  const { height } = useWindowDimensions();
  const sections = useSharedValue([0, 0, 0, 0]);
  const animatedScrollRef = useAnimatedRef<AnimatedScrollView>();
  const scrollOffset = useScrollViewOffset(animatedScrollRef);
  const maxHeight = useMemo(() => height * 4, [height]);
  const leftInterpolated = useDerivedValue(() => {
    return interpolate(
      scrollOffset.value,
      sections.value.map((section) => section),
      sections.value.map((_, index) => (index % 2 === 0 ? 50 : 0)),
      Extrapolation.CLAMP
    );
  });
  const onLayout = (event: LayoutChangeEvent) => {
    console.log(event.nativeEvent.layout);
  };

  const onSectionLayout = useCallback(
    (event: LayoutChangeEvent, index: number) => {
      sections.value[index] = event.nativeEvent.layout.y;
    },
    [sections]
  );

  const createOnSectionLayout = useCallback(
    (index: number) => (event: LayoutChangeEvent) =>
      onSectionLayout(event, index),
    [onSectionLayout]
  );
  return (
    <View style={[styles.container]}>
      <Animated.ScrollView
        onLayout={onLayout}
        ref={animatedScrollRef}
        contentContainerClassName={'w-full relative'}
      >
        <Section onLayout={createOnSectionLayout(0)} className="bg-[#F2EFE7ff]">
          <FeatureView
            index={0}
            align={Align.Left}
            sections={sections}
            scrollOffset={scrollOffset}
            extra={
              <PhoneMockup>
                <LoadGame />
              </PhoneMockup>
            }
          >
            <Introduction />
          </FeatureView>
          <View className="w-full flex-row justify-center items-center">
            <MontserratText weight="300" className="text-xl mb-10">
              Scroll to Learn More
            </MontserratText>
          </View>
        </Section>
        <Section onLayout={createOnSectionLayout(1)}>
          <FeatureView
            index={1}
            align={Align.Right}
            sections={sections}
            scrollOffset={scrollOffset}
            extra={<CodeBlock code={engineCode} />}
          >
            <Engine />
          </FeatureView>
        </Section>
        <Section onLayout={createOnSectionLayout(2)}>
          <FeatureView
            index={2}
            align={Align.Left}
            sections={sections}
            scrollOffset={scrollOffset}
            extra={<CodeBlock code={skiaCode} />}
          >
            <Skia />
          </FeatureView>
        </Section>
        <Section onLayout={createOnSectionLayout(3)}>
          <FeatureView
            index={3}
            align={Align.Right}
            sections={sections}
            scrollOffset={scrollOffset}
            extra={<CodeBlock code={animationsCode} />}
          >
            <Animations />
          </FeatureView>
        </Section>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
