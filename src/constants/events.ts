import { GameEvent } from '@/containers/ReactNativeSkiaGameEngine/types/Events';
import { Boat } from '@/Game/Entities/Boat/Boat';
import { Sea } from '@/Game/Entities/Sea/Sea';
import { Ship } from '@/Game/Entities/Ship/Ship';
import { Vehicle } from '@/Game/Entities/Vehicle/Vehicle';
import { IWave } from '@/Game/Entities/Wave/types';

export const GAME_OVER_EVENT: GameEvent = { type: 'gameOver' };
export const RESTART_GAME_EVENT: GameEvent = { type: 'restartGame' };
export const RETURN_HOME_EVENT: GameEvent = { type: 'returnHome' };

export const BOAT_SINKED_EVENT_TYPE = 'boatSinked';
export const BOAT_SINKED_EVENT = (boat: Boat) => ({
  type: BOAT_SINKED_EVENT_TYPE,
  data: boat,
});

export const SHIP_SINKED_EVENT_TYPE = 'shipSinked';
export const SHIP_SINKED_EVENT = (ship: Ship) => ({
  type: SHIP_SINKED_EVENT_TYPE,
  data: ship,
});

export const BUOYANT_VEHICLE_SINKED_EVENT_TYPE = 'buoyantVehicleSinked';
export const BUOYANT_VEHICLE_SINKED_EVENT = (vehicle: Vehicle) => ({
  type: BUOYANT_VEHICLE_SINKED_EVENT_TYPE,
  data: vehicle,
});

export const SEA_ADD_WAVE_EVENT_TYPE = 'seaAddWave';
export type SeaAddWaveEvent = {
  type: typeof SEA_ADD_WAVE_EVENT_TYPE;
  data: { layer: Sea; waves: IWave[] };
};
export const SEA_ADD_WAVE_EVENT = (
  layer: Sea,
  waves: IWave[]
): SeaAddWaveEvent => ({
  type: SEA_ADD_WAVE_EVENT_TYPE,
  data: { layer, waves },
});
