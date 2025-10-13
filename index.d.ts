import {
  AtlasData,
  ClipAnimationData,
} from '@/containers/ReactNativeSkiaGameEngine/types-ecs/render';
import { SkImage, SkRuntimeEffect } from '@shopify/react-native-skia';

export = _RNTGE_;
export as namespace _RNTGE_;

declare namespace _RNTGE_ {
  var physics:
    | {
        engine: Matter.Engine;
      }
    | undefined;
  var imageCache: Record<string, SkImage | null>;
  var shaderCache: Record<string, SkRuntimeEffect>;
  var atlasCache: Record<string, AtlasData>;
  var clipAnimationCache: Record<string, ClipAnimationData>;
  var fontCache: Record<string, { typeface: SkTypeface; family: string }>;
  var textCache: Record<
    string,
    {
      paragraph: Paragraph;
      width: number;
      height: number;
      lastHash: string | null;
    }
  >;
}
