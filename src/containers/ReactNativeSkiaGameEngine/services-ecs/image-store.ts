import { Skia, SkImage } from '@shopify/react-native-skia';
import { Image } from 'react-native';
import { makeMutable, SharedValue } from 'react-native-reanimated';

export type ImageAssetMap = Record<string, ReturnType<typeof require>>;

// The cache will hold SkImage objects, accessible from the UI thread.
export type ImageCache = Record<string, SkImage>;

/**
 * Loads a map of image assets required by the game.
 * This function is asynchronous and should be called during your app's setup phase.
 *
 * @param assets - A map where keys are string identifiers and values are `require('path/to/asset')`.
 * @param cb - A callback function that receives the loaded image cache wrapped in a SharedValue.
 */
export const loadImageAssets = async (
  assets: ImageAssetMap,
  cb: (imageCache: ImageCache) => void = () => {}
) => {
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
  const loadedImages = Object.fromEntries(
    imageEntries.filter(([, image]) => image !== null)
  );

  // Return the cache wrapped in a SharedValue.
  cb(loadedImages);
};
