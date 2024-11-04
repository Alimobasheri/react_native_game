import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { useCanvasDimensions } from '../useCanvasDimensions';
import { ICreateCameraOptions } from './types';
import { useCallback, useMemo, useState } from 'react';
import { Camera } from '../../types';

export const useCreateCamera = (options: ICreateCameraOptions) => {
  const { width: canvasWidth, height: canvasHeight } = useCanvasDimensions();

  const [initialValues] = useState({
    x: options.x || 0,
    y: options.y || 0,
    width: options.width || canvasWidth || 0,
    height: options.height || canvasHeight || 0,
    opacity: options.opacity || 1,
    translateX: options.translateX || 0,
    translateY: options.translateY || 0,
    scaleX: options.scaleX || 1,
    scaleY: options.scaleY || 1,
    rotate: options.rotate || 0,
  });

  const x = useSharedValue(initialValues.x);
  const y = useSharedValue(initialValues.y);
  const width = useSharedValue(initialValues.width);
  const height = useSharedValue(initialValues.height);
  const opacity = useSharedValue(initialValues.opacity);
  const translateX = useSharedValue(initialValues.translateX);
  const translateY = useSharedValue(initialValues.translateY);
  const scaleX = useSharedValue(initialValues.scaleX);
  const scaleY = useSharedValue(initialValues.scaleY);
  const rotate = useSharedValue(initialValues.rotate);

  const cameraTransform = useDerivedValue(() => {
    return [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
    ];
  }, [translateX.value, translateY.value, scaleX.value, scaleY.value]);

  const camera: Camera = useMemo(() => {
    return {
      x,
      y,
      width,
      height,
      opacity,
      translateX,
      translateY,
      scaleX,
      scaleY,
      rotate,
      transform: cameraTransform,
    };
  }, [x, y, width, height, opacity]);

  const resetCamera = useCallback(() => {
    x.value = initialValues.x;
    y.value = initialValues.y;
    width.value = initialValues.width;
    height.value = initialValues.height;
    opacity.value = initialValues.opacity;
    translateX.value = initialValues.translateX;
    translateY.value = initialValues.translateY;
    scaleX.value = initialValues.scaleX;
    scaleY.value = initialValues.scaleY;
    rotate.value = initialValues.rotate;
  }, [
    x,
    y,
    width,
    height,
    opacity,
    initialValues,
    translateX,
    translateY,
    scaleX,
    scaleY,
    rotate,
  ]);

  return {
    camera,
    resetCamera,
  };
};
