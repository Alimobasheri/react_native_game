import { Skia, SkImage } from '@shopify/react-native-skia';
import { Image } from 'react-native';
import { runOnUI } from 'react-native-reanimated';

export type ImageAssetMap = Record<string, ReturnType<typeof require>>;

export type LoadedImage = {
  type: 'image';
  name: string;
  data: SkImage | null;
};

export const loadImageAssets = async (
  assets: ImageAssetMap
): Promise<LoadedImage[]> => {
  const imageEntries = await Promise.allSettled(
    Object.entries(assets).map(async ([key, assetSource]) => {
      // Resolve the asset source to a URI that Skia can load.
      const source = Image.resolveAssetSource(assetSource);
      if (!source) {
        return [key, null];
      }
      // Load the image data from the URI asynchronously.
      const imageData = await Skia.Data.fromURI(source.uri);
      if (!imageData) {
        return [key, null];
      }
      // Decode the data into an SkImage.
      const image = Skia.Image.MakeImageFromEncoded(imageData);
      if (!image) {
        return [key, null];
      }
      return [key, image];
    })
  );

  // Map all results (fulfilled and rejected) into the LoadedImage structure.
  const loadedImages: LoadedImage[] = imageEntries.map((result, index) => {
    if (result.status === 'fulfilled') {
      const [name, data] = result.value as [string, SkImage | null];
      return {
        type: 'image',
        name,
        data: data as SkImage | null,
      };
    } else {
      const name = Object.keys(assets)[index];
      return {
        type: 'image',
        name,
        data: null,
      };
    }
  });

  return loadedImages;
};
