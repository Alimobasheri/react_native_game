import { useCanvasDimensions } from "@/containers/ReactNativeSkiaGameEngine";
import { Rect, Skia, TileMode } from "@shopify/react-native-skia";
import { useWindowDimensions } from "react-native";

export const SkyBackground = () => {
  const { width: windowWidth, height: windowHeight } = useCanvasDimensions();
  const paint = Skia.Paint();

  // Colors for the gradient
  // const colors = [
  //   "#0000FF", // Blue
  //   "#0044FF",
  //   "#0088FF",
  //   "#00CCFF",
  //   "#00FFFF",
  //   "#00FFCC",
  //   "#00FF88",
  //   "#00FF44",
  //   "#00FF00", // Very bright green
  // ];

  // const colors = [
  //   "#87CEEB", // Light blue
  //   "#ADD8E6",
  //   "#B0E0E6",
  //   "#AFEEEE",
  //   "#E0FFFF",
  //   "#E0FFD1",
  //   "#F0E68C",
  //   "#FFFFE0",
  //   "#FFFFF0", // Very light green/yellow
  // ];

  const colors = [
    "#0A0A23",
    "#0B0B2A",
    "#0D0E34",
    "#10113D",
    "#131448",
    "#171955",
    "#1A1D62",
    "#1E226F",
    "#22277D",
    "#262C8C",
    "#2A319B",
    "#2E36AB",
    "#323BBA",
    "#3741CA",
    "#3C46DA",
    "#414BEB",
    "#4650FC",
  ];

  // Define the positions for each color
  const positions = colors.map((_, index) => index / (colors.length - 1));

  // Create the linear gradient
  const gradient = Skia.Shader.MakeLinearGradient(
    { x: 0, y: 0 },
    { x: 0, y: windowHeight * 0.7 },
    colors.map((col) => Skia.Color(col)),
    positions,
    TileMode.Clamp
  );

  // Apply the gradient to the paint
  paint.setShader(gradient);
  return (
    <Rect
      x={0}
      y={0}
      width={windowWidth}
      height={windowHeight}
      paint={paint}
    ></Rect>
  );
};
