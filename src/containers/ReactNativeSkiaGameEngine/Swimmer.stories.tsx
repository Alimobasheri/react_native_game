import { FC, memo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReactNativeTurboGameEngine } from './RNTGE';
import { Preload } from './components-rntge/Scene/Preload';
import { Asset } from './components-rntge/Scene/Asset';
import { Scene } from './components-rntge/Scene/Scene';
import { swimmerCaveBg } from '@/assets/swimmerCaveBg';
import {
  swimmerBlockVar0,
  swimmerBlockVar1,
  swimmerBlockVar2,
  swimmerBlockVar3,
} from '@/assets/swimmerBlocks';
import {
  swimmerSideWallLeft,
  swimmerSideWallRight,
} from '@/assets/swimmerSideWalls';
import { swimmerIconCrownGold, SWIMMER_UI_IMAGE } from '@/assets/swimmerUi';
import {
  aquaSproutBody,
  aquaSproutEyes,
  aquaSproutHair,
  floaterGoggledBody,
  floaterGoggledGoggles,
  kelpDrifterBody,
  kelpDrifterInternal,
  kelpDrifterEyes,
  kelpDrifterHair,
  SWIMMER_CHARACTER_IMAGE,
} from '@/assets/swimmerCharacters';
import {
  rippleEffectSourceCode,
  kelpSwayEffectSourceCode,
} from '@/Shaders/SwimmerInternal';
import { sourceCode as waterShaderSourceCode } from '@/Shaders/WaterShader/waterShader';
import { sourceCode as screenAtmosphereGradientSourceCode } from '@/containers/ReactNativeSkiaGameEngine/Shaders/screenAtmosphereGradient';
import { sourceCode as screenEdgeVignetteSourceCode } from '@/containers/ReactNativeSkiaGameEngine/Shaders/screenEdgeVignette';
import { CaveBackground } from '@/components/CaveBackground/CaveBackground-rntge';
import { SideWalls } from '@/components/SideWalls/SideWalls-rntge';
import { sideWallTuning } from '@/config/swimmerTuning';
import { ContainerView } from '@/components/ContainerView/ContainerView-rntge';
import { WaterView } from '@/components/WaterView/WaterView-rntge';
import {
  AQUA_SPROUT_SKIN_ID,
  DEFAULT_SWIMMER_SKIN_ID,
  KELP_DRIFTER_SKIN_ID,
  type SwimmerSkinId,
} from '@/Game/characters/swimmerSkins';
import type { SwimmerLifeDebugMode } from '@/Game/characters/life/swimmerLifeTypes';
import { SwimmerView } from '@/components/SwimmerView/SwimmerView-rntge';
import { TapSwimmer } from '@/components/TapSwimmer/TapSwimmer-rntge';
import { ObstacleView } from '@/components/ObstacleView/ObstacleView-rntge';
import { Meta, StoryObj } from '@storybook/react';
import { Content } from './components-rntge/Scene/Content';
import { ContainerComponentName } from '@/Game/ecs-components/Container';
import { WaterComponentName } from '@/Game/ecs-components/Water';
import { SwimmerComponentName } from '@/Game/ecs-components/Swimmer';
import { ObstaclesManagerComponentName } from '@/Game/ecs-components/ObstaclesManager';
import { ScoreComponentName } from '@/Game/ecs-components/Score';
import { ScoreHudTagComponentName } from '@/Game/ecs-components/ScoreHudTag';
import { RunResultComponentName } from '@/Game/ecs-components/RunResult';
import { GameOverScoreComponentName } from '@/Game/ecs-components/GameOverScore';
import { ScoreView } from '@/components/ScoreView/ScoreView-rntge';
import { GameplayFeedbackView } from '@/components/GameplayFeedbackView/GameplayFeedbackView-rntge';
import { StageOverlayView } from '@/components/StageOverlayView/StageOverlayView-rntge';
import { SkillFeedbackDiagButton } from '@/components/SkillFeedbackDiagButton/SkillFeedbackDiagButton-rntge';
import { PlatformShaftVanishDiagButton } from '@/components/PlatformShaftVanishDiagButton/PlatformShaftVanishDiagButton-rntge';
import { platformShaftVanishDiagTuning } from '@/Game/debug/platformShaftVanishDiag';
import { skillFeedbackDiagTuning } from '@/Game/debug/skillFeedbackDiag';
import { ObstacleRowComponentName } from '@/Game/ecs-components/ObstacleRowComponent';
import { BlockFoamComponentName } from '@/Game/ecs-components/BlockFoam';
import { WaterSurfaceFoamComponentName } from '@/Game/ecs-components/WaterSurfaceFoam';
import { CaveBackgroundSegmentComponentName } from '@/Game/ecs-components/CaveBackgroundSegment';
import { CaveAtmosphereComponentName } from '@/Game/ecs-components/CaveAtmosphere';
import { SideWallSegmentComponentName } from '@/Game/ecs-components/SideWallSegment';
import { TemplateContextComponentName } from '@/Game/ecs-components/TemplateContextComponent';
import { GameSessionComponentName } from '@/Game/ecs-components/GameSession';
import { StartOverlayTagComponentName } from '@/Game/ecs-components/StartOverlayTag';
import { GameOverOverlayTagComponentName } from '@/Game/ecs-components/GameOverOverlayTag';
import { GameplayFeedbackManagerComponentName } from '@/Game/ecs-components/GameplayFeedbackManager';
import { GameplayFeedbackFlashTagComponentName } from '@/Game/ecs-components/GameplayFeedbackFlashTag';
import { StageOverlayTagComponentName } from '@/Game/ecs-components/StageOverlayTag';
import { GameOverScene } from '../Scenes/GameOverScene/index-rntge';
import { StartScene } from '../Scenes/StartScene/index-rntge';
import {
  WATER_SURFACE_FROM_CONTAINER_BOTTOM_FRACTION,
  getWaterSurfaceRestY,
} from '@/Layout';
import type {
  StoryLockedProceduralSegment,
  StoryLockedShaftRecipe,
} from '@/Game/ecs-systems/obstacleSystem';
import { HazardBandLeadComponentName } from '@/Game/ecs-components/HazardBandLead';
import { HazardBandMemberComponentName } from '@/Game/ecs-components/HazardBandMember';
import { PivotHazardArmComponentName } from '@/Game/ecs-components/PivotHazardArm';

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
   * Multiplies water shader alpha so the swimmer reads more clearly through the water (Storybook).
   * 1 = full shader opacity; try ~0.45–0.65.
   */
  waterShaderOpacity: number;
  /**
   * How far (px) each side wall overlaps inward over the play channel (blocks, water).
   */
  sideWallContainerOverlapPx: number;
  /**
   * When set with `directed` or `baseMulti`, repeats one deterministic procedural branch
   * (funnel, pinball, …) instead of cycling macro pacing shapes.
   */
  storyLockedProceduralSegment: '' | StoryLockedProceduralSegment;
  /**
   * Lock one platform-shaft composer loop (composePressIntroShaft). Slice 3 streams rows.
   */
  storyLockedShaftRecipe: '' | StoryLockedShaftRecipe;
  storyLockedShaftSeed: number;
  storyLockedShaftDifficulty: number;
  storyLockShaftLoop: boolean;
  /** Playable swimmer visual skin. */
  swimmerSkinId: SwimmerSkinId;
  /** Composite shader debug gate: 0=composite, 1=mask, 2=uvScroll, 3=rawBody */
  lifeDebugMode: SwimmerLifeDebugMode;
  /** Internal motion intensity override (Storybook). */
  internalIntensity: number;
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

