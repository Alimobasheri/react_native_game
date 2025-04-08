import { Body, IBodyDefinition } from 'matter-js';
import { CreateMatterBodyArgs } from '../systems/physics/bodiesTypes';

export const AddMatterBodyRequestType = 'AddMatterBodyRequest';
export type AddMatterBodyRequest = {
  type: typeof AddMatterBodyRequestType;
  payload: {
    args: CreateMatterBodyArgs;
    entityId: number;
    responseSubId: string;
  };
};

export const AddMatterBodyResponseType = 'AddMatterBodyResponse';
export type AddMatterBodyResponse = {
  type: typeof AddMatterBodyResponseType;
  payload: {
    success: boolean;
    bodyId: number;
  };
  subscriptionId: string;
};
