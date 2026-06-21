import { FC, memo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { ReactNativeTurboGameEngine } from '@/containers/ReactNativeSkiaGameEngine/RNTGE';
import { Preload } from '@/containers/ReactNativeSkiaGameEngine/components-rntge/Scene/Preload';
import { Asset } from '@/containers/ReactNativeSkiaGameEngine/components-rntge/Scene/Asset';
import { Scene } from '@/containers/ReactNativeSkiaGameEngine/components-rntge/Scene/Scene';
import { Content } from '@/containers/ReactNativeSkiaGameEngine/components-rntge/Scene/Content';
import { CaveBackground } from '@/components/CaveBackground/CaveBackground-rntge';
import { ContainerView } from '@/components/ContainerView/ContainerView-rntge';
import { WaterView } from '@/components/WaterView/WaterView-rntge';
import { SwimmerView } from '@/components/SwimmerView/SwimmerView-rntge';
import { TapSwimmer } from '@/components/TapSwimmer/TapSwimmer-rntge';
import { ObstacleView } from '@/components/ObstacleView/ObstacleView-rntge';
import { ScoreView } from '@/components/ScoreView/ScoreView-rntge';
import { Meta, StoryObj } from '@storybook/react';

import { swimmerCaveBg } from '@/assets/swimmerCaveBg';
import {
  swimmerBlockVar0,
  swimmerBlockVar1,
  swimmerBlockVar2,
  swimmerBlockVar3,
} from '@/assets/swimmerBlocks';
import { sourceCode as waterShaderSourceCode } from '@/Shaders/WaterShader/waterShader';


import { ContainerComponentName } from '@/Game/ecs-components/Container';
import { WaterComponentName } from '@/Game/ecs-components/Water';
import { SwimmerComponentName } from '@/Game/ecs-components/Swimmer';
import { ObstaclesManagerComponentName } from '@/Game/ecs-components/ObstaclesManager';
import { ScoreComponentName } from '@/Game/ecs-components/Score';
import { ObstacleRowComponentName } from '@/Game/ecs-components/ObstacleRowComponent';
import { CaveBackgroundSegmentComponentName } from '@/Game/ecs-components/CaveBackgroundSegment';
import { TemplateContextComponentName } from '@/Game/ecs-components/TemplateContextComponent';
import { getWaterSurfaceRestY } from '@/Layout';

type ObstacleTemplateStoryProps = {
  /** Must match keys in `MappedTemplates` (e.g. 'smily', 'jellyfish', 'base', 'baseMulti', 'rest'). */
  templateName: string;
};

export const ObstacleTemplateGameComp: FC<ObstacleTemplateStoryProps> = memo(
  (args) => {
    const windowDimensions = useWindowDimensions();
    const { width: windowWidth, height: windowHeight } = windowDimensions;

    const containerWidth = windowWidth * 0.8;
    const containerHeight = windowHeight;
    const containerCenterX = windowWidth / 2;
    const containerCenterY = windowHeight / 2;

    const initialWaterSurfaceY = getWaterSurfaceRestY(
      containerCenterY,
      containerHeight
    );
    const swimmerStartY = initialWaterSurfaceY - 10;

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', height: '100%' }}>
          <ReactNativeTurboGameEngine
            componentNames={[
              SwimmerComponentName,
              ContainerComponentName,
              WaterComponentName,
              ObstacleRowComponentName,
              ObstaclesManagerComponentName,
              TemplateContextComponentName,
              CaveBackgroundSegmentComponentName,
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
                  <CaveBackground />

                  <ContainerView
                    x={containerCenterX}
                    y={containerCenterY}
                    width={containerWidth}
                    height={containerHeight}
                    initialWaterSurfaceY={initialWaterSurfaceY}
                    waterRiseSpeed={3}
                  />

                  <WaterView raisingSpeed={100} />

                  <ObstacleView lockedTemplateName={args.templateName} />

                  <SwimmerView
                    y={swimmerStartY}
                    containerWidth={containerWidth}
                    containerHeight={containerHeight}
                    containerCenterX={containerCenterX}
                    containerCenterY={containerCenterY}
                    useColumnControl={true}
                    disableGameOver={true}
                  />

                  <TapSwimmer
                    screenWidth={windowWidth}
                    screenHeight={windowHeight}
                  />

                  <ScoreView />
                </Content>
              </Scene>
            </Content>
          </ReactNativeTurboGameEngine>
        </View>
      </View>
    );
  },
  (prevProps, nextProps) =>
    JSON.stringify(prevProps) === JSON.stringify(nextProps)
);

const meta = {
  title: 'Obstacle Templates',
  component: ObstacleTemplateGameComp,
  args: { templateName: 'smily' },
} satisfies Meta<typeof ObstacleTemplateGameComp>;

export default meta;

export const Smily: StoryObj<typeof meta> = {
  args: { templateName: 'smily' },
};

export const Jellyfish: StoryObj<typeof meta> = {
  args: { templateName: 'jellyfish' },
};

export const Micky: StoryObj<typeof meta> = {
  args: { templateName: 'micky' },
};

export const Kitty: StoryObj<typeof meta> = {
  args: { templateName: 'kitty' },
};

export const Deadpool: StoryObj<typeof meta> = {
  args: { templateName: 'deadpool' },
};

export const Megaman: StoryObj<typeof meta> = {
  args: { templateName: 'megaman' },
};
