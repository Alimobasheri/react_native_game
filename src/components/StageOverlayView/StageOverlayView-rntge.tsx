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
import { createStageOverlayTagComponent } from '@/Game/ecs-components/StageOverlayTag';
import type { StageOverlayRole } from '@/Game/ecs-components/StageOverlayTag';
import { SwimmerRenderLayer } from '@/Game/render/swimmerRenderLayers';
import { layoutStageOverlay } from '@/Game/ui/stageOverlayLayout';
import { StageOverlaySystem } from '@/systems/StageOverlaySystem';
import { Skia, TextAlign } from '@shopify/react-native-skia';
import { FC, useMemo } from 'react';

const StageOverlaySlot: FC<{
  role: StageOverlayRole;
}> = ({ role }) => {
  const dimensions = useCanvasDimensions();
  const components = useMemo(() => {
    const screenW = dimensions?.width ?? 400;
    const screenH = dimensions?.height ?? 800;
    const layout = layoutStageOverlay(screenW, screenH, 0);
    const isCenter = role === 'center';
    const isPersistent = role === 'persistentHud';
    const fontSize = isPersistent
      ? layout.persistentFontSize
      : isCenter
        ? layout.introFontSize
        : layout.doneFontSize;
    const anchorX = isPersistent
      ? layout.hudX
      : isCenter
        ? layout.centerX
        : layout.doneX;
    const anchorY = isPersistent
      ? layout.hudY
      : isCenter
        ? layout.centerY
        : layout.doneY;
    const boxWidth = layout.centerTextWidth;
    const posX = anchorX - boxWidth * 0.5;
    const posY = anchorY - fontSize * 0.55;

    return [
      createStageOverlayTagComponent({
        role,
        baseX: anchorX,
        baseY: anchorY,
      }),
      createTextComponent({
        text: '',
        fontAssetId: 'Fredoka',
        fontSize,
        color: Skia.Color('#FFFFFF'),
        strokeColor: Skia.Color('#1A1030'),
        strokeWidth: 3,
        align: TextAlign.Center,
        maxWidth: boxWidth,
        opacity: 0,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: boxWidth,
          height: fontSize * 1.2,
        },
        position: { x: posX, y: posY },
        visible: false,
        opacity: 0,
        zIndex: SwimmerRenderLayer.Hud + (isPersistent ? 4 : 6),
        renderLayer: SwimmerRenderLayer.Hud,
      }),
    ];
  }, [dimensions?.height, dimensions?.width, role]);

  useAddEntity({ components });
  return null;
};

export const StageOverlayView: FC = () => {
  useAddSystem({ system: StageOverlaySystem });
  return (
    <>
      <StageOverlaySlot role="persistentHud" />
      <StageOverlaySlot role="center" />
      <StageOverlaySlot role="topDone" />
    </>
  );
};
