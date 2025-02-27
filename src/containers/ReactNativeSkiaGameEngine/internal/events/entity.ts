import { Component } from '../../services-ecs/component';

export const CreateEntityRequestType = 'CREATE_ENTITY_REQUEST';
export type CreateEntityRequest = {
  type: typeof CreateEntityRequestType;
  payload: {
    components: Component<any>[];
    responseSubId: string;
  };
};

export const CreateEntityResponseType = 'CREATE_ENTITY_RESPONSE';
export type CreateEntityResponse = {
  type: typeof CreateEntityResponseType;
  payload: {
    entityId: number;
  };
  subscriptionId: string;
};
