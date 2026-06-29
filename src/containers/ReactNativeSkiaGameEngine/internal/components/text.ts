import {
  SkColor,
  Skia,
  TextAlign,
  TextDecoration,
} from '@shopify/react-native-skia';
import { Component } from '../../services-ecs';

export const TextComponentName = 'text';

/** Drop shadow for Skia paragraph text — mirrors ImageShadowData on render components. */
export type TextShadowData = {
  dx?: number;
  dy?: number;
  /** Gaussian sigma passed to Skia drop-shadow (typical range 2–8). */
  blur: number;
  color: string;
  /** When true (default), shadow is drawn in a pass behind the text. */
  shadowOnly?: boolean;
};

export type TextComponentData = {
  text: string;
  fontAssetId: string;
  fontSize: number;
  color?: SkColor;
  align?: TextAlign;
  maxWidth?: number | null;
  wrap?: boolean;
  ellipsis?: string;
  lineHeight?: number | null;
  letterSpacing?: number | null;
  strokeColor?: string | null;
  strokeWidth?: number | null;
  textShadow?: TextShadowData;
  opacity?: number;
  zIndex?: number;
  isDirty?: boolean;
  locale?: string | null;
  decoration?: TextDecoration | null;
};

export const defaultTextComponent = (): TextComponentData => ({
  text: '',
  fontAssetId: '',
  fontSize: 14,
  color: Skia.Color('black'),
  align: TextAlign.Left,
  maxWidth: null,
  wrap: true,
  lineHeight: null,
  letterSpacing: null,
  strokeColor: null,
  strokeWidth: null,
  opacity: 1,
  zIndex: 0,
  isDirty: true,
  locale: null,
  decoration: null,
});

export function createTextComponent(
  partial?: Partial<TextComponentData>
): Component<TextComponentData> {
  return {
    name: TextComponentName,
    data: {
      ...defaultTextComponent(),
      ...partial,
      isDirty: true,
    },
  };
}
