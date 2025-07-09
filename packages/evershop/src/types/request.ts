import { Request as ExpressRequest } from 'express';
import { Route } from './route.js';

export interface EvershopRequest extends ExpressRequest {
  isAdmin: boolean;
  session: any;
  currentRoute: Route;
  locals?: {
    delegates?: {
      setOnce: (key: string, value: any) => void;
      get: (key: string) => any;
      has: (key: string) => boolean;
      keys: () => string[];
      getAll: () => Record<string, unknown>;
    };
    user?: {
      user_id: number;
      uuid: string;
      email: string;
      full_name: string;
      status: number;
      created_at: Date;
      updated_at: Date;
    };
    customer?: {
      customer_id: number;
      uuid: string;
      email: string;
      full_name: string;
      status: number;
      created_at: Date;
      updated_at: Date;
    };
    context?: Record<string, any>;
  };
  loginCustomerWithEmail: (
    email: string,
    password: string,
    callback: (err: Error | null, customer?: any) => void
  ) => Promise<void>;
  logoutCustomer: (callback: (err: Error | null) => void) => void;
  isCustomerLoggedIn: () => boolean;
  getCurrentCustomer: () => any;
  loginUserWithEmail: (
    email: string,
    password: string,
    callback: (err: Error | null, user?: any) => void
  ) => Promise<void>;
  logoutUser: (callback: (err: Error | null) => void) => void;
  isUserLoggedIn: () => boolean;
  getCurrentUser: () => {
    user_id: number;
    uuid: string;
    email: string;
    full_name: string;
    status: number;
    created_at: Date;
    updated_at: Date;
  };
}
