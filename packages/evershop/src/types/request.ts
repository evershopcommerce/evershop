import { Request as ExpressRequest } from 'express';
import { Route } from './route.js';

export interface EvershopRequest extends ExpressRequest {
  isAdmin?: boolean;
  session?: any;
  currentRoute?: Route;
  loginCustomerWithEmail?: (
    email: string,
    password: string,
    callback: (err: Error | null, customer?: any) => void
  ) => Promise<void>;
  logoutCustomer?: (callback: (err: Error | null) => void) => void;
  isCustomerLoggedIn?: () => boolean;
  getCurrentCustomer?: () => any;
}