const SHAFT_RECIPE_OPTIONS: ('' | StoryLockedShaftRecipe)[] = [
  '',
  'composePressIntroShaft',
  'pressPinballPair',
  'pathChicaneShaft',
  'pivotGate',
  'pivotCross',
];

export const SwimmerGameComp: FC<SwimmerStoryArgs> = memo(
  (args) => {
    const windowDimensions = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const { width: windowWidth, height: windowHeight } = windowDimensions;
    // Container setup - rectangular container extending full screen height for endless look
    const containerWidth = windowWidth * 0.8; // Use most of screen width
    const containerHeight = windowHeight + insets.bottom + insets.top; // Full screen height for endless appearance
    const containerCenterX = windowWidth / 2;
    const containerCenterY = containerHeight / 2; // Center of screen

    const initialWaterSurfaceY = getWaterSurfaceRestY(
      containerCenterY,
      containerHeight
    );
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
              BlockFoamComponentName,
              WaterSurfaceFoamComponentName,
              ObstaclesManagerComponentName,
              TemplateContextComponentName,
              CaveBackgroundSegmentComponentName,
              CaveAtmosphereComponentName,
              SideWallSegmentComponentName,
              ScoreComponentName,
              ScoreHudTagComponentName,
              RunResultComponentName,
              GameOverScoreComponentName,
              GameSessionComponentName,
              StartOverlayTagComponentName,
              GameOverOverlayTagComponentName,
              GameplayFeedbackManagerComponentName,
              GameplayFeedbackFlashTagComponentName,
              StageOverlayTagComponentName,
              HazardBandLeadComponentName,
              HazardBandMemberComponentName,
              PivotHazardArmComponentName,
            ]}
          >
            <Preload>
              <Asset
                id="Fredoka"
                type="font"
                family="Fredoka"
                resource={require('../../../assets/fonts/Fredoka-Bold.ttf')}
              />
            </Preload>
            <Content>
              <Scene name="game">
                <Preload>
                  <Asset
                    type="image"
                    name="block_var_0"
                    uriOrBase64={swimmerBlockVar0}
                  />
                  <Asset
                    type="image"
                    name="block_var_1"
                    uriOrBase64={swimmerBlockVar1}
                  />
                  <Asset
                    type="image"
                    name="block_var_2"
                    uriOrBase64={swimmerBlockVar2}
                  />
                  <Asset
                    type="image"
                    name="block_var_3"
                    uriOrBase64={swimmerBlockVar3}
                  />
                  <Asset
                    type="image"
                    name="cave_bg"
                    uriOrBase64={swimmerCaveBg}
                  />
                  <Asset
                    type="image"
                    name="side_wall_left"
                    uriOrBase64={swimmerSideWallLeft}
                  />
                  <Asset
                    type="image"
                    name="side_wall_right"
                    uriOrBase64={swimmerSideWallRight}
                  />
                  <Asset
                    type="image"
                    name={SWIMMER_UI_IMAGE.iconCrownGold}
                    uriOrBase64={swimmerIconCrownGold}
                  />
                  <Asset
                    type="image"
                    name={SWIMMER_CHARACTER_IMAGE.floaterGoggledBody}
                    uriOrBase64={floaterGoggledBody}
                  />
                  <Asset
                    type="image"
                    name={SWIMMER_CHARACTER_IMAGE.floaterGoggledGoggles}
                    uriOrBase64={floaterGoggledGoggles}
                  />
                  <Asset
                    type="image"
                    name={SWIMMER_CHARACTER_IMAGE.aquaSproutBody}
                    uriOrBase64={aquaSproutBody}
                  />
                  <Asset
                    type="image"
                    name={SWIMMER_CHARACTER_IMAGE.aquaSproutHair}
                    uriOrBase64={aquaSproutHair}
                  />
                  <Asset
                    type="image"
                    name={SWIMMER_CHARACTER_IMAGE.aquaSproutEyes}
                    uriOrBase64={aquaSproutEyes}
                  />
                  <Asset
                    type="image"
                    name={SWIMMER_CHARACTER_IMAGE.kelpDrifterBody}
                    uriOrBase64={kelpDrifterBody}
                  />
                  <Asset
                    type="image"
                    name={SWIMMER_CHARACTER_IMAGE.kelpDrifterInternal}
                    uriOrBase64={kelpDrifterInternal}
                  />
                  <Asset
                    type="image"
                    name={SWIMMER_CHARACTER_IMAGE.kelpDrifterHair}
                    uriOrBase64={kelpDrifterHair}
                  />
                  <Asset
                    type="image"
                    name={SWIMMER_CHARACTER_IMAGE.kelpDrifterEyes}
                    uriOrBase64={kelpDrifterEyes}
                  />
                  <Asset
                    type="shader"
                    name="swimmerInternalRipple"
                    source={rippleEffectSourceCode}
                  />
                  <Asset
                    type="shader"
                    name="swimmerInternalKelpSway"
                    source={kelpSwayEffectSourceCode}
                  />
                  <Asset
                    type="shader"
                    name="water"
                    source={waterShaderSourceCode}
                  />
                  <Asset
                    type="shader"
                    name="screenAtmosphereGradient"
                    source={screenAtmosphereGradientSourceCode}
                  />
                  <Asset
                    type="shader"
                    name="screenEdgeVignette"
                    source={screenEdgeVignetteSourceCode}
                  />
                </Preload>
                <Content>
                  {/* Cave background - full screen image */}
                  <CaveBackground />
                  {/* Side rock walls — foreground parallax, just ahead of block speed */}
                  <SideWalls
                    containerOverlapPx={args.sideWallContainerOverlapPx}
                  />
                  {/* Container - rectangular with boundaries */}
                  <ContainerView
                    x={containerCenterX}
                    y={containerCenterY}
                    width={containerWidth}
                    height={containerHeight}
                    initialWaterSurfaceY={initialWaterSurfaceY}
                    waterRiseSpeed={args.waterRiseSpeed}
                  />

                  {/* Dynamic Obstacles — before WaterView: hazard merge + effectiveGaps */}
                  <ObstacleView
                    lockedTemplateName={
                      args.lockedTemplateName
                        ? args.lockedTemplateName
                        : undefined
                    }
                    storyLockedProceduralSegment={
                      args.storyLockedProceduralSegment || undefined
                    }
                    storyLockedShaftRecipe={
                      args.storyLockedShaftRecipe || undefined
                    }
                    storyLockedShaftSeed={args.storyLockedShaftSeed}
                    storyLockedShaftDifficulty={args.storyLockedShaftDifficulty}
                    storyLockShaftLoop={args.storyLockShaftLoop || undefined}
                  />

                  {/* Water — after obstacles so physics reads same-frame shaft flow */}
                  <WaterView
                    raisingSpeed={args.raisingSpeed}
                    shaderOpacity={args.waterShaderOpacity}
                  />

                  {/* Swimmer - centered in a column; TapSwimmer handles tap-to-move */}
                  <SwimmerView
                    y={swimmerStartY}
                    containerWidth={containerWidth}
                    containerHeight={containerHeight}
                    containerCenterX={containerCenterX}
                    containerCenterY={containerCenterY}
                    useColumnControl={true}
                    skinId={args.swimmerSkinId}
                    lifeDebugMode={args.lifeDebugMode}
                    internalIntensity={args.internalIntensity}
                  />

                  <TapSwimmer
                    screenWidth={windowWidth}
                    screenHeight={windowHeight}
                  />

                  {/* Score HUD — top-left during gameplay */}
                  <ScoreView />
                  <GameplayFeedbackView />
                  <StageOverlayView />
                  {platformShaftVanishDiagTuning.SHOW_BUTTON && (
                    <PlatformShaftVanishDiagButton />
                  )}
                  {skillFeedbackDiagTuning.SHOW_BUTTON && (
                    <SkillFeedbackDiagButton />
                  )}
                </Content>
              </Scene>
              <StartScene
                gameTitle="FLOOD RUSH"
                shopEnabled={false}
                gameplayRaisingSpeed={args.raisingSpeed}
              />
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
  /** Procedural gap/runway + path segment row counts (funnel, pinball, …): `src/config/gapDifficultyRamp.ts`. Macro phase cycle: `src/config/obstaclePacing.ts`. */
  args: {
    waterSurfaceFromBottomFraction:
      WATER_SURFACE_FROM_CONTAINER_BOTTOM_FRACTION,
    waterRiseSpeed: 50,
    raisingSpeed: 200,
    waterShaderOpacity: 0.58,
    sideWallContainerOverlapPx: sideWallTuning.CONTAINER_OVERLAP_PX,
    lockedTemplateName: '',
    storyLockedProceduralSegment: '',
    storyLockedShaftRecipe: '',
    storyLockedShaftSeed: 42,
    storyLockedShaftDifficulty: 0.4,
    storyLockShaftLoop: false,
    swimmerSkinId: DEFAULT_SWIMMER_SKIN_ID,
    lifeDebugMode: 0,
    internalIntensity: 0.2,
  },
  argTypes: {
    waterSurfaceFromBottomFraction: {
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    waterRiseSpeed: { control: { type: 'number' } },
    raisingSpeed: { control: { type: 'number' } },
    waterShaderOpacity: {
      control: { type: 'range', min: 0.15, max: 1, step: 0.01 },
      description:
        'Water fill alpha. ~0.55–0.65 shows layered gradient + glossy surface lip on the cave background.',
    },
    sideWallContainerOverlapPx: {
      control: { type: 'range', min: 0, max: 48, step: 1 },
      description:
        'Pixels each side wall extends inward over blocks/water. Outer edge stays on screen bezel.',
    },
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
    storyLockedShaftRecipe: {
      control: 'select',
      options: SHAFT_RECIPE_OPTIONS,
      description:
        'Platform shaft composer lock. Slice 3 streams intro shaft rows when set.',
    },
    storyLockedShaftSeed: {
      control: { type: 'number' },
      description:
        'Deterministic harmonizer reroll seed for locked shaft recipe.',
    },
    storyLockedShaftDifficulty: {
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: 'Shaft difficulty profile 0 (easy) .. 1 (hard).',
    },
    storyLockShaftLoop: {
      control: 'boolean',
      description:
        'Repeat the same shaft segment on template rollover (Slice 3).',
    },
    swimmerSkinId: {
      control: 'select',
      options: [AQUA_SPROUT_SKIN_ID, KELP_DRIFTER_SKIN_ID],
    },
    lifeDebugMode: {
      control: { type: 'range', min: 0, max: 3, step: 1 },
      description:
        'G0–G3 device gates: 3=raw body, 1=mask, 2=UV scroll, 0=composite',
    },
    internalIntensity: {
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
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

export const KelpDrifter: StoryObj<typeof meta> = {
  args: {
    swimmerSkinId: KELP_DRIFTER_SKIN_ID,
  },
};

/** Yellow bg, aqua sprout — tune lifeDebugMode 0–3 for G0–G3 device gates. */
export const SwimmerInternalDebug: StoryObj<typeof meta> = {
  args: {
    swimmerSkinId: AQUA_SPROUT_SKIN_ID,
    waterShaderOpacity: 0,
    lifeDebugMode: 2,
    internalIntensity: 0.5,
  },
};

/** Repeats the tension funnel width ramp forever (same template as production multipath). */
export const LockedPathFunnelLoop: StoryObj<typeof meta> = {
  args: {
    ...directedMultipath,
    storyLockedProceduralSegment: 'funnel',
  },
};

/** Platform shaft intro teach loop — Slice 2 props; Slice 3 streams rows. */
export const LockedPressIntroShaftLoop: StoryObj<typeof meta> = {
  args: {
    lockedTemplateName: 'directed',
    storyLockedShaftRecipe: 'composePressIntroShaft',
    storyLockedShaftSeed: 42,
    storyLockedShaftDifficulty: 0.4,
    storyLockShaftLoop: true,
  },
};

/** Pinball press — alternate-side bounce (Slice 4). */
export const LockedPressPinballLoop: StoryObj<typeof meta> = {
  args: {
    lockedTemplateName: 'directed',
    storyLockedShaftRecipe: 'pressPinballPair',
    storyLockedShaftSeed: 42,
    storyLockedShaftDifficulty: 0.4,
    storyLockShaftLoop: true,
  },
};

/** Path v2 — wide chicane + dense derived shafts (P3). */
export const LockedPathChicaneShaftLoop: StoryObj<typeof meta> = {
  args: {
    lockedTemplateName: 'directed',
    storyLockedShaftRecipe: 'pathChicaneShaft',
    storyLockedShaftSeed: 42,
    storyLockedShaftDifficulty: 0.2,
    storyLockShaftLoop: true,
  },
};

/** 2-arm Pivot teach gate — timing dodge through rotating negative space. */
export const LockedPivotGateLoop: StoryObj<typeof meta> = {
  args: {
    lockedTemplateName: 'directed',
    storyLockedShaftRecipe: 'pivotGate',
    storyLockedShaftSeed: 42,
    storyLockedShaftDifficulty: 0.3,
    storyLockShaftLoop: true,
  },
};

/** 4-arm center Pivot cross — tension timing challenge. */
export const LockedPivotCrossLoop: StoryObj<typeof meta> = {
  args: {
    lockedTemplateName: 'directed',
    storyLockedShaftRecipe: 'pivotCross',
    storyLockedShaftSeed: 42,
    storyLockedShaftDifficulty: 0.55,
    storyLockShaftLoop: true,
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
