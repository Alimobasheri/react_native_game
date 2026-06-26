import { System } from '../../services-ecs/system';
import {
  Skia,
  SkPicture,
  SkPath,
  SkCanvas,
  PaintStyle,
  SkShader,
  BlendMode,
  TileMode,
  type SkImage,
} from '@shopify/react-native-skia';
import {
  RenderComponentData,
  RenderComponentName,
  RenderLayerData,
  RenderShapeCircle,
  RenderShapePolygon,
  RenderShapeRectangle,
  ImageShadowData,
  GooeyMergeFilterData,
} from '../components/render';
import {
  borderRadiusHasAny,
  clampBorderRadii,
  getRectangleBorderRadius,
  normalizeBorderRadius,
} from '../render/renderShapes';
import {
  buildChildImageShaders,
  buildUniformFloats,
  drawRuntimeEffectWithChildren,
} from '../render/renderShaderUniforms';
import {
  boundsFromShape,
  compareRenderQueue,
  computeDepthKey,
  resolveRenderLayer,
  type RenderQueueEntry,
} from '../render/renderSort';
import { ComponentStore } from '../../services-ecs';
import { MatterBodyComponentName } from '../components/matterBody';
import { IBodyDefinition } from 'matter-js';
import { Entity } from '../../services-ecs/entity';
import { SpriteComponentName } from '../components/sprite';
import { TextComponentData, TextComponentName } from '../components/text';
import { renderTextForEntity } from '../utils/textRenderer';
import { SceneComponentData, SceneComponentName } from '../components/scene';

type RenderShape =
  | RenderShapeRectangle
  | RenderShapeCircle
  | RenderShapePolygon;

type DrawableRenderData = {
  shape: RenderShape;
  fillColor?: string;
  strokeColor?: string;
  lineWidth?: number;
  opacity?: number;
  image?: string;
  sprite?: RenderComponentData['sprite'];
  blendMode?: BlendMode;
  imageShadow?: ImageShadowData;
};

const imageShadowBleedPadding = (shadow?: ImageShadowData): number => {
  'worklet';
  if (!shadow) {
    return 0;
  }
  return (
    shadow.blur * 3 +
    Math.abs(shadow.dx ?? 0) +
    Math.abs(shadow.dy ?? 0)
  );
};

const createGooeyImageFilter = (config: GooeyMergeFilterData) => {
  'worklet';
  const blur = Skia.ImageFilter.MakeBlur(
    config.blurSigma,
    config.blurSigma,
    TileMode.Decal,
    null
  );
  const colorFilter = Skia.ColorFilter.MakeMatrix([
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, config.alphaMultiplier, -config.alphaThreshold,
  ]);
  return Skia.ImageFilter.MakeColorFilter(colorFilter, blur);
};

const maxLayerShadowPadding = (layers: RenderLayerData[]): number => {
  'worklet';
  let pad = 0;
  for (let i = 0; i < layers.length; i++) {
    pad = Math.max(pad, imageShadowBleedPadding(layers[i].imageShadow));
  }
  return pad;
};

const drawImageRectWithShadow = (
  canvas: SkCanvas,
  image: any,
  sourceRect: ReturnType<typeof Skia.XYWHRect>,
  destRect: ReturnType<typeof Skia.XYWHRect>,
  paint: ReturnType<typeof Skia.Paint>,
  opacity: number | undefined,
  blendMode: BlendMode,
  shadow?: ImageShadowData
): void => {
  'worklet';
  if (!shadow) {
    canvas.drawImageRect(image, sourceRect, destRect, paint);
    return;
  }

  const dx = shadow.dx ?? 0;
  const dy = shadow.dy ?? 0;
  const sigma = shadow.blur;
  const shadowColor = Skia.Color(shadow.color);
  const shadowOnly = shadow.shadowOnly !== false;

  const shadowPaint = Skia.Paint();
  shadowPaint.setAntiAlias(true);
  shadowPaint.setBlendMode(blendMode);
  if (typeof opacity === 'number') {
    shadowPaint.setAlphaf(opacity);
  }

  const filter = shadowOnly
    ? Skia.ImageFilter.MakeDropShadowOnly(
        dx,
        dy,
        sigma,
        sigma,
        shadowColor,
        null
      )
    : Skia.ImageFilter.MakeDropShadow(
        dx,
        dy,
        sigma,
        sigma,
        shadowColor,
        null
      );
  shadowPaint.setImageFilter(filter);
  canvas.drawImageRect(image, sourceRect, destRect, shadowPaint);

  if (shadowOnly) {
    canvas.drawImageRect(image, sourceRect, destRect, paint);
  }
};

