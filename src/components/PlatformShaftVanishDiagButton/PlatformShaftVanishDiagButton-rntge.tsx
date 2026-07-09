import {
  useAddEntity,
  useCanvasDimensions,
  useRNTGESafeAreaInsets,
} from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createTextComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/text';
import { createTapComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/touch';
import {
  buildPlatformShaftVanishDiagDump,
  logPlatformShaftVanishDiagDump,
} from '@/Game/debug/platformShaftVanishDiag';
import { SwimmerRenderLayer } from '@/Game/render/swimmerRenderLayers';
import { Skia, TextAlign } from '@shopify/react-native-skia';
import { FC, useMemo } from 'react';

const BUTTON_W = 96;
const BUTTON_H = 36;

export const PlatformShaftVanishDiagButton: FC = () => {
  const dimensions = useCanvasDimensions();
  const safeAreaInsets = useRNTGESafeAreaInsets();

  const components = useMemo(() => {
    const screenW = dimensions?.width ?? 400;
    const screenH = dimensions?.height ?? 800;
    const x = screenW - safeAreaInsets.right - BUTTON_W - 88;
    const y = screenH - safeAreaInsets.bottom - BUTTON_H - 12;

    return [
      createTextComponent({
        text: 'SHAFT LOG',
        fontAssetId: 'Fredoka',
        fontSize: 14,
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
          const dump = buildPlatformShaftVanishDiagDump(ecs, ecs.components);
          logPlatformShaftVanishDiagDump(dump);
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
        opacity: 0.78,
        fillColor: '#3B1026DD',
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
