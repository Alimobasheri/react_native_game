import { Skia } from '@shopify/react-native-skia';
import { runOnUI } from 'react-native-reanimated';

type FontAsset = {
  type: 'font';
  id: string;
  uri?: string; // remote or file:// or asset URI string
  resource?: number; // require(...) bundled resource number
  family?: string;
};

export type FontDataSource = {
  id: string;
  family: string;
  dataBase64OrUri: {
    uri?: string;
    bytes?: Uint8Array;
  };
};

const createTypefaceOnUI = async (
  id: string,
  family: string,
  dataBase64OrUri: {
    uri?: string;
    bytes?: Uint8Array;
  }
) => {
  'worklet';
  if (global._RNTGE_.fontCache[id]) return global._RNTGE_.fontCache[id];

  try {
    let skData = null;
    if (dataBase64OrUri.bytes) {
      // create Data from bytes (bundle require)
      skData = Skia.Data.fromBytes(dataBase64OrUri.bytes);
    } else if (dataBase64OrUri.uri) {
      skData = await Skia.Data.fromURI(dataBase64OrUri.uri);
    }
    if (!skData) {
      console.log(
        '[RNTGE][fontLoader] Could not create Skia.Data for font',
        id
      );
      return null;
    }
    // ADJUST HERE: create typeface. API may be Skia.Typeface.Make or Skia.FontMgr.MakeTypeface
    let typeface = null;
    try {
      // Try different fallbacks depending on RN-Skia version
      if (Skia.Typeface && Skia.Typeface.MakeFreeTypeFaceFromData) {
        typeface = Skia.Typeface.MakeFreeTypeFaceFromData(skData);
      } else if (Skia.Font && typeof Skia.Font === 'function') {
        // less likely; rely on family string fallback
        typeface = null;
      }
    } catch (err) {
      console.log(
        '[RNTGE][fontLoader] Creating typeface failed, will fallback to family name',
        err
      );
      typeface = null;
    }

    // Save into global cache
    global._RNTGE_.fontCache[id] = {
      typeface,
      family: family,
    };
    return global._RNTGE_.fontCache[id];
  } catch (err) {
    console.log('[RNTGE][fontLoader] UI-thread createTypeface error', err);
    return null;
  }
};

const createTypefacesOnUI = async (sources: FontDataSource[]) => {
  'worklet';
  global._RNTGE_ = global._RNTGE_ || {};
  global._RNTGE_.fontCache = global._RNTGE_.fontCache || {};

  for (const source of sources) {
    await createTypefaceOnUI(source.id, source.family, source.dataBase64OrUri);
  }
};

/**
 * Main Thread: Loads font assets, converting bundled resources to bytes,
 * and then sends the data sources to the UI thread.
 */
export async function loadFontAssets(assets: FontAsset[]) {
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
              dataBase64OrUri: { bytes },
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

      if (asset.uri) {
        // --- Existing Logic: Use URI for external/remote files ---
        sources.push({
          id,
          family: asset.family || '',
          dataBase64OrUri: { uri: asset.uri },
        });
        continue;
      }

      console.warn(
        '[RNTGE][fontLoader] No valid uri or resource found for font asset:',
        id
      );
    } catch (e) {
      console.error('[RNTGE][fontLoader] Error processing font asset', id, e);
    }
  }

  runOnUI(createTypefacesOnUI)(sources);
}
