export interface IGameConfig {
  get windowWidth(): number;
  get windowHeight(): number;
}

export type GameConfigParams = {
  windowWidth: number;
  windowHeight: number;
};
