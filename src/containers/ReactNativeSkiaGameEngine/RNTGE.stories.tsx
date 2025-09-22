import { Meta, StoryObj } from '@storybook/react/*';
import { ReactNativeTurboGameEngine } from './RNTGE';
import { Dimensions, View, TouchableOpacity, Text } from 'react-native';
import React from 'react';
import { MemoizedContainer } from './components/MemoizedContainer';
import { ShipView } from '@/components/ShipView/ShipView-rntge';
import { SurferView } from '@/components/SurferView/SurferView-rntge';
import { SkyBackground } from '@/components/SkyBackground/SkyBackground-rntge';
import { StarsView } from '@/components/StarsView/StarsView-rntge/StarsView-rntge';
import { ship, star, surfer } from '../../assets/images';
import {
  sourceCode,
  waveShaderFoamIntensityFunc,
  waveShaderGetDecayFunc,
  waveShaderMainFunc,
  waveShaderUniforms,
  waveShaderWaterMaskFunc,
  waveShaderWaveMaskFunc,
  waveShaderYPosition,
} from '@/Shaders/WaveShader/waveShader';
import { shaderNoiseFuncWithRandom } from '@/Shaders/common/noise';
import { ShaderStar } from '@/components/StarsView/StarsView-rntge/ShaderStar';
import { SeaGroup } from '@/components/SeaGroupRenderer/SeaGroup-rntge';
import { SeaLayerComponentName } from '@/Game/ecs-components/SeaLayer';
import { SurferComponentName } from '@/Game/ecs-components/Surfer';
import { TransitionOp } from '@/containers/ReactNativeSkiaGameEngine/types-ecs/render';

const meta = {
  title: 'React Native Turbo Game Engine',
  component: ReactNativeTurboGameEngine,
  args: {},
} satisfies Meta<typeof ReactNativeTurboGameEngine>;

export default meta;

type Story = StoryObj<typeof meta>;

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

const WaterRippleShader = `
  uniform float iTime;
  uniform vec2 iResolution; // Example uniforms
  uniform vec2 iCenter;

  half4 main(vec2 fragCoord) {
    vec2 uv = (fragCoord - iCenter) / iResolution.x;
    float dist = length(uv);
    float ripple = sin(dist * 20.0 - iTime * 4.0) / (dist * 40.0 + 1.0);
    return half4(0.2 + ripple, 0.5 + ripple, 1.0, 1.0);
  }
`;

const seaShader = `
    ${waveShaderUniforms}
    ${shaderNoiseFuncWithRandom}
    ${waveShaderGetDecayFunc}
    ${waveShaderFoamIntensityFunc}
    ${waveShaderYPosition}
    ${waveShaderWaveMaskFunc}
    ${waveShaderWaterMaskFunc}
    ${waveShaderMainFunc}
  `;

export const Basic: Story = {
  args: {
    componentNames: ['star', SeaLayerComponentName, SurferComponentName],
    images: { ship, star, surfer },
    shaders: {
      water: WaterRippleShader,
      sea: sourceCode,
    },
    clipAnimations: {
      surferAnimations: {
        clips: {
          surfing: {
            name: 'surfing',
            frames: [
              { sprite: 'surfer_frame_0', duration: 150 },
              { sprite: 'surfer_frame_1', duration: 150 },
              { sprite: 'surfer_frame_2', duration: 150 },
              { sprite: 'surfer_frame_3', duration: 150 },
              { sprite: 'surfer_frame_4', duration: 150 },
              { sprite: 'surfer_frame_5', duration: 150 },
              { sprite: 'surfer_frame_6', duration: 150 },
              { sprite: 'surfer_frame_7', duration: 150 },
              { sprite: 'surfer_frame_8', duration: 150 },
            ],
            loop: true,
          },
          relaxed: {
            name: 'relaxed',
            frameOffset: 9, // Universal frame mapping - offset by 9 to get frames 9-15
            frames: [
              { sprite: 'surfer_frame_9', duration: 200 },
              { sprite: 'surfer_frame_10', duration: 200 },
              { sprite: 'surfer_frame_11', duration: 200 },
              { sprite: 'surfer_frame_12', duration: 200 },
              { sprite: 'surfer_frame_13', duration: 200 },
              { sprite: 'surfer_frame_14', duration: 200 },
              { sprite: 'surfer_frame_15', duration: 200 },
            ],
            loop: true,
          },
        },
        stateMachine: {
          initialState: 'surfing',
          parameters: { relaxed: false },
          transitions: [
            {
              from: 'surfing',
              to: 'relaxed',
              condition: {
                param: 'relaxed',
                value: true,
                op: TransitionOp.EQUAL,
              },
            },
            {
              from: 'relaxed',
              to: 'surfing',
              condition: {
                param: 'relaxed',
                value: false,
                op: TransitionOp.EQUAL,
              },
            },
          ],
        },
      },
    },
  },
  render: (args: any) => {
    const [isRelaxed, setIsRelaxed] = React.useState(false);

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', height: '100%' }}>
          <ReactNativeTurboGameEngine {...args}>
            <SkyBackground />
            <StarsView />
            <SeaGroup>
              <SurferView
                x={windowWidth / 9}
                y={windowHeight * 0.7}
                relaxed={isRelaxed}
              />
            </SeaGroup>
          </ReactNativeTurboGameEngine>

          {/* Animation control button */}
          <View
            style={{
              position: 'absolute',
              top: 50,
              left: 20,
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: 10,
              borderRadius: 5,
            }}
          >
            <TouchableOpacity
              onPress={() => setIsRelaxed(!isRelaxed)}
              style={{
                backgroundColor: isRelaxed ? '#4CAF50' : '#FF9800',
                padding: 10,
                borderRadius: 5,
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                {isRelaxed ? 'Relaxed' : 'Surfing'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  },
};
