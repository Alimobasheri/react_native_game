import { Body } from 'matter-js';

export const AddMatterBodyRequestType = 'AddMatterBodyRequest';
export type AddMatterBodyRequest = {
  type: typeof AddMatterBodyRequestType;
  payload: {
    body: Body;
    responseSubId: string;
  };
};

export const AddMatterBodyResponseType = 'AddMatterBodyResponse';
export type AddMatterBodyResponse = {
  type: typeof AddMatterBodyResponseType;
  payload: {
    success: boolean;
  };
  subscriptionId: string;
};
