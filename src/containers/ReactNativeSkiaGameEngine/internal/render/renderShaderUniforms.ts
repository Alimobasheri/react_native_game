import {
  FilterMode,
  MipmapMode,
  Skia,
  SkShader,
  TileMode,
  type SkImage,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';
import type { CompositeShaderChildImage } from '../components/render';

const tileModeFrom = (mode?: 'repeat' | 'clamp'): TileMode => {
  'worklet';
  return mode === 'repeat' ? TileMode.Repeat : TileMode.Clamp;
};

/**
 * Flat float uniforms in SKSL declaration order (shader uniforms are separate children).
 * Keys must match the shader's non-shader uniform block order exactly.
 */
export const buildUniformFloats = (
  orderedKeys: readonly string[],
  uniforms: Record<string, number | number[]>
): number[] => {
  'worklet';
  const values: number[] = [];
  for (let i = 0; i < orderedKeys.length; i++) {
    const value = uniforms[orderedKeys[i]];
    if (value == null) {
      continue;
    }
    if (typeof value === 'number') {
      values.push(value);
    } else {
      for (let j = 0; j < value.length; j++) {
        values.push(value[j]);
      }
    }
  }
  return values;
};

export const buildChildImageShaders = (
  childImages: CompositeShaderChildImage[],
  imageCache: Record<string, SkImage | null | undefined>,
  meshWidth: number,
  meshHeight: number
): SkShader[] => {
  'worklet';
  const children: SkShader[] = [];
  for (let i = 0; i < childImages.length; i++) {
    const child = childImages[i];
    const image = imageCache[child.imageKey];
    if (!image) {
      continue;
    }
    const iw = image.width();
    const ih = image.height();
    const matrix = Skia.Matrix();
    matrix.translate(-meshWidth / 2, -meshHeight / 2);
    if (iw > 0 && ih > 0) {
      matrix.scale(meshWidth / iw, meshHeight / ih);
    }
    const tileX = tileModeFrom(child.tileModeX);
    const tileY = tileModeFrom(child.tileModeY);
    const imageShader = image.makeShaderCubic(
      tileX,
      tileY,
      FilterMode.Linear,
      MipmapMode.None,
      matrix
    );
    children.push(imageShader);
  }
  return children;
};

export const drawRuntimeEffectWithChildren = (
  effect: SkRuntimeEffect,
  uniformFloats: number[],
  childShaders: SkShader[],
  localMatrix?: ReturnType<typeof Skia.Matrix>
): SkShader => {
  'worklet';
  const runtime = effect as SkRuntimeEffect & {
    makeShaderWithChildren?: (
      uniforms: number[],
      children: SkShader[],
      localMatrix?: ReturnType<typeof Skia.Matrix>
    ) => SkShader;
  };
  if (runtime.makeShaderWithChildren) {
    return runtime.makeShaderWithChildren(
      uniformFloats,
      childShaders,
      localMatrix
    );
  }
  return effect.makeShader(uniformFloats, localMatrix);
};
