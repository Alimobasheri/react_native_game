import { ScreenTopUI } from "@/Game/Entities/ScreenTopUI/ScreenTopUI";
import { EntityRendererProps } from "@/constants/views";
import {
  Group,
  Image,
  Text,
  useImage,
  Rect,
  Skia,
  FontStyle,
  useFont,
  Path,
  LinearGradient,
  vec,
  SkPath,
  TileMode,
} from "@shopify/react-native-skia";
import { FC } from "react";
import { Platform, useWindowDimensions } from "react-native";

export const TopUIView: FC<EntityRendererProps<ScreenTopUI>> = ({
  entity: { coinsCount, boatsDestroyed },
}) => {
  const { width, height } = useWindowDimensions();
  const font = useFont(
    require("../../../assets/fonts/Montserrat-SemiBold.ttf"),
    36
  );
  const coinSize = [30, 30];
  const coinPosition = { x: width - coinSize[0] * 2, y: coinSize[1] };
  const coinImage = useImage(require("../../../assets/coin_icon.png"));
  const destroyedBoatSize = [30, 30];
  const destroyedBoatPosition = {
    x: width / 2 - destroyedBoatSize[0],
    y: destroyedBoatSize[1],
  };
  const destroyedBoatImage = useImage(
    require("../../../assets/destroyed_boat_icon.png")
  );

  const gradientShader = Skia.Shader.MakeLinearGradient(
    { x: width / 2 - destroyedBoatSize[0] / 2 - 100, y: destroyedBoatSize[1] },
    { x: width / 2 + destroyedBoatSize[0] / 2 + 100, y: destroyedBoatSize[1] },
    [Skia.Color("white"), Skia.Color("silver")],
    null,
    TileMode.Clamp
  );

  if (!coinImage || !destroyedBoatImage || !font) return null;

  const coinsPath = Skia.Path.MakeFromText(
    coinsCount.toString(),
    coinPosition.x - coinSize[0] / 2 - 36,
    coinPosition.y + coinSize[1] / 2 - 2,
    font
  ) as SkPath;

  const boatsPath = Skia.Path.MakeFromText(
    boatsDestroyed.toString(),
    destroyedBoatPosition.x - destroyedBoatSize[0] / 2,
    destroyedBoatPosition.y + destroyedBoatSize[1] / 2 - 2,
    font
  ) as SkPath;

  const paint = Skia.Paint();
  paint.setShader(gradientShader);

  return (
    <Group>
      {/* <Image
        image={coinImage}
        x={coinPosition.x - coinSize[0] / 2}
        y={coinPosition.y - coinSize[1] / 2}
        width={coinSize[0]}
        height={coinSize[1]}
      />
      <Path path={coinsPath} paint={paint} /> */}
      <Path path={boatsPath} paint={paint} />
    </Group>
  );
};
