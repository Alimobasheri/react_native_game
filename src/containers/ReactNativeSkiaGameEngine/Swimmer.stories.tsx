import { FC, memo, useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { ReactNativeTurboGameEngine } from './RNTGE';
import { Preload } from './components-rntge/Scene/Preload';
import { Asset } from './components-rntge/Scene/Asset';
import { SkyBackground } from '@/components/SkyBackground/SkyBackground-rntge';
import { Scene } from './components-rntge/Scene/Scene';
import { block } from '@/assets/images';
import { block2 } from '@/assets/images';
import { block3 } from '@/assets/images';
import { caveBg } from '@/assets/images';
import { sourceCode as waterShaderSourceCode } from '@/Shaders/WaterShader/waterShader';
import { CaveBackground } from '@/components/CaveBackground/CaveBackground-rntge';
import { ContainerView } from '@/components/ContainerView/ContainerView-rntge';
import { WaterView } from '@/components/WaterView/WaterView-rntge';
import { SwimmerView } from '@/components/SwimmerView/SwimmerView-rntge';
import { TapSwimmer } from '@/components/TapSwimmer/TapSwimmer-rntge';
import { ObstacleView } from '@/components/ObstacleView/ObstacleView-rntge';
import { Meta, StoryObj } from '@storybook/react';
import { Content } from './components-rntge/Scene/Content';
import { ObstacleComponentName } from '@/Game/ecs-components/ObstacleComponent';
import { ContainerComponentName } from '@/Game/ecs-components/Container';
import { WaterComponentName } from '@/Game/ecs-components/Water';
import { SwimmerComponentName } from '@/Game/ecs-components/Swimmer';
import { ObstaclesManagerComponentName } from '@/Game/ecs-components/ObstaclesManager';
import { ScoreComponentName } from '@/Game/ecs-components/Score';
import { ScoreView } from '@/components/ScoreView/ScoreView-rntge';
import { ObstacleRowComponentName } from '@/Game/ecs-components/ObstacleRowComponent';
import { GameOverScene } from '../Scenes/GameOverScene/index-rntge';

export const SwimmerGameComp: FC<{}> = memo(
  (args: any) => {
    const windowDimensions = useWindowDimensions();
    const { width: windowWidth, height: windowHeight } = windowDimensions;
    const [containerEntityId, setContainerEntityId] = useState<number | null>(
      null
    );

    // Container setup - rectangular container extending full screen height for endless look
    const containerWidth = windowWidth * 0.8; // Use most of screen width
    const containerHeight = windowHeight; // Full screen height for endless appearance
    const containerCenterX = windowWidth / 2;
    const containerCenterY = windowHeight / 2; // Center of screen
    const containerBottom = containerCenterY + containerHeight / 2;

    // Water starts at container center (no initial rising phase)
    const initialWaterSurfaceY = containerCenterY; // Water at center from the start
    // Swimmer starts with roughly 1/3 of its body below the water surface
    const swimmerStartY = initialWaterSurfaceY - 10;

    // Obstacles will be generated dynamically by the ObstacleSystem

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', height: '100%' }}>
          <ReactNativeTurboGameEngine
            componentNames={[
              SwimmerComponentName,
              ContainerComponentName,
              WaterComponentName,
              ObstacleRowComponentName,
              ObstacleComponentName,
              ObstaclesManagerComponentName,
              ScoreComponentName,
            ]}
          >
            <Preload>
              <Asset
                id="Montserrat"
                type="font"
                family="Montserrat"
                resource={require('../../../assets/fonts/Montserrat-SemiBold.ttf')}
              />
            </Preload>
            <Content>
              <Scene name="game">
                <Preload>
                  <Asset type="image" name="block" uriOrBase64={block} />
                  <Asset type="image" name="block2" uriOrBase64={block2} />
                  <Asset type="image" name="block3" uriOrBase64={block3} />
                  <Asset type="image" name="cave_bg" uriOrBase64={caveBg} />
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

                  {/* Score - top center, big and bold */}
                  <ScoreView />
                </Content>
              </Scene>
              <GameOverScene />
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

const meta = {
  title: 'Swimmer Game',
  component: SwimmerGameComp,
  args: {},
} satisfies Meta<typeof SwimmerGameComp>;

export default meta;

export const Basic: StoryObj<typeof meta> = {
  args: {},
};
