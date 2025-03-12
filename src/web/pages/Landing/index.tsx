import {
  View,
  StyleSheet,
  Text,
  Pressable,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FC, PropsWithChildren, useCallback, useEffect, useMemo } from 'react';
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
  withTiming,
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
import { Inputs, inputsCode } from '@/web/components/landing/features/inputs';
import { Future } from '@/web/components/landing/features/future';

export const Landing: FC = () => {
  const sections = useSharedValue([0, 0, 0, 0, 0, 0, 0]);
  const animatedScrollRef = useAnimatedRef<AnimatedScrollView>();
  const scrollOffset = useScrollViewOffset(animatedScrollRef);

  const introductionMouseX = useSharedValue(0);
  const introductionMouseY = useSharedValue(0);

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

  const introductionOnPointerMove: (event: MouseEvent) => void = useCallback(
    (event) => {
      'worklet';
      introductionMouseX.value = event.pageX;
      introductionMouseY.value = event.pageY;
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('mouseenter', introductionOnPointerMove);
    window.addEventListener('mousemove', introductionOnPointerMove);

    return () => {
      if (typeof window === 'undefined') return;
      window.removeEventListener('mouseenter', introductionOnPointerMove);
      window.removeEventListener('mousemove', introductionOnPointerMove);
    };
  }, []);
  return (
    <View style={[styles.container]}>
      <Animated.ScrollView
        onLayout={onLayout}
        ref={animatedScrollRef}
        contentContainerClassName={'w-full relative'}
      >
        <Section onLayout={createOnSectionLayout(0)} className="bg-wave">
          <FeatureView
            index={0}
            align={Align.Top}
            sections={sections}
            scrollOffset={scrollOffset}
            bgColor="#6EC5E9"
          >
            <Introduction
              mouseX={introductionMouseX}
              mouseY={introductionMouseY}
            />
          </FeatureView>
          <View className="w-full flex-row justify-center items-center">
            <MontserratText
              weight="300"
              className="text-xl mb-10 text-white drop-shadow-md"
            >
              Scroll to Learn More
            </MontserratText>
          </View>
        </Section>
        <Section onLayout={createOnSectionLayout(1)}>
          <FeatureView
            index={1}
            align={Align.Left}
            sections={sections}
            scrollOffset={scrollOffset}
            bgColor="#9ACBD0ff"
            extra={
              <>
                <PhoneMockup>
                  <LoadGame />
                </PhoneMockup>
                <View className="w-full items-start mt-20">
                  <MontserratText
                    weight="300"
                    className="text-lg text-gray-800 mb-4"
                  >
                    How to Play:
                  </MontserratText>
                  <MontserratText
                    weight="300"
                    className="text-lg text-gray-600"
                  >
                    1. Swipe up to start.
                  </MontserratText>
                  <MontserratText
                    weight="300"
                    className="text-lg text-gray-600"
                  >
                    2. When an enemy boat is attacking, swipe up to crash them
                    with waves!
                  </MontserratText>
                  <MontserratText
                    weight="300"
                    className="text-lg text-gray-600"
                  >
                    3. Try Again!
                  </MontserratText>
                </View>
              </>
            }
            wrapperClassName="justify-end py-20"
          >
            <MontserratText
              weight="500"
              className="text-5xl text-black drop-shadow-xl"
            >
              Play in your browser!
            </MontserratText>
            <View className="flex flex-col gap-4">
              <MontserratText weight="400" className="text-xl">
                Waves Crash is an in-progress game that is developed using
                React-Native and JavaScript libraries. It uses latest
                React-Native libraries and is optimized for both web and mobile.
              </MontserratText>
              <MontserratText weight="400" className="text-xl">
                You can play the game right here on the web. This is the same
                result the code produces for mobile platforms!
              </MontserratText>
              <MontserratText weight="300" className="text-lg">
                The web version can take a few moments to load. As it needs to
                download `CanvasKit.wasm` from CDN, which is used for rendering
                by Skia.
              </MontserratText>
            </View>
          </FeatureView>
        </Section>
        <Section onLayout={createOnSectionLayout(2)}>
          <View className="w-full flex-col justify-center items-center -mt-10">
            <View className="flex flex-col justify-center items-center p-10 bg-white shadow-xl gap-8  max-w-4xl">
              <View>
                <MontserratText
                  weight="700"
                  className="text-5xl font-black font-montserrat-bold text-black"
                >
                  But How's it Made?
                </MontserratText>
              </View>
            </View>
          </View>
          <FeatureView
            index={2}
            align={Align.Right}
            sections={sections}
            scrollOffset={scrollOffset}
            extra={<CodeBlock code={engineCode} />}
            bgColor="#C8E6C9"
          >
            <Engine />
          </FeatureView>
        </Section>
        <Section onLayout={createOnSectionLayout(3)}>
          <FeatureView
            index={3}
            align={Align.Left}
            sections={sections}
            scrollOffset={scrollOffset}
            extra={<CodeBlock code={skiaCode} />}
            bgColor="#FFF9C4"
          >
            <Skia />
          </FeatureView>
        </Section>
        <Section onLayout={createOnSectionLayout(4)}>
          <FeatureView
            index={4}
            align={Align.Right}
            sections={sections}
            scrollOffset={scrollOffset}
            extra={<CodeBlock code={animationsCode} />}
            bgColor="#FFE0B2"
          >
            <Animations />
          </FeatureView>
        </Section>
        <Section onLayout={createOnSectionLayout(5)}>
          <FeatureView
            index={5}
            align={Align.Left}
            sections={sections}
            scrollOffset={scrollOffset}
            extra={<CodeBlock code={inputsCode} />}
            bgColor="#E1BEE7"
          >
            <Inputs />
          </FeatureView>
        </Section>
        <Section onLayout={createOnSectionLayout(6)}>
          <FeatureView
            index={6}
            align={Align.Left}
            sections={sections}
            scrollOffset={scrollOffset}
            bgColor="white"
            wrapperClassName="justify-center items-center max-w-xl"
            extra={
              <View className="flex flex-col gap-4">
                <MontserratText weight="400" className="text-gray-700 text-lg">
                  The new version shifts my whole OOP approach into the
                  funcitonal realm. Systems should entirely be worklets,
                  everything should entirely be connected through events, and
                  all shared values should be referenced only once.
                </MontserratText>
                <MontserratText weight="400" className="text-gray-700 text-lg">
                  It has taken me more than 9 months to research, learn,
                  improve, and structure this whole system. It's still going to
                  need a bit more. That's why I need to find remote jobs with
                  better payments, that will let me have more time, and a free
                  mindset to develop it.
                </MontserratText>
              </View>
            }
          >
            <Future />
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
