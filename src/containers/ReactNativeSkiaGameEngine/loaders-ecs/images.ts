import { Skia, SkImage } from '@shopify/react-native-skia';
import { Image, Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { resolveBundledAssetBytes } from './bundledAssetBytes';

export type ImageAssetMap = Record<string, ReturnType<typeof require>>;

/** Bytes for native UI-thread decode. */
export type LoadedImageBytes = {
  kind: 'bytes';
  bytes: Uint8Array;
};

/**
 * Web: image was decoded on JS and parked in `webImageStaging`.
 * The worklet reads it by name — do not put SkImage in the event payload.
 */
export type LoadedImageStaged = {
  kind: 'staged';
};

export type LoadedImagePayload = LoadedImageBytes | LoadedImageStaged;

export type LoadedImage = {
  type: 'image';
  name: string;
  data: LoadedImagePayload | null;
};

/**
 * Same-heap staging for web. Worklets on web share the JS heap, so the UI-thread
 * preload system can pull SkImages from here without scheduleOnUI serialization.
 */
export const webImageStaging: Map<string, SkImage> = new Map();

const isWebRuntime = (): boolean => {
  return (
    Platform.OS === 'web' ||
    (typeof document !== 'undefined' && typeof window !== 'undefined')
  );
};

/** Decode on the worklet thread — used on native where SkImage must not cross runtimes. */
export const createImageFromBytesOnUI = (
  bytes: Uint8Array
): SkImage | null => {
  'worklet';
  try {
    // Prefer a real Uint8Array — serialization can turn views into plain objects.
    const view =
      bytes instanceof Uint8Array
        ? bytes
        : new Uint8Array(Object.values(bytes as unknown as Record<string, number>));
    const imageData = Skia.Data.fromBytes(view);
    if (!imageData) {
      return null;
    }
    return Skia.Image.MakeImageFromEncoded(imageData);
  } catch (error) {
    console.warn('[RNTGE][imageLoader] UI-thread decode failed', error);
    return null;
  }
};

export const takeStagedWebImage = (name: string): SkImage | null => {
  'worklet';
  const image = webImageStaging.get(name) ?? null;
  if (image) {
    webImageStaging.delete(name);
  }
  return image;
};

async function resolveAssetUris(
  assetSource: ReturnType<typeof require>
): Promise<string[]> {
  const uris: string[] = [];

  try {
    const resolved = Image.resolveAssetSource(
      assetSource as Parameters<typeof Image.resolveAssetSource>[0]
    );
    if (resolved?.uri) {
      uris.push(resolved.uri);
    }
  } catch {
    // ignore
  }

  if (typeof assetSource === 'number') {
    try {
      const asset = Asset.fromModule(assetSource);
      if (asset.uri) {
        uris.push(asset.uri);
      }
      if (!asset.downloaded) {
        try {
          await asset.downloadAsync();
        } catch (error) {
          console.warn(
            '[RNTGE][imageLoader] Asset.downloadAsync failed',
            assetSource,
            error
          );
        }
      }
      if (asset.localUri) {
        uris.push(asset.localUri);
      }
      if (asset.uri) {
        uris.push(asset.uri);
      }
    } catch (error) {
      console.warn(
        '[RNTGE][imageLoader] Asset.fromModule failed',
        assetSource,
        error
      );
    }

    try {
      // Metro asset registry path (same approach Skia Platform.web uses)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getAssetByID } = require('react-native/Libraries/Image/AssetRegistry');
      const meta = getAssetByID(assetSource);
      if (meta?.httpServerLocation && meta?.name && meta?.type) {
        uris.push(`${meta.httpServerLocation}/${meta.name}.${meta.type}`);
      }
    } catch {
      // ignore
    }
  } else if (
    assetSource &&
    typeof assetSource === 'object' &&
    'uri' in (assetSource as object)
  ) {
    const uri = (assetSource as { uri?: string }).uri;
    if (uri) {
      uris.push(uri);
    }
  } else if (typeof assetSource === 'string') {
    uris.push(assetSource);
  }

  return [...new Set(uris.filter(Boolean))];
}

/**
 * Decode with browser codecs, then COPY pixels via HTMLCanvasElement so
 * PictureRecorder can draw without relying on lazy WebGL texture sources.
 */
async function decodeImageWithBrowser(uri: string): Promise<SkImage | null> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`fetch ${response.status} for ${uri}`);
  }
  const blob = await response.blob();

  let source: ImageBitmap | HTMLImageElement;
  if (typeof createImageBitmap === 'function') {
    source = await createImageBitmap(blob);
  } else {
    const objectUrl = URL.createObjectURL(blob);
    try {
      source = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new window.Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error(`HTMLImageElement failed: ${uri}`));
        el.crossOrigin = 'anonymous';
        el.src = objectUrl;
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  const width =
    'width' in source ? source.width : (source as HTMLImageElement).naturalWidth;
  const height =
    'height' in source
      ? source.height
      : (source as HTMLImageElement).naturalHeight;

  if (!width || !height) {
    throw new Error(`decoded image has zero size: ${uri}`);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2d canvas context unavailable');
  }
  ctx.drawImage(source, 0, 0);
  if (typeof (source as ImageBitmap).close === 'function') {
    (source as ImageBitmap).close();
  }

  // HTMLCanvasElement → MakeImageFromCanvasImageSource (pixel copy, PictureRecorder-safe)
  const image = Skia.Image.MakeImageFromNativeBuffer(canvas);
  if (!image) {
    throw new Error(`MakeImageFromNativeBuffer returned null for ${uri}`);
  }
  return image;
}

