import { Meta, StoryObj } from '@storybook/react/*';
import { ReactNativeTurboGameEngine } from './RNTGE';
import { Scene } from './components-rntge/Scene/Scene';
import { Preload } from './components-rntge/Scene/Preload';
import { Content } from './components-rntge/Scene/Content';
import { Asset } from './components-rntge/Scene/Asset';
import { View, useWindowDimensions } from 'react-native';
import React, { memo } from 'react';
import { MemoizedContainer } from './components/MemoizedContainer';
import { ShipView } from '@/components/ShipView/ShipView-rntge';
import { SurferView } from '@/components/SurferView/SurferView-rntge';
import { SkyBackground } from '@/components/SkyBackground/SkyBackground-rntge';
import { StarsView } from '@/components/StarsView/StarsView-rntge/StarsView-rntge';
import { swimmerCaveBg } from '@/assets/swimmerCaveBg';
import {
  ship,
  star,
  surfer,
} from '../../assets/images';
import {
  swimmerBlockVar0,
  swimmerBlockVar1,
  swimmerBlockVar2,
  swimmerBlockVar3,
} from '@/assets/swimmerBlocks';
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
import { sourceCode as waterShaderSourceCode } from '@/Shaders/WaterShader/waterShader';
import { shaderNoiseFuncWithRandom } from '@/Shaders/common/noise';
import { ShaderStar } from '@/components/StarsView/StarsView-rntge/ShaderStar';
import { SeaGroup } from '@/components/SeaGroupRenderer/SeaGroup-rntge';
import { SeaLayerComponentName } from '@/Game/ecs-components/SeaLayer';
import { SurferComponentName } from '@/Game/ecs-components/Surfer';
import { TransitionOp } from '@/containers/ReactNativeSkiaGameEngine/types-ecs/render';
import { SwipeToPlay } from '../Scenes/StartingScene/components/SwipeToPlay/index-rntge';
import { useAddEntity } from './hooks-ecs/useAddEntity/useAddEntity';
import {
  createRenderComponent,
  ShapeTypes,
  RenderComponentData,
} from './internal/components/render';
import { createPositionComponent } from './internal/components/position';
import {
  createTapComponent,
  createPanComponent,
  createLongPressComponent,
} from './internal/components/touch';
import { FC } from 'react';
import { Swipe } from '@/components/Swipe/index-rntge';
import { GameOverScene } from '../Scenes/GameOverScene/index-rntge';
import { ObstacleComponentName } from '@/Game/ecs-components/ObstacleComponent';
import { Obstacles } from '@/components/Obstacles/Obstacles-rntge';
import { SwimmerComponentName } from '@/Game/ecs-components/Swimmer';
import { CaveBackgroundSegmentComponentName } from '@/Game/ecs-components/CaveBackgroundSegment';
import { ContainerComponentName } from '@/Game/ecs-components/Container';
import { WaterComponentName } from '@/Game/ecs-components/Water';
import { ObstaclesManagerComponentName } from '@/Game/ecs-components/ObstaclesManager';
import { TemplateContextComponentName } from '@/Game/ecs-components/TemplateContextComponent';
import { SwimmerView } from '@/components/SwimmerView/SwimmerView-rntge';
import { TapSwimmer } from '@/components/TapSwimmer/TapSwimmer-rntge';
import { ContainerView } from '@/components/ContainerView/ContainerView-rntge';
import { ObstacleView } from '@/components/ObstacleView/ObstacleView-rntge';
import { WaterView } from '@/components/WaterView/WaterView-rntge';
import { CaveBackground } from '@/components/CaveBackground/CaveBackground-rntge';
import { getWaterSurfaceRestY } from '@/Layout';

// Test components for different gesture types
const TapTestComponent: FC<{ x: number; y: number }> = ({ x, y }) => {
  const components = [
    createRenderComponent({
      shape: { type: ShapeTypes.Rectangle, width: 100, height: 100 },
      position: { x, y },
      fillColor: 'rgba(255, 0, 0, 0.5)', // Red for tap
      visible: true,
      zIndex: 10,
    }),
    createTapComponent({
      onTap: (data) => {
        'worklet';
      },
    }),
  ];

  const { entityId } = useAddEntity({ components });
  return null;
};

