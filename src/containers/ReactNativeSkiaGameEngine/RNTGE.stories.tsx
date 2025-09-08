import { Meta, StoryObj } from '@storybook/react/*';
import { ReactNativeTurboGameEngine } from './RNTGE';
import { Dimensions, View } from 'react-native';
import { MemoizedContainer } from './components/MemoizedContainer';
import { ShipView } from '@/components/ShipView/ShipView-rntge';
import { SkyBackground } from '@/components/SkyBackground/SkyBackground-rntge';
import { StarsView } from '@/components/StarsView/StarsView-rntge/StarsView-rntge';
import { ship, star } from '../../assets/images';
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

const meta = {
  title: 'React Native Turbo Game Engine',
  component: ReactNativeTurboGameEngine,
  args: {},
} satisfies Meta<typeof ReactNativeTurboGameEngine>;

export default meta;

type Story = StoryObj<typeof meta>;

const { width: windowWidth } = Dimensions.get('window');

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
    componentNames: ['star', SeaLayerComponentName],
    images: { ship: ship, star: star },
    shaders: {
      water: WaterRippleShader,
      sea: sourceCode,
    },
  },
  render: (args: any) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', height: '100%' }}>
        <ReactNativeTurboGameEngine {...args}>
          <SkyBackground />
          <StarsView />
          {/* <ShaderStar x={windowWidth / 2} y={windowWidth / 2} /> */}
          <ShipView x={windowWidth / 2} />
          <SeaGroup />
        </ReactNativeTurboGameEngine>
      </View>
    </View>
  ),
};