const addRoundedRectToPath = (
  skPath: SkPath,
  width: number,
  height: number,
  borderRadius: ReturnType<typeof normalizeBorderRadius>
): void => {
  'worklet';
  const radii = clampBorderRadii(width, height, borderRadius);
  const left = -width / 2;
  const top = -height / 2;
  const right = width / 2;
  const bottom = height / 2;
  const { tl, tr, br, bl } = radii;

  skPath.moveTo(left + tl, top);
  skPath.lineTo(right - tr, top);
  if (tr > 0) {
    skPath.arcToOval(
      Skia.XYWHRect(right - 2 * tr, top, 2 * tr, 2 * tr),
      270,
      90,
      false
    );
  }
  skPath.lineTo(right, bottom - br);
  if (br > 0) {
    skPath.arcToOval(
      Skia.XYWHRect(right - 2 * br, bottom - 2 * br, 2 * br, 2 * br),
      0,
      90,
      false
    );
  }
  skPath.lineTo(left + bl, bottom);
  if (bl > 0) {
    skPath.arcToOval(
      Skia.XYWHRect(left, bottom - 2 * bl, 2 * bl, 2 * bl),
      90,
      90,
      false
    );
  }
  skPath.lineTo(left, top + tl);
  if (tl > 0) {
    skPath.arcToOval(
      Skia.XYWHRect(left, top, 2 * tl, 2 * tl),
      180,
      90,
      false
    );
  }
  skPath.close();
};

const createPathFromShapeData = (shape: RenderShape): SkPath | null => {
  'worklet';
  const skPath = Skia.Path.Make();
  switch (shape.type) {
    case 'rectangle': {
      const { width, height } = shape;
      const borderRadius = getRectangleBorderRadius(shape);
      if (borderRadiusHasAny(borderRadius)) {
        addRoundedRectToPath(
          skPath,
          width,
          height,
          normalizeBorderRadius(borderRadius)
        );
      } else {
        skPath.addRect(Skia.XYWHRect(-width / 2, -height / 2, width, height));
      }
      break;
    }
    case 'circle': {
      skPath.addCircle(0, 0, shape.radius);
      break;
    }
    case 'polygon': {
      const { vertices } = shape;
      if (vertices.length > 0) {
        skPath.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
          skPath.lineTo(vertices[i].x, vertices[i].y);
        }
        skPath.close();
      }
      break;
    }
    default:
      return null;
  }
  return skPath;
};

const createPathFromShape = (
  renderData: RenderComponentData
): SkPath | null => {
  'worklet';
  return createPathFromShapeData(renderData.shape);
};

const collectShaderUniformValues = (
  uniforms: Record<string, number | number[]>
): number[] => {
  'worklet';
  const uniformValues: number[] = [];
  const uniformSources = Object.values(uniforms);

  for (const source of uniformSources) {
    const value = source;
    if (typeof value === 'number') {
      uniformValues.push(value > 1 ? value * 1.0 : value);
    } else {
      uniformValues.push(...value);
    }
  }

  return uniformValues;
};