const PanTestComponent: FC<{ x: number; y: number }> = ({ x, y }) => {
  const components = [
    createRenderComponent({
      shape: { type: ShapeTypes.Rectangle, width: 100, height: 100 },
      position: { x, y },
      fillColor: 'rgba(0, 255, 0, 0.5)', // Green for pan
      visible: true,
      zIndex: 10,
    }),
    createPanComponent({
      onPanUpdate: (data) => {
        'worklet';

        // Move the entity to follow the pointer
        if (global._RNTGE_.ecs) {
          global._RNTGE_.ecs.updateComponent<RenderComponentData>(
            data.entityId,
            'render',
            (renderComponent) => {
              renderComponent.position = { x: data.x, y: data.y };
            }
          );
        }
      },
      onPanEnd: (data) => {
        'worklet';
      },
    }),
  ];

  const { entityId } = useAddEntity({ components });
  return null;
};

const LongPressTestComponent: FC<{ x: number; y: number }> = ({ x, y }) => {
  const components = [
    createRenderComponent({
      shape: { type: ShapeTypes.Rectangle, width: 100, height: 100 },
      position: { x, y },
      fillColor: 'rgba(0, 0, 255, 0.5)', // Blue for long press
      visible: true,
      zIndex: 10,
    }),
    createLongPressComponent({
      onLongPress: (data) => {
        'worklet';
      },
    }),
  ];

  const { entityId } = useAddEntity({ components });
  return null;
};

/** Engine demo: grouped renderLayers move as one unit when parent position changes. */
const RenderLayersGroupTestComponent: FC<{ centerX: number; centerY: number }> = ({
  centerX,
  centerY,
}) => {
  const groupWidth = 220;
  const groupHeight = 48;
  const layerWidth = 40;
  const layerHeight = 40;
  const layerCount = 5;
  const spacing = 44;
  const startX = -((layerCount - 1) * spacing) / 2;

  const renderLayers = Array.from({ length: layerCount }, (_, i) => ({
    position: { x: startX + i * spacing, y: 0 },
    shape: { type: ShapeTypes.Rectangle, width: layerWidth, height: layerHeight },
    fillColor: ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db'][i],
    visible: true,
  }));

  const components = [
    createRenderComponent({
      shape: { type: ShapeTypes.Rectangle, width: groupWidth, height: groupHeight },
      position: { x: centerX, y: centerY },
      renderLayers,
      visible: true,
      zIndex: 20,
    }),
    createPanComponent({
      onPanUpdate: (data) => {
        'worklet';
        if (global._RNTGE_.ecs) {
          global._RNTGE_.ecs.updateComponent<RenderComponentData>(
            data.entityId,
            'render',
            (renderComponent) => {
              renderComponent.position = { x: data.x, y: data.y };
            }
          );
        }
      },
    }),
  ];

  useAddEntity({ components });
  return null;
};

const meta = {
  title: 'React Native Turbo Game Engine',
  component: ReactNativeTurboGameEngine,
  args: {},
} satisfies Meta<typeof ReactNativeTurboGameEngine>;

export default meta;

type Story = StoryObj<typeof meta>;
export const Basic: Story = {
  args: {
    componentNames: [
      'star',
      SeaLayerComponentName,
      SurferComponentName,
      ObstacleComponentName,
    ],
  },
  render: (args: any) => {
    const [isRelaxed, setIsRelaxed] = React.useState(false);
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', height: '100%' }}>
          <ReactNativeTurboGameEngine {...args}>
            <Preload>
              <Asset
                id="Montserrat"
                type="font"
                family="Montserrat"
                resource={require('../../../assets/fonts/Montserrat-SemiBold.ttf')}
              />
            </Preload>
            <Content>
              <SkyBackground />
              <Scene name="game">
                <Preload>
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
                  <StarsView />
                  <SeaGroup>
                    <SurferView
                      x={windowWidth / 9}
                      y={windowHeight * 0.7}
                      relaxed={isRelaxed}
                    />
                    <Obstacles />
                    <Swipe />
                  </SeaGroup>
                  <SwipeToPlay />
                </Content>
              </Scene>
              <GameOverScene />
            </Content>
          </ReactNativeTurboGameEngine>
        </View>
      </View>
    );
  },
};

