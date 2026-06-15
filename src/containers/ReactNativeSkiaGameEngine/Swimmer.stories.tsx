import { FC, memo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { ReactNativeTurboGameEngine } from './RNTGE';
import { Preload } from './components-rntge/Scene/Preload';
import { Asset } from './components-rntge/Scene/Asset';
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
import { TemplateContextComponentName } from '@/Game/ecs-components/TemplateContextComponent';
import { GameOverScene } from '../Scenes/GameOverScene/index-rntge';
import { WATER_SURFACE_FROM_CONTAINER_BOTTOM_FRACTION } from '@/Layout';
import type { StoryLockedProceduralSegment } from '@/Game/ecs-systems/obstacleSystem';

/** Same geometry as `getWaterSurfaceRestY` but uses story arg `fraction` for experiments. */
function waterSurfaceYFromBottomFraction(
  containerCenterY: number,
  containerHeight: number,
  fraction: number
): number {
  const h = Math.max(1, containerHeight);
  const f = Math.max(0, Math.min(1, fraction));
  const bottomY = containerCenterY + h * 0.5;
  return bottomY - f * h;
}

export type SwimmerStoryArgs = {
  /**
   * Resting water surface as fraction of container height up from the bottom (see Layout.ts).
   * Default matches `WATER_SURFACE_FROM_CONTAINER_BOTTOM_FRACTION`.
   */
  waterSurfaceFromBottomFraction: number;
  waterRiseSpeed: number;
  raisingSpeed: number;
  /**
   * Keys in `ObstacleSystem` `MappedTemplates`. Empty string = omit prop (directed pacing / default).
   */
  lockedTemplateName: string;
  /**
   * When set with `directed` or `baseMulti`, repeats one deterministic procedural branch
   * (funnel, pinball, …) instead of cycling macro pacing shapes.
   */
  storyLockedProceduralSegment: '' | StoryLockedProceduralSegment;
};

const TEMPLATE_OPTIONS = [
  '',
  'directed',
  'base',
  'baseMulti',
  'rest',
  'smily',
  'jellyfish',
  'micky',
  'kitty',
  'deadpool',
  'megaman',
] as const;

const PROC_SEGMENT_OPTIONS: ('' | StoryLockedProceduralSegment)[] = [
  '',
  'funnel',
  'paradoxSplit',
  'tensionMultipath',
  'pinball',
  'falseWall',
  'climaxMultipath',
  'releaseRestZone',
  'releaseMultipath',
  'flowMultipath',
];

export const SwimmerGameComp: FC<SwimmerStoryArgs> = memo(
  (args) => {
    const windowDimensions = useWindowDimensions();
    const { width: windowWidth, height: windowHeight } = windowDimensions;
    // Container setup - rectangular container extending full screen height for endless look
    const containerWidth = windowWidth * 0.8; // Use most of screen width
    const containerHeight = windowHeight; // Full screen height for endless appearance
    const containerCenterX = windowWidth / 2;
    const containerCenterY = windowHeight / 2; // Center of screen

    const initialWaterSurfaceY = waterSurfaceYFromBottomFraction(
      containerCenterY,
      containerHeight,
      args.waterSurfaceFromBottomFraction
    );
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
              TemplateContextComponentName,
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
                    waterRiseSpeed={args.waterRiseSpeed}
                  />

                  {/* Water - rendered separately, will be updated by system */}
                  <WaterView raisingSpeed={args.raisingSpeed} />

                  {/* Dynamic Obstacles */}
                  <ObstacleView
                    lockedTemplateName={
                      args.lockedTemplateName
                        ? args.lockedTemplateName
                        : undefined
                    }
                    storyLockedProceduralSegment={
                      args.storyLockedProceduralSegment || undefined
                    }
                  />

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

                  {/* Score - top center, big and bold */}
                  <ScoreView />
                </Content>
              </Scene>
              <GameOverScene backgroundColor="#2B0A3D" />
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
  args: {
    waterSurfaceFromBottomFraction:
      WATER_SURFACE_FROM_CONTAINER_BOTTOM_FRACTION,
    waterRiseSpeed: 20,
    raisingSpeed: 100,
    lockedTemplateName: '',
    storyLockedProceduralSegment: '',
  },
  argTypes: {
    waterSurfaceFromBottomFraction: {
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    waterRiseSpeed: { control: { type: 'number' } },
    raisingSpeed: { control: { type: 'number' } },
    lockedTemplateName: {
      control: 'select',
      options: [...TEMPLATE_OPTIONS],
    },
    storyLockedProceduralSegment: {
      control: 'select',
      options: PROC_SEGMENT_OPTIONS,
      description:
        'Requires template `directed` or `baseMulti`. Loops one procedural path for Storybook.',
    },
  },
} satisfies Meta<typeof SwimmerGameComp>;

export default meta;
const directedMultipath = {
  lockedTemplateName: 'directed' as const,
};
export const Basic: StoryObj<typeof meta> = {
  args: {},
};

/** Repeats the tension funnel width ramp forever (same template as production multipath). */
export const LockedPathFunnelLoop: StoryObj<typeof meta> = {
  args: {
    ...directedMultipath,
    storyLockedProceduralSegment: 'funnel',
  },
};

/** Repeats the climax pinball zig-zag segment forever. */
export const LockedPathPinballLoop: StoryObj<typeof meta> = {
  args: {
    ...directedMultipath,
    storyLockedProceduralSegment: 'pinball',
  },
};

/** Repeats the paradox fork row forever (deterministic split from funnel center). */
export const LockedPathParadoxSplitLoop: StoryObj<typeof meta> = {
  args: {
    ...directedMultipath,
    storyLockedProceduralSegment: 'paradoxSplit',
  },
};

/** Repeats the false-wall squeeze segment forever. */
export const LockedPathFalseWallLoop: StoryObj<typeof meta> = {
  args: {
    ...directedMultipath,
    storyLockedProceduralSegment: 'falseWall',
  },
};

/** Tension phase multipath only (no funnel / paradox). */
export const LockedPathTensionMultipathLoop: StoryObj<typeof meta> = {
  args: {
    ...directedMultipath,
    storyLockedProceduralSegment: 'tensionMultipath',
  },
};

/** Climax phase multipath only (no pinball / false wall). */
export const LockedPathClimaxMultipathLoop: StoryObj<typeof meta> = {
  args: {
    ...directedMultipath,
    storyLockedProceduralSegment: 'climaxMultipath',
  },
};

/** Cathartic full-width strip forever. */
export const LockedPathReleaseRestLoop: StoryObj<typeof meta> = {
  args: {
    ...directedMultipath,
    storyLockedProceduralSegment: 'releaseRestZone',
  },
};

/** Release-phase branching gaps only (skips cathartic strip). */
export const LockedPathReleaseMultipathLoop: StoryObj<typeof meta> = {
  args: {
    ...directedMultipath,
    storyLockedProceduralSegment: 'releaseMultipath',
  },
};

/** Flow-phase `generateMultiPathGapsDeterministic` only (macro forced to flow for this story). */
export const LockedPathFlowMultipathLoop: StoryObj<typeof meta> = {
  args: {
    ...directedMultipath,
    storyLockedProceduralSegment: 'flowMultipath',
  },
};

/** Same segment locks using the shorter `baseMulti` template run (rollover every few rows). */
export const LockedPathFunnelLoopBaseMulti: StoryObj<typeof meta> = {
  args: {
    lockedTemplateName: 'baseMulti',
    storyLockedProceduralSegment: 'funnel',
  },
};
