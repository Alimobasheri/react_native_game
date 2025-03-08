import { Component } from '../../services-ecs/component';

export const CreateEntityRequestType = 'CreateEntityRequest';
export type CreateEntityRequest = {
  type: typeof CreateEntityRequestType;
  payload: {
    components: Component<any>[];
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
