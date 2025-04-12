import { Request as ExpressRequest } from 'express';

export interface EverShopRequest extends ExpressRequest {
  isAdmin?: boolean;
  session?: any;
  currentRoute?: string;
}
