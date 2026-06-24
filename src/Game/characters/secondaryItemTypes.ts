export type SecondaryItemLayerSink = {
  setLocalTransform: (
    offsetX: number,
    offsetY: number,
    angleRad: number
  ) => void;
  setOpacity?: (opacity: number) => void;
};

export type LaggingSpringAccessoryState = {
  kind: 'LaggingSpring';
  localOffsetX: number;
  localOffsetY: number;
  springVelocityX: number;
  springVelocityY: number;
};

export type ProceduralChainAccessoryState = {
  kind: 'ProceduralChain';
  segmentAngles: readonly [number, number, number];
  compositeOffsetX: number;
  compositeOffsetY: number;
};

export type ShaderReactiveAccessoryState = {
  kind: 'ShaderReactive';
  offsetX: number;
  opacity: number;
};

export type SecondaryItemPersistedState =
  | LaggingSpringAccessoryState
  | ProceduralChainAccessoryState
  | ShaderReactiveAccessoryState;
