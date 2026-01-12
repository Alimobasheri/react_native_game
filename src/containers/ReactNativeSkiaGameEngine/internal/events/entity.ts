import { Component } from '../../services-ecs/component';

export const CreateEntityRequestType = 'CreateEntityRequest';
export type CreateEntityRequest = {
  type: typeof CreateEntityRequestType;
  payload: {
    components: Component<any>[];
    sceneKey: string;
    responseSubId: string;
  };
};

export const CreateEntityResponseType = 'CreateEntityResponse';
export type CreateEntityResponse = {
  type: typeof CreateEntityResponseType;
  payload: {
    entityId: number;
  };
  subscriptionId: string;
};

export const createEntityBatchRequestType = 'CreateEntityBatchRequest';
export type CreateEntityBatchRequest = {
  type: typeof createEntityBatchRequestType;
  payload: {
    batch: CreateEntityRequest['payload']['components'][];
    sceneKey: string;
    responseSubId: string;
  };
};

export const createEntityBatchResponseType = 'CreateEntityBatchResponse';
export type CreateEntityBatchResponse = {
  type: typeof createEntityBatchResponseType;
  payload: {
    batchEntityId: CreateEntityResponse['payload']['entityId'][];
  };
  subscriptionId: string;
};

export const RemoveEntityRequestType = 'RemoveEntityRequest';
export type RemoveEntityRequest = {
  type: typeof RemoveEntityRequestType;
  payload: {
    entityId: number;
  };
};

export const RemoveEntityBatchRequestType = 'RemoveEntityBatchRequest';
export type RemoveEntityBatchRequest = {
  type: typeof RemoveEntityBatchRequestType;
  payload: {
    entityIds: number[];
  };
};
