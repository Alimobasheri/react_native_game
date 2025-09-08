import { Body, IBodyDefinition } from 'matter-js';
import {
  BatchMatterBodyArgs,
  CreateMatterBodyArgs,
} from '../systems/physics/bodiesTypes';

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

export const AddMatterBodyBatchRequestType = 'AddMatterBodyBatchRequest';
export type AddMatterBodyBatchRequest = {
  type: typeof AddMatterBodyBatchRequestType;
  payload: {
    batch: BatchMatterBodyArgs[];
    responseSubId: string;
  };
};

export const AddMatterBodyBatchResponseType = 'AddMatterBodyBatchResponse';
export type AddMatterBodyBatchResponse = {
  type: typeof AddMatterBodyBatchResponseType;
  payload: {
    success: boolean;
    bodyIds: number[];
  };
  subscriptionId: string;
};

export const RemoveMatterBodyRequestType = 'RemoveMatterBodyRequest';
export type RemoveMatterBodyRequest = {
  type: typeof RemoveMatterBodyRequestType;
  payload: {
    entityId: number;
  };
};

export const RemoveMatterBodyBatchRequestType = 'RemoveMatterBodyBatchRequest';
export type RemoveMatterBodyBatchRequest = {
  type: typeof RemoveMatterBodyBatchRequestType;
  payload: {
    entityIds: number[];
  };
};
