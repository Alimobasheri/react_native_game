import { Skia, SkTypeface } from '@shopify/react-native-skia';
import { runOnUI } from 'react-native-reanimated';

type FontAsset = {
  type: 'font';
  id: string;
  resource?: number; // require(...) bundled resource number
  family?: string;
};

export type FontDataSource = {
  id: string;
  family: string;
  base64: {
    bytes?: Uint8Array;
  };
};

export type LoadedTypeface = {
  typeface: SkTypeface;
  family: string;
};

export type LoadedFontSources = {
  type: 'font';
  name: string;
  data: FontDataSource;
};

export type LoadedFont = {
  type: 'font';
  name: string;
  data: LoadedTypeface;
};

export const createTypefaceOnUI = (
  id: string,
  family: string,
  base64: {
    bytes?: Uint8Array;
  }
) => {
  'worklet';
  try {
    let skData = null;
    if (base64.bytes) {
      // create Data from bytes (bundle require)
      skData = Skia.Data.fromBytes(base64.bytes);
    }
    if (!skData) {
      console.log(
        '[RNTGE][fontLoader] Could not create Skia.Data for font',
        id
      );
      return null;
    }
    let typeface = null;
    try {
      if (Skia.Typeface && Skia.Typeface.MakeFreeTypeFaceFromData) {
        typeface = Skia.Typeface.MakeFreeTypeFaceFromData(skData);
      } else if (Skia.Font && typeof Skia.Font === 'function') {
        typeface = null;
      }
    } catch (err) {
      console.log(
        '[RNTGE][fontLoader] Creating typeface failed, will fallback to family name',
        err
      );
      typeface = null;
    }
    if (!typeface) return null;
    return {
      typeface,
      family: family,
    };
  } catch (err) {
    console.log('[RNTGE][fontLoader] UI-thread createTypeface error', err);
    return null;
  }
};

export const createTypefacesOnUI = async (sources: FontDataSource[]) => {
  'worklet';
  const loadedTypefaces: Record<string, LoadedTypeface> = {};

  for (const source of sources) {
    const loadedTypeface = await createTypefaceOnUI(
      source.id,
      source.family,
      source.base64
    );
    if (loadedTypeface !== null) loadedTypefaces[source.id] = loadedTypeface;
  }

  return loadedTypefaces;
};

/**
 * Main Thread: Loads font assets, converting bundled resources to bytes,
 * and then sends the data sources to the UI thread.
 */
export async function loadFontAssets(
  assets: FontAsset[]
): Promise<LoadedFontSources[]> {
  // Use 'sources' for the list of data to be sent to the UI thread
  const sources: FontDataSource[] = [];

  for (const asset of assets) {
    const id = asset.id;
    try {
      if (asset.resource) {
        // --- NEW LOGIC: Convert bundled resource URI to bytes on JS thread ---
        try {
          // 1. Resolve asset to get its local URI
          const resolved = require('react-native').Image.resolveAssetSource(
            asset.resource
          );
          const uri = resolved?.uri;

          if (uri) {
            // 2. Fetch the content from the asset URI
            const response = await fetch(uri);
            const arrayBuffer = await response.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer); // Convert to Uint8Array

            // 3. Push to sources using 'bytes' instead of 'uri'
            sources.push({
              id,
              family: asset.family || '',
              base64: { bytes },
            });
            continue; // Continue to next asset
          }
        } catch (err) {
          console.warn(
            '[RNTGE][fontLoader] Resource fetch failed; falling back to checking asset.uri',
            err
          );
        }
      }

      console.warn(
        '[RNTGE][fontLoader] No valid uri or resource found for font asset:',
        id
      );
    } catch (e) {
      console.error('[RNTGE][fontLoader] Error processing font asset', id, e);
    }
  }

  return sources.map((source) => ({
    type: 'font',
    name: source.id,
    data: source,
  }));
}
