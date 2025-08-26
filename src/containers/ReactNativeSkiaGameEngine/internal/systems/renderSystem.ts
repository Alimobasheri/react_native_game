import { System } from '../../services-ecs/system';
import {
  Skia,
  SkPicture,
  SkPath,
  PaintStyle,
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

const createAndCacheEntityPicture = (
  components: Record<string, ComponentStore<any>>,
  entityId: Entity
): SkPicture | null => {
  'worklet';
  const renderData: RenderComponentData | undefined =
    components[RenderComponentName].get(entityId);

  if (!renderData || renderData.visible === false) {
    return null;
  }

  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording();

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

  return recorder.finishRecordingAsPicture();
};

export const renderSystem = (
  picture: SharedValue<SkPicture | null>,
  dimensions: SharedValue<{ width: number; height: number }>,
  pictureCache: SharedValue<Record<number, SkPicture>>
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

        let entityPicture = pictureCache.value[entity];

        if (renderData.isDirty || !entityPicture) {
          const newEntityPicture = createAndCacheEntityPicture(
            components,
            entity
          );
          if (newEntityPicture) {
            pictureCache.value[entity] = newEntityPicture;
            entityPicture = newEntityPicture;
          }
          renderData.isDirty = false;
        }

        if (entityPicture) {
          const body: IBodyDefinition | undefined =
            components[MatterBodyComponentName]?.get(entity);

          // Use physics body for position if it exists, otherwise use static position from renderData
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
          canvas.drawPicture(entityPicture);
          canvas.restore();
        }
      }

      const newPicture = recorder.finishRecordingAsPicture();
      picture.value = newPicture;
    },
  };
};
