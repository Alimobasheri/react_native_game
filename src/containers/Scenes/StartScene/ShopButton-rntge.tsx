import {
  useAddEntity,
  useCanvasDimensions,
  useRNTGESafeAreaInsets,
} from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createTapComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/touch';
import { createStartOverlayTagComponent } from '@/Game/ecs-components/StartOverlayTag';
import { SWIMMER_UI_IMAGE } from '@/assets/swimmerUi';
import { FC, useMemo } from 'react';
import {
  layoutStartOverlay,
  OVERLAY_Z,
  rectCenter,
} from './startOverlayLayout';

export const ShopButton: FC<{
  enabled: boolean;
}> = ({ enabled }) => {
  const dimensions = useCanvasDimensions();
  const safeAreaInsets = useRNTGESafeAreaInsets();

  const panelComponents = useMemo(() => {
    if (!enabled) return [];
    const layout = layoutStartOverlay(
      dimensions.width,
      dimensions.height,
      safeAreaInsets
    );
    const chip = layout.shop;
    return [
      createStartOverlayTagComponent({
        role: 'shopPanel',
        baseX: chip.x,
        baseY: chip.y,
        baseWidth: chip.width,
        baseHeight: chip.height,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: chip.width,
          height: chip.height,
        },
        position: rectCenter(chip),
        image: SWIMMER_UI_IMAGE.uiChipPanel,
        visible: true,
        zIndex: OVERLAY_Z.shop,
      }),
      createTapComponent({
        priority: OVERLAY_Z.shop,
        shape: {
          type: ShapeTypes.Rectangle,
          width: chip.width,
          height: chip.height,
        },
        onTap: () => {
          'worklet';
          // TODO: open shop / skins when meta is implemented
        },
      }),
    ];
  }, [dimensions.height, dimensions.width, enabled, safeAreaInsets]);

  const iconComponents = useMemo(() => {
    if (!enabled) return [];
    const layout = layoutStartOverlay(
      dimensions.width,
      dimensions.height,
      safeAreaInsets
    );
    const icon = layout.shopIcon;
    return [
      createStartOverlayTagComponent({
        role: 'shop',
        baseX: icon.x,
        baseY: icon.y,
        baseWidth: icon.width,
        baseHeight: icon.height,
      }),
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: icon.width,
          height: icon.height,
        },
        position: rectCenter(icon),
        image: SWIMMER_UI_IMAGE.iconShopCart,
        visible: true,
        zIndex: OVERLAY_Z.shop + 1,
      }),
    ];
  }, [dimensions.height, dimensions.width, enabled, safeAreaInsets]);

  useAddEntity({ components: panelComponents });
  useAddEntity({ components: iconComponents });

  return null;
};
