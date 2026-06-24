export type DeformationScale = {
  scaleX: number;
  scaleY: number;
};

export type DeformationScaleSink = {
  setScale: (scaleX: number, scaleY: number) => void;
};

export type ProceduralDeformationResult = {
  scaleX: number;
  scaleY: number;
};
