import { SkPaint } from "@shopify/react-native-skia";

export type CloudsConfig = {
  screenWidth: number;
  screenHeight: number;
};

export type Cloud = {
  id: number | string;
  x: number;
  y: number;
  width: number;
  height: number;
  paint: SkPaint;
};
