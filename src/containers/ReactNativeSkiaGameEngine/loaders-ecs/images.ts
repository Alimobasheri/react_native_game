import { Skia, SkImage } from '@shopify/react-native-skia';
import { Image } from 'react-native';
import { runOnUI } from 'react-native-reanimated';

export type ImageAssetMap = Record<string, ReturnType<typeof require>>;

export type ImageCache = Record<string, SkImage>;

export const loadImagesOnUI = (
  loadedImages: Record<string, SkImage | null>
) => {
  'worklet';
  global._RNTGE_ = global._RNTGE_ || {};
  global._RNTGE_.imageCache = { ...global._RNTGE_.imageCache, ...loadedImages };
};

export const loadImageAssets = async (assets: ImageAssetMap) => {
  const imageEntries = await Promise.all(
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

  // Filter out any images that failed to load and create the cache record.
  const loadedImages: Record<string, SkImage | null> = Object.fromEntries(
    imageEntries.filter(([, image]) => image !== null)
  );

  runOnUI(loadImagesOnUI)(loadedImages);
};