async function decodeImageFromEncodedBytes(
  bytes: Uint8Array
): Promise<SkImage | null> {
  try {
    const data = Skia.Data.fromBytes(bytes);
    if (!data) {
      return null;
    }
    return Skia.Image.MakeImageFromEncoded(data);
  } catch {
    return null;
  }
}

export const loadImageAssets = async (
  assets: ImageAssetMap
): Promise<LoadedImage[]> => {
  const web = isWebRuntime();

  const imageEntries = await Promise.allSettled(
    Object.entries(assets).map(async ([key, assetSource]) => {
      if (web) {
        const uris = await resolveAssetUris(assetSource);
        if (uris.length === 0) {
          console.warn(
            '[RNTGE][imageLoader] no URI for',
            key,
            'source=',
            assetSource
          );
          return [key, null] as const;
        }

        let lastError: unknown = null;
        for (const uri of uris) {
          try {
            const image = await decodeImageWithBrowser(uri);
            if (image) {
              webImageStaging.set(key, image);
              return [key, { kind: 'staged' as const }] as const;
            }
          } catch (error) {
            lastError = error;
          }

          // Fallback: CanvasKit codec on fetched bytes (PNG/JPEG; WebP may fail)
          try {
            const response = await fetch(uri);
            if (response.ok) {
              const bytes = new Uint8Array(await response.arrayBuffer());
              const encoded = await decodeImageFromEncodedBytes(bytes);
              if (encoded) {
                webImageStaging.set(key, encoded);
                return [key, { kind: 'staged' as const }] as const;
              }
            }
          } catch (error) {
            lastError = error;
          }
        }

        console.warn(
          '[RNTGE][imageLoader] all decode paths failed for',
          key,
          'uris=',
          uris,
          'lastError=',
          lastError
        );
        return [key, null] as const;
      }

      let bytes: Uint8Array | null = null;
      if (typeof assetSource === 'number') {
        bytes = await resolveBundledAssetBytes(assetSource);
      } else {
        const source = Image.resolveAssetSource(
          assetSource as Parameters<typeof Image.resolveAssetSource>[0]
        );
        if (source?.uri) {
          const response = await fetch(source.uri);
          if (response.ok) {
            bytes = new Uint8Array(await response.arrayBuffer());
          }
        }
      }

      if (!bytes) {
        console.warn('[RNTGE][imageLoader] no bytes for', key);
        return [key, null] as const;
      }
      return [key, { kind: 'bytes' as const, bytes }] as const;
    })
  );

  return imageEntries.map((result, index) => {
    if (result.status === 'fulfilled') {
      const [name, data] = result.value;
      return { type: 'image' as const, name, data };
    }
    const name = Object.keys(assets)[index];
    console.warn(
      '[RNTGE][imageLoader] asset promise rejected:',
      name,
      result.reason
    );
    return { type: 'image' as const, name, data: null };
  });
};
