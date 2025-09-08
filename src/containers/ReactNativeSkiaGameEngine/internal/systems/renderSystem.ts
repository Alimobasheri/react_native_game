import { System } from '../../services-ecs/system';
import {
  Skia,
  SkPicture,
  SkPath,
  PaintStyle,
  SkImage,
  SkRuntimeEffect,
  SkShader,
  BlendMode,
} from '@shopify/react-native-skia';
import { RenderComponentData, RenderComponentName } from '../components/render';
import { SharedValue } from 'react-native-reanimated';
import { ComponentStore } from '../../services-ecs';
import { MatterBodyComponentName } from '../components/matterBody';
import { IBodyDefinition } from 'matter-js';
import { Entity } from '../../services-ecs/entity';

const createPathFromShape = (
  renderData: RenderComponentData
): SkPath | null => {
  'worklet';
  const skPath = Skia.Path.Make();
  switch (renderData.shape.type) {
    case 'rectangle': {
      const { width, height } = renderData.shape;
      skPath.addRect(Skia.XYWHRect(-width / 2, -height / 2, width, height));
      break;
    }
    case 'circle': {
      skPath.addCircle(0, 0, renderData.shape.radius);
      break;
    }
    case 'polygon': {
      const { vertices } = renderData.shape;
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

const updateSpriteAnimation = (
  renderData: RenderComponentData,
  deltaTime: number
): void => {
  'worklet';
  if (!renderData.sprite) return;

  const currentTime = Date.now();
  if (renderData.sprite.lastFrameTime === undefined) {
    renderData.sprite.lastFrameTime = currentTime;
    renderData.sprite.currentFrame = 0;
    return;
  }

  const elapsed = currentTime - renderData.sprite.lastFrameTime;
  if (elapsed >= renderData.sprite.frameDuration) {
    const nextFrame = (renderData.sprite.currentFrame || 0) + 1;
    if (nextFrame >= renderData.sprite.totalFrames) {
      renderData.sprite.currentFrame = renderData.sprite.loop
        ? 0
        : renderData.sprite.totalFrames - 1;
    } else {
      renderData.sprite.currentFrame = nextFrame;
    }
    renderData.sprite.lastFrameTime = currentTime;
    renderData.isDirty = true; // Force re-render when frame changes
  }
};

const createAndCacheEntityPicture = (
  components: Record<string, ComponentStore<any>>,
  entityId: Entity,
  imageCache: SharedValue<Record<string, SkImage>>,
  deltaTime?: number
): SkPicture | null => {
  'worklet';
  const renderData: RenderComponentData | undefined =
    components[RenderComponentName].get(entityId);

  if (!renderData || renderData.visible === false) {
    return null;
  }

  // Update sprite animation if present
  if (renderData.sprite && deltaTime !== undefined) {
    updateSpriteAnimation(renderData, deltaTime);
  }

  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording();

  if (renderData.image) {
    let image = imageCache.value[renderData.image];
    if (image) {
      let width = image.width();
      let height = image.height();
      let sourceRect = Skia.XYWHRect(0, 0, image.width(), image.height());

      // Handle sprite rendering
      if (renderData.sprite) {
        const currentFrame = renderData.sprite.currentFrame || 0;
        const row = Math.floor(currentFrame / renderData.sprite.framesPerRow);
        const col = currentFrame % renderData.sprite.framesPerRow;

        const sourceX = col * renderData.sprite.frameWidth;
        const sourceY = row * renderData.sprite.frameHeight;

        sourceRect = Skia.XYWHRect(
          sourceX,
          sourceY,
          renderData.sprite.frameWidth,
          renderData.sprite.frameHeight
        );

        width = renderData.sprite.frameWidth;
        height = renderData.sprite.frameHeight;
      }

      // Override dimensions based on shape if specified
      if (renderData.shape.type === 'rectangle') {
        width = renderData.shape.width;
        height = renderData.shape.height;
      } else if (renderData.shape.type === 'circle') {
        width = renderData.shape.radius * 2;
        height = renderData.shape.radius * 2;
      }

      const destRect = Skia.XYWHRect(-width / 2, -height / 2, width, height);
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      if (renderData.opacity) {
        paint.setAlphaf(renderData.opacity);
      }

      canvas.drawImageRect(image, sourceRect, destRect, paint);
    } else {
      const errorPaint = Skia.Paint();
      errorPaint.setColor(Skia.Color('magenta'));
      let size = 0;
      if (renderData.shape.type === 'rectangle') {
        size = Math.max(renderData.shape.width, renderData.shape.height);
      } else if (renderData.shape.type === 'circle') {
        size = renderData.shape.radius * 2;
      } else {
        size = 50;
      }
      canvas.drawRect(
        Skia.XYWHRect(-size / 2, -size / 2, size, size),
        errorPaint
      );
    }
  } else {
    const skPath = createPathFromShape(renderData);

    if (skPath) {
      const fillPaint = Skia.Paint();
      fillPaint.setAntiAlias(true);
      fillPaint.setStyle(PaintStyle.Fill);
      fillPaint.setColor(Skia.Color(renderData.fillColor || '#0099ff'));
      if (renderData.opacity) {
        fillPaint.setAlphaf(renderData.opacity);
      }
      canvas.drawPath(skPath, fillPaint);

      if (renderData.strokeColor) {
        const strokePaint = Skia.Paint();
        strokePaint.setStyle(PaintStyle.Stroke);
        strokePaint.setStrokeWidth(renderData.lineWidth || 1);
        strokePaint.setColor(Skia.Color(renderData.strokeColor || '#2E3440'));
        if (renderData.opacity) {
          strokePaint.setAlphaf(renderData.opacity);
        }
        canvas.drawPath(skPath, strokePaint);
      }
    }
  }

  return recorder.finishRecordingAsPicture();
};

export const renderSystem = (
  picture: SharedValue<SkPicture | null>,
  dimensions: SharedValue<{ width: number; height: number }>,
  pictureCache: SharedValue<Record<number, SkPicture | SkPath>>,
  imageCache: SharedValue<Record<string, SkImage>>,
  shaderEffects: SharedValue<Record<string, SkRuntimeEffect>>
): System => {
  'worklet';
  return {
    requiredComponents: [RenderComponentName],
    process: (entities, components, eventQueue, deltaTime, ecs) => {
      'worklet';

      const recorder = Skia.PictureRecorder();
      const bounds = Skia.XYWHRect(
        0,
        0,
        dimensions.value.width,
        dimensions.value.height
      );
      const canvas = recorder.beginRecording(bounds);

      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const renderData: RenderComponentData =
          components[RenderComponentName].get(entity);

        if (!renderData || renderData.visible === false) continue;

        // --- START OF REFACTORED CODE ---

        // 1. Universal Transformation Logic
        const body: IBodyDefinition | undefined =
          components[MatterBodyComponentName]?.get(entity);
        const position = body?.position ||
          renderData.position || { x: 0, y: 0 };
        const angle = body?.angle || 0;

        const matrix = Skia.Matrix();
        matrix.translate(position.x, position.y);
        if (angle !== 0) {
          matrix.rotate(angle);
        }

        canvas.save();
        canvas.concat(matrix);

        // 2. Conditional Rendering Logic
        if (renderData.shader) {
          const shaderPaint = Skia.Paint();
          shaderPaint.setAntiAlias(true);
          const effect = shaderEffects.value[renderData.shader.key];
          if (effect) {
            let path = pictureCache.value[entity] as SkPath;
            if (!path || renderData.isDirty) {
              path = createPathFromShape(renderData) as SkPath;
              pictureCache.value[entity] = path;
            }
            if (path) {
              const uniformValues: number[] = [];
              const uniformSources = Object.values(renderData.shader.uniforms);

              for (const source of uniformSources) {
                const value = source;
                if (typeof value === 'number') {
                  uniformValues.push(value > 1 ? value * 1.0 : value);
                } else {
                  uniformValues.push(...value);
                }
              }
              const shader: SkShader = effect.makeShader(uniformValues);
              shaderPaint.setStyle(PaintStyle.Fill);
              shaderPaint.setBlendMode(BlendMode.Multiply);
              shaderPaint.setShader(shader);
              shaderPaint.setAntiAlias(true);
              canvas.drawPath(path, shaderPaint);
              shaderPaint.dispose();
            }
          }
        } else {
          let entityPicture = pictureCache.value[entity] as SkPicture;
          if (renderData.isDirty || !entityPicture || renderData.sprite) {
            const newEntityPicture = createAndCacheEntityPicture(
              components,
              entity,
              imageCache,
              deltaTime
            );
            if (newEntityPicture) {
              pictureCache.value[entity] = newEntityPicture;
              entityPicture = newEntityPicture;
            }
          }

          if (entityPicture) {
            canvas.drawPicture(entityPicture);
          }
        }

        // 3. Universal Cleanup Logic
        canvas.restore();
        renderData.isDirty = false;

        // --- END OF REFACTORED CODE ---
      }

      const newPicture = recorder.finishRecordingAsPicture();
      picture.value = newPicture;
    },
  };
};
