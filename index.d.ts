import {
  AtlasData,
  ClipAnimationData,
} from '@/containers/ReactNativeSkiaGameEngine/types-ecs/render';
import {
  SkImage,
  SkRuntimeEffect,
  SkParagraph,
  SkPicture,
  SkPath,
} from '@shopify/react-native-skia';
import { ECS, ECSState } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import { SharedValue } from 'react-native-reanimated';
import { EventQueue, ExternalEvent } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useEventQueue/useEventQueue';

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
      paragraph: SkParagraph;
      width: number;
      height: number;
      lastHash: string | null;
    }
  >;
  var TouchState:
    | {
      pan: {
        activePointers: Map<
          number,
          { entityId: number | null; captured: boolean }
        >;
      };
      tap: {};
      longPress: {};
    }
    | undefined;
  var ecs: ECS | null;
  var state: ECSState | undefined;
  var picture: SkPicture | null;
  var pictureCache: Record<number, SkPicture | SkPath> | undefined;
  /** Pictures queued this frame; promoted to _pictureDisposeReady next frame. */
  var _pictureDisposeQueue: (SkPicture | SkPath)[] | undefined;
  /** Pictures queued ≥1 frame ago — safe to dispose at the start of this frame. */
  var _pictureDisposeReady: (SkPicture | SkPath)[] | undefined;
  var eventQueue: {
    eventStore: EventQueue;
    nextEvents: EventQueue;
    nextExternalEvents: ExternalEvent[];
  };
}
