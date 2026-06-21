import { BlendMode } from '@shopify/react-native-skia';
import {
  createRenderComponent,
  RenderComponentData,
  ShapeTypes,
} from '../components/render';
import type { ShaderInfo } from '../components/render';

export type ScreenShaderOverlayOptions = {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  shaderKey: string;
  uniforms: ShaderInfo['uniforms'];
  renderLayer: number;
  opacity?: number;
  blendMode?: BlendMode;
  visible?: boolean;
};

/**
 * Full-screen (or viewport-sized) shader overlay fixed in screen space.
 * Use for gradients, vignettes, color grading — not world-parallax content.
 */
export const createScreenShaderOverlayComponent = (
  options: ScreenShaderOverlayOptions
) => {
  'worklet';
  const {
    centerX,
    centerY,
    width,
    height,
    shaderKey,
    uniforms,
    renderLayer,
    opacity,
    blendMode,
    visible = true,
  } = options;

  const renderOptions: Omit<RenderComponentData, 'isDirty'> = {
    shape: {
      type: ShapeTypes.Rectangle,
      width,
      height,
    },
    position: { x: centerX, y: centerY },
    visible,
    renderLayer,
    shader: {
      key: shaderKey,
      uniforms,
    },
  };

  if (typeof opacity === 'number') {
    renderOptions.opacity = opacity;
  }
  if (blendMode !== undefined) {
    renderOptions.blendMode = blendMode;
  }

  return createRenderComponent(renderOptions);
};
