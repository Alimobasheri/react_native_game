import { System } from '../../services-ecs/system';

export const AddSystemRequestType = 'ADD_SYSTEM_REQUEST';
export type AddSystemRequest = {
  type: typeof AddSystemRequestType;
  payload: {
    system: System;
    responseSubId: string;
  };
};

export const AddSystemResponseType = 'ADD_SYSTEM_RESPONSE';
export type AddSystemResponse = {
  type: typeof AddSystemResponseType;
  payload: {
    systemId: number;
  };
  subscriptionId: string;
};