const SwimmerGameComp: FC<{}> = memo(
  (args: any) => {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const [containerEntityId, setContainerEntityId] = React.useState<
      number | null
    >(null);

    // Container setup - rectangular container extending full screen height for endless look
    const containerWidth = windowWidth * 0.8; // Use most of screen width
    const containerHeight = windowHeight; // Full screen height for endless appearance
    const containerCenterX = windowWidth / 2;
    const containerCenterY = windowHeight / 2; // Center of screen
    const containerBottom = containerCenterY + containerHeight / 2;

    const initialWaterSurfaceY = getWaterSurfaceRestY(
      containerCenterY,
      containerHeight
    );
    // Swimmer starts with roughly 1/3 of its body below the water surface
    const swimmerStartY = initialWaterSurfaceY - 10;

    // Obstacles will be generated dynamically by the ObstacleSystem

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', height: '100%' }}>
          <ReactNativeTurboGameEngine {...args}>
            <Preload>
              <Asset
                id="Montserrat"
                type="font"
                family="Montserrat"
                resource={require('../../../assets/fonts/Montserrat-SemiBold.ttf')}
              />
            </Preload>
            <Content>
              <Scene name="swimmerGame">
                <Preload>
                  <Asset type="image" name="block_var_0" uriOrBase64={swimmerBlockVar0} />
                  <Asset type="image" name="block_var_1" uriOrBase64={swimmerBlockVar1} />
                  <Asset type="image" name="block_var_2" uriOrBase64={swimmerBlockVar2} />
                  <Asset type="image" name="block_var_3" uriOrBase64={swimmerBlockVar3} />
                  <Asset type="image" name="cave_bg" uriOrBase64={swimmerCaveBg} />
                  <Asset
                    type="shader"
                    name="water"
                    source={waterShaderSourceCode}
                  />
                </Preload>
                <Content>
                  {/* Cave background - full screen image */}
                  <CaveBackground />
                  {/* Container - rectangular with boundaries */}
                  <ContainerView
                    x={containerCenterX}
                    y={containerCenterY}
                    width={containerWidth}
                    height={containerHeight}
                    initialWaterSurfaceY={initialWaterSurfaceY}
                    waterRiseSpeed={20}
                    onEntityCreated={setContainerEntityId}
                  />

                  {/* Water - rendered separately, will be updated by system */}
                  {containerEntityId !== null && (
                    <WaterView
                      containerEntityId={containerEntityId}
                      centerX={containerCenterX}
                      centerY={containerCenterY}
                      width={containerWidth}
                      height={containerHeight}
                      raisingSpeed={100}
                    />
                  )}

                  {/* Swimmer - centered in a column; TapSwimmer handles tap-to-move */}
                  <SwimmerView
                    y={swimmerStartY}
                    containerWidth={containerWidth}
                    containerHeight={containerHeight}
                    containerCenterX={containerCenterX}
                    containerCenterY={containerCenterY}
                    useColumnControl={true}
                  />

                  <TapSwimmer
                    screenWidth={windowWidth}
                    screenHeight={windowHeight}
                  />

                  {/* Dynamic Obstacles */}
                  <ObstacleView />
                </Content>
              </Scene>
            </Content>
          </ReactNativeTurboGameEngine>
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    return JSON.stringify(prevProps) === JSON.stringify(nextProps);
  }
);

export const RenderLayersGroup: Story = {
  args: {
    componentNames: [],
  },
  render: () => {
    const { width, height } = useWindowDimensions();
    return (
      <View style={{ flex: 1 }}>
        <ReactNativeTurboGameEngine componentNames={[]}>
          <Content>
            <Scene name="renderLayersDemo">
              <Content>
                <RenderLayersGroupTestComponent
                  centerX={width / 2}
                  centerY={height / 2}
                />
              </Content>
            </Scene>
          </Content>
        </ReactNativeTurboGameEngine>
      </View>
    );
  },
};

export const SwimmerGame: Story = {
  args: {
    componentNames: [
      SwimmerComponentName,
      ContainerComponentName,
      WaterComponentName,
      ObstaclesManagerComponentName,
      TemplateContextComponentName,
      CaveBackgroundSegmentComponentName,
    ],
  },
  render: (args: any) => <SwimmerGameComp {...args} />,
};
