import { FC, useCallback, useState } from 'react';
import {
  Group,
  Skia,
  PaintStyle,
  SkPicture,
  Picture,
  SkMatrix,
} from '@shopify/react-native-skia';
import { useDerivedQuery } from '../../hooks-ecs/useDerivedQuery/useDerivedQuery';
import { DerivedTransform } from '../../hooks-ecs/useDerivedMemory/useDerivedMemory';
import { MatterBodyComponentName } from '../../internal/components/matterBody';
import { IBodyDefinition } from 'matter-js';
import { ComponentStore } from '../../services-ecs/component';
import { Entity } from '../../services-ecs/entity';
import {
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { useECSContext } from '../../hooks-ecs/useECSContext/useECSContext';

export type RenderEntityProps = {
  entityId: number;
};

const createEntityPicture = (
  components: Record<string, ComponentStore<any>>,
  entityId: Entity
): SkPicture | null => {
  'worklet';
  const body: IBodyDefinition | undefined =
    components[MatterBodyComponentName]?.get(entityId);

  if (!body) {
    return null;
  }

  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording();

  // If render is explicitly set to not visible, we don't draw anything.
  if (body.render?.visible === false) {
    return recorder.finishRecordingAsPicture();
  }

  const skPath = Skia.Path.Make();

  // Handle circle bodies
  if (body.type === 'circle' && body.circleRadius !== undefined) {
    // For circles, we draw them at (0,0) because the transform will handle the position.
    skPath.addCircle(0, 0, body.circleRadius);
  }
  // Handle polygon/vertex-based bodies
  else if (body.vertices && body.vertices.length > 0) {
    // We need to translate vertices relative to the body's center for drawing at (0,0)
    const bodyCenter = body.position || { x: 0, y: 0 };
    const verts = body.vertices;
    skPath.moveTo(verts[0].x - bodyCenter.x, verts[0].y - bodyCenter.y);
    for (let j = 1; j < verts.length; j++) {
      skPath.lineTo(verts[j].x - bodyCenter.x, verts[j].y - bodyCenter.y);
    }
    skPath.close();
  } else {
    // Default fallback shape if no geometry is defined (e.g., a small square)
    skPath.addRect(Skia.XYWHRect(-10, -10, 20, 20));
  }

  // Setup fill paint
  const fillPaint = Skia.Paint();
  fillPaint.setAntiAlias(true);
  fillPaint.setStyle(PaintStyle.Fill);
  fillPaint.setColor(Skia.Color(body.render?.fillStyle || '#0099ff'));
  canvas.drawPath(skPath, fillPaint);

  // Setup stroke paint (for wireframes or outlines)
  if (body.render?.strokeStyle) {
    const strokePaint = Skia.Paint();
    strokePaint.setStyle(PaintStyle.Stroke);
    strokePaint.setStrokeWidth(body.render?.lineWidth || 1);
    strokePaint.setColor(Skia.Color(body.render?.strokeStyle || '#2E3440'));
    canvas.drawPath(skPath, strokePaint);
  }

  return recorder.finishRecordingAsPicture();
};

export const RenderEntity: FC<RenderEntityProps> = ({ entityId }) => {
  // This derived value creates the picture once and reuses it.
  // It will only re-run if the underlying drawing data for the entity changes.
  const picture = useSharedValue<SkPicture | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);

  useAnimatedReaction(
    () => picture.value !== null,
    (isInit) => {
      if (isInit && !isInitialized) {
        runOnJS(setIsInitialized)(true);
      } else if (!isInit && isInitialized) {
        runOnJS(setIsInitialized)(false);
      }
    },
    [entityId]
  );

  /**
   * A transform function that calculates the transformation matrix for an entity.
   * @param entities - Array of all entities.
   * @param components - The component stores from the ECS.
   * @param entityId - The ID of the entity to transform.
   * @returns An SkMatrix for transforming the entity's picture.
   */
  const transformEntity: (
    components: Record<string, ComponentStore<any>>,
    entityId: number
  ) => SkMatrix = (components, entityId) => {
    'worklet';
    const component: IBodyDefinition | undefined =
      components[MatterBodyComponentName]?.get(entityId);

    const matrix = Skia.Matrix();

    if (!component || !component.position) {
      return matrix; // Return identity matrix
    }

    if (!picture.value) {
      picture.value = createEntityPicture(components, entityId);
    }

    // Apply translation
    matrix.translate(component.position.x, component.position.y);

    // Apply rotation if it exists
    if (component.angle) {
      matrix.rotate(component.angle);
    }

    return matrix;
  };

  // This derived value calculates the transformation matrix on every frame.
  const transform = useDerivedQuery<SkMatrix>({
    defaultValue: Skia.Matrix(),
    transform: (entities, components) => {
      'worklet';
      return transformEntity(components, entityId);
    },
  });

  if (!isInitialized) return null;

  return (
    <Group matrix={transform}>
      <Picture picture={picture as SharedValue<SkPicture>} />
    </Group>
  );
};
