import {
  useAddEntity,
  useAddSystem,
  useCanvasDimensions,
} from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createTextComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/text';
import { createGameplayFeedbackFlashTagComponent } from '@/Game/ecs-components/GameplayFeedbackFlashTag';
import {
  createGameplayFeedbackManagerComponent,
} from '@/Game/ecs-components/GameplayFeedbackManager';
import { SwimmerRenderLayer } from '@/Game/render/swimmerRenderLayers';
import { layoutGameplayFeedback } from '@/Game/ui/gameplayFeedbackLayout';
import { GAMEPLAY_FLASH_COLORS } from '@/Game/feedback/gameplayFeedbackVisuals';
import { gameplayFeedbackTuning } from '@/config/gameplayFeedback';
import { GameplayFeedbackSystem } from '@/systems/GameplayFeedbackSystem';
import { Skia, TextAlign } from '@shopify/react-native-skia';
import { FC, useMemo } from 'react';
import type { FeedbackFlashKind } from '@/Game/ecs-components/GameplayFeedbackManager';

const WORD_SLOT_COUNT = 2;

const FlashSlotEntity: FC<{
  slotIndex: number;
  role: FeedbackFlashKind;
}> = ({ slotIndex, role }) => {
  const dimensions = useCanvasDimensions();
  const components = useMemo(() => {
    const screenW = dimensions?.width ?? 400;
    const screenH = dimensions?.height ?? 800;
    const layout = layoutGameplayFeedback(screenW, screenH);
    const isWord = role === 'word';
    return [
      createGameplayFeedbackFlashTagComponent({
        slotIndex,
        role,
        baseWidth: layout.flashWidth,
        baseHeight: layout.flashHeight,
      }),
      createTextComponent({
        text: '',
        fontAssetId: 'Fredoka',
        fontSize: layout.fontSize,
        color: Skia.Color(
          isWord ? GAMEPLAY_FLASH_COLORS.fill : GAMEPLAY_FLASH_COLORS.bonusFill
        ),
        strokeColor: GAMEPLAY_FLASH_COLORS.stroke,
        strokeWidth: gameplayFeedbackTuning.FLASH_STROKE_WIDTH,
        align: TextAlign.Center,
        maxWidth: layout.flashWidth,
      }),
      createRenderComponent({
        shape: isWord
          ? {
              type: ShapeTypes.Circle,
              radius: layout.sparkRadius,
            }
          : {
              type: ShapeTypes.Rectangle,
              width: layout.flashWidth,
              height: layout.flashHeight,
            },
        position: { x: 0, y: 0 },
        visible: false,
        zIndex: 20 + slotIndex,
        renderLayer: SwimmerRenderLayer.Hud,
      }),
    ];
  }, [dimensions?.height, dimensions?.width, role, slotIndex]);

  useAddEntity({ components });
  return null;
};

export const GameplayFeedbackView: FC = () => {
  const managerComponents = useMemo(
    () => [
      createGameplayFeedbackManagerComponent(
        gameplayFeedbackTuning.FLASH_POOL_SIZE
      ),
    ],
    []
  );

  useAddEntity({ components: managerComponents });

  useAddSystem({ system: GameplayFeedbackSystem });

  return (
    <>
      {Array.from({ length: gameplayFeedbackTuning.FLASH_POOL_SIZE }, (_, i) => (
        <FlashSlotEntity
          key={`feedback-slot-${i}`}
          slotIndex={i}
          role={i < WORD_SLOT_COUNT ? 'word' : 'bonus'}
        />
      ))}
    </>
  );
};
