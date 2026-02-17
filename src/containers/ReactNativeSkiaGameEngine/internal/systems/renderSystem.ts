import { System } from '../../services-ecs/system';
import {
  Skia,
  SkPicture,
  SkPath,
  PaintStyle,
  SkShader,
  BlendMode,
} from '@shopify/react-native-skia';
import { RenderComponentData, RenderComponentName } from '../components/render';
import { ComponentStore } from '../../services-ecs';
import { MatterBodyComponentName } from '../components/matterBody';
import { IBodyDefinition } from 'matter-js';
import { Entity } from '../../services-ecs/entity';
import { SpriteComponentName } from '../components/sprite';
import { TextComponentData, TextComponentName } from '../components/text';
import { renderTextForEntity } from '../utils/textRenderer';
import { SceneComponentData, SceneComponentName } from '../components/scene';

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

const getSpriteFrameInfo = (
  renderData: RenderComponentData,
  spriteComponent?: any
): { sourceRect: any; width: number; height: number } | null => {
  'worklet';
  // Priority 1: Use SpriteComponent data (unified system)
  if (spriteComponent && spriteComponent.currentFrame !== undefined) {
    const currentFrame = spriteComponent.currentFrame || 0;

    // Handle atlas-based sprites (variable frame sizes and positions)
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

    // Handle sprite sheet (uniform frame sizes)
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

  // Priority 2: Use legacy SpriteInfo (backward compatibility)
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

const createAndCacheEntityPicture = (
  components: Record<string, ComponentStore<any>>,
  entityId: Entity
): SkPicture | null => {
  'worklet';
  const imageCache = global._RNTGE_.imageCache;
  const renderData: RenderComponentData | undefined =
    components[RenderComponentName].get(entityId);
  const textComponent: TextComponentData | undefined =
    components[TextComponentName].get(entityId);

  if (!renderData || renderData.visible === false) {
    return null;
  }

  // Sprite animation is now handled by spriteUpdateSystem
  // No need to update sprite animation here

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
  } else if (renderData.image) {
    let image = imageCache[renderData.image];
    if (image) {
      let width = image.width();
      let height = image.height();
      let sourceRect = Skia.XYWHRect(0, 0, image.width(), image.height());

      // Handle unified sprite rendering
      const spriteComponent = components[SpriteComponentName]?.get(entityId);
      const spriteFrameInfo = getSpriteFrameInfo(renderData, spriteComponent);

      if (spriteFrameInfo) {
        sourceRect = spriteFrameInfo.sourceRect;
        width = spriteFrameInfo.width;
        height = spriteFrameInfo.height;
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
      paint.setBlendMode(renderData.blendMode || BlendMode.SrcOver);
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

export const renderSystem: System = {
  name: 'renderSystem',
  requiredComponents: [],
  process: ({ entities, components, eventQueue, deltaTime, ecs, dimensions }) => {
    'worklet';

    if (!global._RNTGE_.picture || !global._RNTGE_.pictureCache) {
      global._RNTGE_.picture = null;
      global._RNTGE_.pictureCache = {};
    }
    const picture = global._RNTGE_.picture;
    const pictureCache = global._RNTGE_.pictureCache;
    const imageCache = global._RNTGE_.imageCache;
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

    // Gather active scenes and order them by zIndex (then by id for stability).
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

      // Build a per-scene render queue ordered by zIndex (then entity id for stability)
      const renderQueue: {
        entity: Entity;
        zIndex: number;
        renderData: RenderComponentData;
      }[] = [];

      for (let i = 0; i < sceneEntityIds.length; i++) {
        const entity = sceneEntityIds[i];
        const renderData = renderStore.get(entity) as
          | RenderComponentData
          | undefined;

        if (!renderData || renderData.visible === false) continue;

        const zIndex = renderData.zIndex ?? 0;
        renderQueue.push({ entity, zIndex, renderData });
      }

      renderQueue.sort((a, b) => {
        if (a.zIndex !== b.zIndex) {
          return a.zIndex - b.zIndex;
        }
        return a.entity - b.entity;
      });

      for (let i = 0; i < renderQueue.length; i++) {
        const { entity, renderData } = renderQueue[i];

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
          const effect = shaderEffects[renderData.shader.key];
          if (effect) {
            let path = pictureCache[entity] as SkPath;
            if (!path || renderData.isDirty) {
              path = createPathFromShape(renderData) as SkPath;
              pictureCache[entity] = path;
            }
            if (path) {
              const uniformValues: number[] = [];
              const uniformSources = Object.values(
                renderData.shader.uniforms
              );

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
              shaderPaint.setBlendMode(
                renderData.blendMode || BlendMode.SrcOver
              );
              shaderPaint.setShader(shader);
              shaderPaint.setAntiAlias(true);
              canvas.drawPath(path, shaderPaint);
              shaderPaint.dispose();
            }
          }
        } else {
          let entityPicture = pictureCache[entity] as SkPicture;

          const spriteComponent =
            components[SpriteComponentName]?.get(entity);
          const hasSpriteAnimation =
            spriteComponent?.currentFrame !== undefined || renderData.sprite;

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

        // 3. Universal Cleanup Logic
        canvas.restore();
        renderData.isDirty = false;
      }
    }

    const newPicture = recorder.finishRecordingAsPicture();
    global._RNTGE_.picture = newPicture;
  }
};
