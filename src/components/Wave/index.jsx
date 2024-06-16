import { Path } from "@shopify/react-native-skia";
import { Skia } from "@shopify/react-native-skia";
// Renderer for waves
export const WaveRenderer = ({
  waves,
  windowWidth,
  windowHeight,
  waterSurfaceY,
}) => {
  const combinedWavePath = Skia.Path.Make();
  combinedWavePath.moveTo(0, waterSurfaceY); // Start the path at the left edge of the screen

  for (let i = 0; i <= windowWidth; i++) {
    let combinedY = waterSurfaceY;
    waves.forEach((wave) => {
      const distance = i - wave.x;
      const decayFactor = Math.exp(-0.01 * Math.abs(distance));
      const waveContribution =
        wave.amplitude *
        decayFactor *
        Math.sin(distance * wave.frequency + wave.phase);
      combinedY += waveContribution;
    });
    combinedWavePath.lineTo(i, combinedY); // Add a line segment to the path for each point
  }

  combinedWavePath.lineTo(windowWidth, windowHeight);
  combinedWavePath.lineTo(0, windowHeight);
  combinedWavePath.lineTo(0, waterSurfaceY);

  return (
    <Path path={combinedWavePath} color="rgba(0, 0, 0, 0.5)" style={"fill"} />
  );
};
