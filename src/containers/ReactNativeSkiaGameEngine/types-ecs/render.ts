export type AtlasData = {
  meta: {
    image: string;
    width: number;
    height: number;
    x: number;
    y: number;
  };
  frames: {
    [key: string]: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
  }[];
};

export type ClipAnimationData = {
  clips: {
    [key: string]: {
      name: string;
      frameOffset?: number; // Universal frame mapping support
      frames: {
        sprite: string;
        duration: number;
        event?: string;
      }[];
      loop: boolean;
    };
  };
  stateMachine: {
    initialState: string;
    parameters: Record<string, any>;
    transitions: {
      from: string;
      to: string;
      condition: {
        param: string;
        value: any;
        op: TransitionOp;
      };
    }[];
  };
};

export enum TransitionOp {
  EQUAL = '=',
  NOT_EQUAL = '!=',
  GREATER_THAN = '>',
  LESS_THAN = '<',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN_OR_EQUAL = '<=',
}
