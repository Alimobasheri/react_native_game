import { System } from '../../services-ecs/system';

export const AddSystemRequestType = 'AddSystemRequest';
export type AddSystemRequest = {
  type: typeof AddSystemRequestType;
  payload: {
    system: System;
    responseSubId: string;
  };
};

export const AddSystemResponseType = 'AddSystemResponse';
export type AddSystemResponse = {
  type: typeof AddSystemResponseType;
  payload: {
    systemId: number;
  };
  subscriptionId: string;
};