const drawShaderPath = (
  canvas: SkCanvas,
  renderData: RenderComponentData,
  effect: ReturnType<typeof Skia.RuntimeEffect.Make>,
  path: SkPath
): void => {
  'worklet';
  const shaderPaint = Skia.Paint();
  shaderPaint.setAntiAlias(true);
  const uniformValues = collectShaderUniformValues(renderData.shader!.uniforms);
  const shader: SkShader = effect!.makeShader(uniformValues);
  shaderPaint.setStyle(PaintStyle.Fill);
  shaderPaint.setBlendMode(renderData.blendMode || BlendMode.SrcOver);
  shaderPaint.setShader(shader);
  if (typeof renderData.opacity === 'number') {
    shaderPaint.setAlphaf(renderData.opacity);
  }
  canvas.drawPath(path, shaderPaint);
  shaderPaint.dispose();
};

const drawCompositeShaderPath = (
  canvas: SkCanvas,
  renderData: RenderComponentData,
  effect: ReturnType<typeof Skia.RuntimeEffect.Make>,
  path: SkPath,
  imageCache: Record<string, SkImage | null>
): void => {
  'worklet';
  const composite = renderData.compositeShader;
  if (!composite || renderData.shape.type !== 'rectangle') {
    return;
  }

  const { width, height } = renderData.shape;
  const uniformValues = buildUniformFloats(
    composite.uniformKeys,
    composite.uniforms
  );
  const childShaders = buildChildImageShaders(
    composite.childImages,
    imageCache,
    width,
    height
  );

  if (childShaders.length === 0) {
    const bodyKey = composite.childImages[0]?.imageKey;
    const image = bodyKey ? imageCache[bodyKey] : null;
    if (image) {
      const destRect = Skia.XYWHRect(-width / 2, -height / 2, width, height);
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      canvas.drawImageRect(
        image,
        Skia.XYWHRect(0, 0, image.width(), image.height()),
        destRect,
        paint
      );
      paint.dispose();
    }
    return;
  }

  const shaderPaint = Skia.Paint();
  shaderPaint.setAntiAlias(true);
  let shader: SkShader;
  try {
    shader = drawRuntimeEffectWithChildren(
      effect!,
      uniformValues,
      childShaders
    );
  } catch {
    const bodyKey = composite.childImages[0]?.imageKey;
    const image = bodyKey ? imageCache[bodyKey] : null;
    if (!image) {
      return;
    }
    const destRect = Skia.XYWHRect(-width / 2, -height / 2, width, height);
    const fallbackPaint = Skia.Paint();
    fallbackPaint.setAntiAlias(true);
    canvas.drawImageRect(
      image,
      Skia.XYWHRect(0, 0, image.width(), image.height()),
      destRect,
      fallbackPaint
    );
    fallbackPaint.dispose();
    return;
  }
  shaderPaint.setStyle(PaintStyle.Fill);
  shaderPaint.setBlendMode(renderData.blendMode || BlendMode.SrcOver);
  shaderPaint.setShader(shader);
  if (typeof renderData.opacity === 'number') {
    shaderPaint.setAlphaf(renderData.opacity);
  }
  canvas.drawPath(path, shaderPaint);
  shaderPaint.dispose();
};

const createAndCacheStaticShaderPicture = (
  renderData: RenderComponentData,
  effect: ReturnType<typeof Skia.RuntimeEffect.Make>
): SkPicture | null => {
  'worklet';
  const path = createPathFromShape(renderData);
  if (!path || renderData.shape.type !== 'rectangle') {
    return null;
  }

  const { width, height } = renderData.shape;
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(
    Skia.XYWHRect(-width / 2, -height / 2, width, height)
  );
  drawShaderPath(canvas, renderData, effect, path);
  return recorder.finishRecordingAsPicture();
};

