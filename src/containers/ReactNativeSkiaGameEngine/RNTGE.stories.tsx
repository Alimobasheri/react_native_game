import { Meta, StoryObj } from '@storybook/react/*';
import { ReactNativeTurboGameEngine } from './RNTGE';
import { Scene } from './components-rntge/Scene/Scene';
import { Preload } from './components-rntge/Scene/Preload';
import { Content } from './components-rntge/Scene/Content';
import { Asset } from './components-rntge/Scene/Asset';
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
import { SwipeToPlay } from '../Scenes/StartingScene/components/SwipeToPlay/index-rntge';

const meta = {
  title: 'React Native Turbo Game Engine',
  component: ReactNativeTurboGameEngine,
  args: {},
} satisfies Meta<typeof ReactNativeTurboGameEngine>;

export default meta;

type Story = StoryObj<typeof meta>;

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

export const Basic: Story = {
  args: {
    componentNames: ['star', SeaLayerComponentName, SurferComponentName],
  },
  render: (args: any) => {
    const [isRelaxed, setIsRelaxed] = React.useState(false);

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', height: '100%' }}>
          <ReactNativeTurboGameEngine {...args}>
            <Scene name="Root">
              <Preload>
                <Asset
                  id="Montserrat"
                  type="font"
                  family="Montserrat"
                  resource={require('../../../assets/fonts/Montserrat-SemiBold.ttf')}
                />
                <Asset type="image" name="ship" uriOrBase64={ship} />
                <Asset type="image" name="star" uriOrBase64={star} />
                <Asset type="image" name="surfer" uriOrBase64={surfer} />
                <Asset type="shader" name="sea" source={sourceCode} />
                <Asset
                  type="animation"
                  name="surferAnimations"
                  clip={{
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
                        frameOffset: 9,
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
                  }}
                />
              </Preload>
              <Content>
                <SkyBackground />
                <StarsView />
                <SeaGroup>
                  <SurferView
                    x={windowWidth / 9}
                    y={windowHeight * 0.7}
                    relaxed={isRelaxed}
                  />
                </SeaGroup>
                <SwipeToPlay />
              </Content>
            </Scene>
          </ReactNativeTurboGameEngine>
        </View>
      </View>
    );
  },
};
