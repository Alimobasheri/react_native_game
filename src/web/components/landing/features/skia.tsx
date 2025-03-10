import { View, Pressable } from 'react-native';
import { FC } from 'react';
import { MontserratText } from '@/web/components/ui/montserratText/MontserratText';
import Animated, { Easing, FadeIn, FadeInUp } from 'react-native-reanimated';
import { CodeBlock } from '../../ui/codeBlock/codeBlock';

export const skiaCode = `export const Sea = () => {
  cosnt seaEntity = useAddEntity(new Sea(seaConfig));
  
  const uniforms = useDerivedValue(() => {
    return {
      wave: {
        x: seaEntity.current.data.layers[0].waves[0].x.value,
        amplitude: seaEntity.current.data.layers[0].waves[0].amplitude.value,
        frequency: seaEntity.current.data.layers[0].waves[0].frequency.value,
        speed: seaEntity.current.data.layers[0].waves[0].speed.value,
        time: seaEntity.current.data.layers[0].waves[0].time.value,
      },
    };
  })
  const source = useMemo(() => createWaveShader()!, []);

  return (
    <Fill blendMode={'multiply'}>
      <Shader source={source} uniforms={uniforms} />
    </Fill>
  )
}
`;

export const Skia: FC = () => {
  return (
    <>
      <Animated.View
        entering={FadeInUp.easing(Easing.in(Easing.ease)).duration(500)}
        className="flex-1 flex-col items-center justify-center"
      >
        <MontserratText
          weight="700"
          className="text-5xl font-black font-montserrat-bold text-black"
        >
          Rendered By React-Native-Skia
        </MontserratText>
      </Animated.View>
      <Animated.View
        entering={FadeInUp.delay(600).duration(500)}
        className="flex flex-col items-start justify-start"
      >
        <MontserratText weight="400" className="text-2xl">
          Render Shaders, Transform Groups, and much more.
        </MontserratText>
        <MontserratText weight="400" className="text-2xl">
          All of that with no performance loss.
        </MontserratText>
      </Animated.View>
      <Animated.View
        entering={FadeInUp.delay(600).duration(500)}
        className="flex flex-col items-start justify-start"
      >
        <MontserratText weight="400" className="text-gray-500 text-lg">
          React Native Skia brings the Skia Graphics Library to React Native.
          Skia serves as the graphics engine for Google Chrome and Chrome OS,
          Android, Flutter, Mozilla Firefox, Firefox OS, and many other
          products.
        </MontserratText>
      </Animated.View>
    </>
  );
};