const getSpriteFrameInfo = (
  renderData: Pick<DrawableRenderData, 'sprite'>,
  spriteComponent?: any
): { sourceRect: any; width: number; height: number } | null => {
  'worklet';
  if (spriteComponent && spriteComponent.currentFrame !== undefined) {
    const currentFrame = spriteComponent.currentFrame || 0;

    if (spriteComponent.type === 'atlas') {
      const frameData = spriteComponent.frameData[currentFrame];
      if (frameData) {
        return {
          sourceRect: Skia.XYWHRect(
            frameData.x,
            frameData.y,
            frameData.width,
            frameData.height
          ),
          width: frameData.width,
          height: frameData.height,
        };
      }
    }

    if (spriteComponent.type === 'sprite') {
      const framesPerRow = spriteComponent.framesPerRow || 4;
      const frameWidth = spriteComponent.frameWidth || 64;
      const frameHeight = spriteComponent.frameHeight || 64;

      const row = Math.floor(currentFrame / framesPerRow);
      const col = currentFrame % framesPerRow;

      const sourceX = col * frameWidth;
      const sourceY = row * frameHeight;

      return {
        sourceRect: Skia.XYWHRect(sourceX, sourceY, frameWidth, frameHeight),
        width: frameWidth,
        height: frameHeight,
      };
    }
  }

  if (renderData.sprite) {
    const currentFrame = renderData.sprite.currentFrame || 0;
    const row = Math.floor(currentFrame / renderData.sprite.framesPerRow);
    const col = currentFrame % renderData.sprite.framesPerRow;

    const sourceX = col * renderData.sprite.frameWidth;
    const sourceY = row * renderData.sprite.frameHeight;

    return {
      sourceRect: Skia.XYWHRect(
        sourceX,
        sourceY,
        renderData.sprite.frameWidth,
        renderData.sprite.frameHeight
      ),
      width: renderData.sprite.frameWidth,
      height: renderData.sprite.frameHeight,
    };
  }

  return null;
};

const drawDrawableContent = (
  canvas: SkCanvas,
  drawData: DrawableRenderData,
  spriteComponent?: any
): void => {
  'worklet';
  const imageCache = global._RNTGE_.imageCache;

  if (drawData.image) {
    const image = imageCache[drawData.image];
    if (image) {
      let width = image.width();
      let height = image.height();
      let sourceRect = Skia.XYWHRect(0, 0, image.width(), image.height());

      const spriteFrameInfo = getSpriteFrameInfo(drawData, spriteComponent);

      if (spriteFrameInfo) {
        sourceRect = spriteFrameInfo.sourceRect;
        width = spriteFrameInfo.width;
        height = spriteFrameInfo.height;
      }

      if (drawData.shape.type === 'rectangle') {
        width = drawData.shape.width;
        height = drawData.shape.height;
      } else if (drawData.shape.type === 'circle') {
        width = drawData.shape.radius * 2;
        height = drawData.shape.radius * 2;
      }

      const destRect = Skia.XYWHRect(-width / 2, -height / 2, width, height);
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      const blendMode = drawData.blendMode || BlendMode.SrcOver;
      paint.setBlendMode(blendMode);
      if (typeof drawData.opacity === 'number') {
        paint.setAlphaf(drawData.opacity);
      }

      drawImageRectWithShadow(
        canvas,
        image,
        sourceRect,
        destRect,
        paint,
        drawData.opacity,
        blendMode,
        drawData.imageShadow
      );
    } else {
      const errorPaint = Skia.Paint();
      errorPaint.setColor(Skia.Color('magenta'));
      let size = 0;
      if (drawData.shape.type === 'rectangle') {
        size = Math.max(drawData.shape.width, drawData.shape.height);
      } else if (drawData.shape.type === 'circle') {
        size = drawData.shape.radius * 2;
      } else {
        size = 50;
      }
      canvas.drawRect(
        Skia.XYWHRect(-size / 2, -size / 2, size, size),
        errorPaint
      );
    }
    return;
  }

  const skPath = createPathFromShapeData(drawData.shape);

  if (skPath) {
    const fillPaint = Skia.Paint();
    fillPaint.setAntiAlias(true);
    fillPaint.setStyle(PaintStyle.Fill);
    fillPaint.setColor(Skia.Color(drawData.fillColor || '#0099ff'));
    fillPaint.setBlendMode(drawData.blendMode || BlendMode.SrcOver);
    if (typeof drawData.opacity === 'number') {
      fillPaint.setAlphaf(drawData.opacity);
    }
    canvas.drawPath(skPath, fillPaint);

    if (drawData.strokeColor) {
      const strokePaint = Skia.Paint();
      strokePaint.setStyle(PaintStyle.Stroke);
      strokePaint.setStrokeWidth(drawData.lineWidth || 1);
      strokePaint.setColor(Skia.Color(drawData.strokeColor || '#2E3440'));
      if (typeof drawData.opacity === 'number') {
        strokePaint.setAlphaf(drawData.opacity);
      }
      canvas.drawPath(skPath, strokePaint);
    }
  }
};

