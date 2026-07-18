import { Asset } from 'expo-asset';

/**
 * Resolve a Metro `require(...)` module id to raw bytes.
 * Uses expo-asset so bundled fonts/images work on web (where numeric asset ids
 * are not directly loadable via Image.resolveAssetSource alone).
 */
export async function resolveBundledAssetBytes(
  resource: number
): Promise<Uint8Array | null> {
  try {
    const asset = Asset.fromModule(resource);
    if (!asset.downloaded) {
      await asset.downloadAsync();
    }
    const uri = asset.localUri ?? asset.uri;
    if (!uri) {
      return null;
    }
    const response = await fetch(uri);
    if (!response.ok) {
      console.warn(
        `[RNTGE] Failed to fetch bundled asset (${response.status}): ${uri}`
      );
      return null;
    }
    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    console.warn('[RNTGE] resolveBundledAssetBytes failed', error);
    return null;
  }
}
