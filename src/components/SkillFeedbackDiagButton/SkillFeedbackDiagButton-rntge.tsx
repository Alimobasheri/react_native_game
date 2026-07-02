import {
  useAddEntity,
  useCanvasDimensions,
} from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createTextComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/text';
import { createTapComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/touch';
import {
  buildSkillFeedbackDiagDump,
  logSkillFeedbackDiagDump,
} from '@/Game/debug/skillFeedbackDiag';
import { SwimmerRenderLayer } from '@/Game/render/swimmerRenderLayers';
import type { SafeAreaInsets } from '@/Game/ui/refLayout';
import { Skia, TextAlign } from '@shopify/react-native-skia';
import { FC, useMemo } from 'react';

const BUTTON_W = 72;
const BUTTON_H = 36;

export const SkillFeedbackDiagButton: FC<{
  safeAreaInsets: SafeAreaInsets;
}> = ({ safeAreaInsets }) => {
  const dimensions = useCanvasDimensions();

  const components = useMemo(() => {
    const screenW = dimensions?.width ?? 400;
    const screenH = dimensions?.height ?? 800;
    const x = screenW - safeAreaInsets.right - BUTTON_W - 8;
    const y = screenH - safeAreaInsets.bottom - BUTTON_H - 12;

    return [
      createTextComponent({
        text: 'LOG',
        fontAssetId: 'Fredoka',
        fontSize: 16,
        color: Skia.Color('white'),
        align: TextAlign.Center,
        maxWidth: BUTTON_W,
      }),
      createTapComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: BUTTON_W,
          height: BUTTON_H,
        },
        onTap: ({ systemArgs }) => {
          'worklet';
          const { ecs } = systemArgs;
          const dump = buildSkillFeedbackDiagDump(ecs, ecs.components);
          logSkillFeedbackDiagDump(dump);
        },
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: BUTTON_W,
          height: BUTTON_H,
        },
        position: { x, y },
        visible: true,
        opacity: 0.72,
        fillColor: '#141428CC',
        zIndex: SwimmerRenderLayer.Hud + 50,
        renderLayer: SwimmerRenderLayer.Hud,
      }),
    ];
  }, [
    dimensions?.height,
    dimensions?.width,
    safeAreaInsets.bottom,
    safeAreaInsets.right,
  ]);

  useAddEntity({ components });

  return null;
};