const drawLayerBacking = (canvas: SkCanvas, layer: RenderLayerData): void => {
  'worklet';
  const backing = layer.backing;
  if (!backing) {
    return;
  }

  drawDrawableContent(canvas, {
    shape: backing.shape ?? layer.shape,
    fillColor: backing.fillColor,
    opacity: backing.opacity,
    blendMode: layer.blendMode,
  });
};

const layerHasSpriteAnimation = (layer: RenderLayerData): boolean => {
  'worklet';
  return !!layer.sprite;
};

const groupHasSpriteAnimation = (renderData: RenderComponentData): boolean => {
  'worklet';
  const layers = renderData.renderLayers;
  if (!layers) return false;
  for (let i = 0; i < layers.length; i++) {
    if (layerHasSpriteAnimation(layers[i])) return true;
  }
  return false;
};

/** Procedural / clipped overlay layers must draw live every frame. */
const groupNeedsLiveLayerDraw = (renderData: RenderComponentData): boolean => {
  'worklet';
  const layers = renderData.renderLayers;
  if (!layers) return false;
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (layer.clipToGroupBounds === true) {
      return true;
    }
    if (layer.fillColor != null && layer.image == null) {
      return true;
    }
  }
  return false;
};

const drawGroupLayersToCanvas = (
  canvas: SkCanvas,
  renderData: RenderComponentData,
  spriteComponent?: unknown
): void => {
  'worklet';
  const layers = renderData.renderLayers;
  if (!layers || layers.length === 0) return;
  if (renderData.shape.type !== 'rectangle') return;

  const { width, height } = renderData.shape;
  const gooey = renderData.gooeyMerge;
  const gooeyPad = gooey ? Math.ceil(gooey.blurSigma * 3.5) : 0;
  const shadowPad = Math.max(maxLayerShadowPadding(layers), gooeyPad);
  const bounds = Skia.XYWHRect(
    -width / 2 - shadowPad,
    -height / 2 - shadowPad,
    width + shadowPad * 2,
    height + shadowPad * 2
  );

  if (gooey) {
    const layerPaint = Skia.Paint();
    layerPaint.setImageFilter(createGooeyImageFilter(gooey));
    canvas.saveLayer(layerPaint, bounds);
  }

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (layer.visible === false) continue;

    canvas.save();
    if (layer.clipToGroupBounds === true) {
      canvas.clipRect(
        Skia.XYWHRect(-width / 2, -height / 2, width, height),
        0,
        true
      );
    }
    const lx = layer.position?.x ?? 0;
    const ly = layer.position?.y ?? 0;
    canvas.translate(lx, ly);
    const layerSkewX = layer.skewX ?? 0;
    if (layerSkewX !== 0) {
      canvas.skew(layerSkewX, 0);
    }
    const layerAngle = layer.angle ?? 0;
    if (layerAngle !== 0) {
      canvas.rotate((layerAngle * 180) / Math.PI, 0, 0);
    }
    if (layer.backing) {
      drawLayerBacking(canvas, layer);
    }
    drawDrawableContent(canvas, layer, spriteComponent);
    canvas.restore();
  }

  if (gooey) {
    canvas.restore();
  }
};

