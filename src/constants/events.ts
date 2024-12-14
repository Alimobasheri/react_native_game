import { GameEvent } from '@/containers/ReactNativeSkiaGameEngine/types/Events';
import { Boat } from '@/Game/Entities/Boat/Boat';
import { Ship } from '@/Game/Entities/Ship/Ship';
import { Vehicle } from '@/Game/Entities/Vehicle/Vehicle';

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
