import { Group, Picture, Skia, SkPicture } from '@shopify/react-native-skia';
import { FC } from 'react';
import {
  makeMutable,
  SharedValue,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

export const RenderEntities: FC = () => {
  const tick = useSharedValue(0);
  useFrameCallback(() => {
    'worklet';
    tick.value++;
  });
  const picture = useDerivedValue<SkPicture>(() => {
    tick.value;
    let picture = global?._RNTGE_?.picture;
    if (!picture) {
      const pictureRecorder = Skia.PictureRecorder();
      pictureRecorder.beginRecording(Skia.XYWHRect(0, 0, 0, 0));
      picture = pictureRecorder.finishRecordingAsPicture();
    }
    return picture;
  });
  return (
    <Group>
      <Picture picture={picture} />
    </Group>
  );
};