const createAndCacheGroupPicture = (
  renderData: RenderComponentData,
  spriteComponent?: unknown
): SkPicture | null => {
  'worklet';
  const layers = renderData.renderLayers;
  if (!layers || layers.length === 0) return null;
  if (renderData.visible === false) return null;
  if (renderData.shape.type !== 'rectangle') return null;

  const { width, height } = renderData.shape;
  const gooey = renderData.gooeyMerge;
  const gooeyPad = gooey ? Math.ceil(gooey.blurSigma * 3.5) : 0;
  const shadowPad = Math.max(maxLayerShadowPadding(layers), gooeyPad);
  const bounds = Skia.XYWHRect(
    -width / 2 - shadowPad,
    -height / 2 - shadowPad,
    width + shadowPad * 2,
    height + shadowPad * 2
  );
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(bounds);

  drawGroupLayersToCanvas(canvas, renderData, spriteComponent);

  return recorder.finishRecordingAsPicture();
};

const createAndCacheEntityPicture = (
  components: Record<string, ComponentStore<any>>,
  entityId: Entity
): SkPicture | null => {
  'worklet';
  const renderData: RenderComponentData | undefined =
    components[RenderComponentName].get(entityId);
  const textComponent: TextComponentData | undefined =
    components[TextComponentName].get(entityId);

  if (!renderData || renderData.visible === false) {
    return null;
  }

  if (renderData.renderLayers != null) {
    const spriteComponent = components[SpriteComponentName]?.get(entityId);
    return createAndCacheGroupPicture(renderData, spriteComponent);
  }

  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording();

  if (textComponent) {
    const text = renderTextForEntity(
      canvas,
      entityId,
      renderData,
      textComponent
    );
    if (!text) return null;
  } else {
    const spriteComponent = components[SpriteComponentName]?.get(entityId);
    drawDrawableContent(canvas, renderData, spriteComponent);
  }

  return recorder.finishRecordingAsPicture();
};

