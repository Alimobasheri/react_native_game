export type RNGE_Layout_Prop = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type RNGE_Screen_Prop = {
  fontScale: number;
  height: number;
  scale: number;
  width: number;
};

export type EntityRendererProps<T> = {
  entity: T;
  screen: RNGE_Screen_Prop;
  layout: RNGE_Layout_Prop;
};