export const renderSystem: System = {
  name: 'renderSystem',
  requiredComponents: [],
  process: ({ entities, components, eventQueue, deltaTime, ecs, dimensions }) => {
    'worklet';

    if (!global._RNTGE_.picture || !global._RNTGE_.pictureCache) {
      global._RNTGE_.picture = null;
      global._RNTGE_.pictureCache = {};
    }
    const pictureCache = global._RNTGE_.pictureCache;
    const shaderEffects = global._RNTGE_.shaderCache;

    const recorder = Skia.PictureRecorder();

    const bounds = Skia.XYWHRect(
      0,
      0,
      dimensions.value.width,
      dimensions.value.height
    );
    const canvas = recorder.beginRecording(bounds);

    const sceneStore = components[SceneComponentName];
    const renderStore = components[RenderComponentName];
    if (!sceneStore || !renderStore) {
      const newPicture = recorder.finishRecordingAsPicture();
      global._RNTGE_.picture = newPicture;
      return;
    }

    const sceneEntities = ecs.getEntitiesWithComponents([
      SceneComponentName,
    ]);

    const activeScenes: { sceneEntity: Entity; data: SceneComponentData }[] =
      [];
    for (let i = 0; i < sceneEntities.length; i++) {
      const sceneEntity = sceneEntities[i];
      const sceneData = sceneStore.get(sceneEntity) as
        | SceneComponentData
        | undefined;
      if (!sceneData) continue;
      if (sceneData.isActive === false) continue;
      if (sceneData.isPaused === true) continue;
      activeScenes.push({ sceneEntity, data: sceneData });
    }

    activeScenes.sort((a, b) => {
      if (a.data.zIndex !== b.data.zIndex)
        return a.data.zIndex - b.data.zIndex;
      return a.sceneEntity - b.sceneEntity;
    });

    for (let s = 0; s < activeScenes.length; s++) {
      const sceneData = activeScenes[s].data;
      const sceneEntityIds = sceneData.objects.entities;

      const renderQueue: RenderQueueEntry[] = [];

      for (let i = 0; i < sceneEntityIds.length; i++) {
        const entity = sceneEntityIds[i];
        const renderData = renderStore.get(entity) as
          | RenderComponentData
          | undefined;

        if (!renderData || renderData.visible === false) continue;

        const body: IBodyDefinition | undefined =
          components[MatterBodyComponentName]?.get(entity);
        const position = body?.position ||
          renderData.position || { x: 0, y: 0 };

        const bounds = boundsFromShape(renderData.shape);
        const transform = {
          x: position.x,
          y: position.y,
          angle: body?.angle ?? renderData.angle,
        };

        renderQueue.push({
          entity,
          renderLayer: resolveRenderLayer(renderData),
          depthKey: computeDepthKey(transform, bounds, renderData.sort),
          worldX: position.x,
          renderData,
        });
      }

      renderQueue.sort(compareRenderQueue);

      for (let i = 0; i < renderQueue.length; i++) {
        const entity = renderQueue[i].entity;
        const renderData = renderQueue[i].renderData as RenderComponentData;

        const body: IBodyDefinition | undefined =
          components[MatterBodyComponentName]?.get(entity);
        const position = body?.position ||
          renderData.position || { x: 0, y: 0 };
        const angle = body?.angle ?? renderData.angle ?? 0;

        const matrix = Skia.Matrix();
        matrix.translate(position.x, position.y);
        if (angle !== 0) {
          matrix.rotate(angle);
        }

        canvas.save();
        canvas.concat(matrix);

        const imageCache = global._RNTGE_.imageCache;
        const spriteComponent = components[SpriteComponentName]?.get(entity);

        if (renderData.compositeShader) {
          const effect = shaderEffects[renderData.compositeShader.key];
          const path = createPathFromShape(renderData);
          if (effect && path) {
            drawCompositeShaderPath(
              canvas,
              renderData,
              effect,
              path,
              imageCache
            );
            if (renderData.renderLayers && renderData.renderLayers.length > 0) {
              drawGroupLayersToCanvas(canvas, renderData, spriteComponent);
            }
          }
        } else if (renderData.shader && renderData.renderLayers == null) {
          const effect = shaderEffects[renderData.shader.key];
          if (effect) {
            if (renderData.shaderCacheStatic) {
              let entityPicture = pictureCache[entity] as SkPicture;
              if (renderData.isDirty || !entityPicture) {
                const newEntityPicture = createAndCacheStaticShaderPicture(
                  renderData,
                  effect
                );
                if (newEntityPicture) {
                  pictureCache[entity] = newEntityPicture;
                  entityPicture = newEntityPicture;
                }
              }
              if (entityPicture) {
                canvas.drawPicture(entityPicture);
              }
            } else {
              let path = pictureCache[entity] as SkPath;
              if (!path || renderData.isDirty) {
                path = createPathFromShape(renderData) as SkPath;
                pictureCache[entity] = path;
              }
              if (path) {
                drawShaderPath(canvas, renderData, effect, path);
              }
            }
          }
        } else {
          const hasSpriteAnimation =
            spriteComponent?.currentFrame !== undefined ||
            renderData.sprite ||
            groupHasSpriteAnimation(renderData);
          const drawProceduralLive = groupNeedsLiveLayerDraw(renderData);

          if (drawProceduralLive) {
            drawGroupLayersToCanvas(canvas, renderData, spriteComponent);
          } else {
            let entityPicture = pictureCache[entity] as SkPicture;

            if (renderData.isDirty || !entityPicture || hasSpriteAnimation) {
              const newEntityPicture = createAndCacheEntityPicture(
                components,
                entity
              );
              if (newEntityPicture) {
                pictureCache[entity] = newEntityPicture;
                entityPicture = newEntityPicture;
              }
            }

            if (entityPicture) {
              canvas.drawPicture(entityPicture);
            }
          }
        }

        canvas.restore();
        renderData.isDirty = false;
      }
    }

    const newPicture = recorder.finishRecordingAsPicture();
    global._RNTGE_.picture = newPicture;
  }
};
