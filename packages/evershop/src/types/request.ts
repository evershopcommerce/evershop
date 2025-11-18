import { Request as ExpressRequest } from 'express';
import { Route } from './route.js';

export interface CurrentCustomer {
  customer_id: number;
  group_id: number;
  uuid: string;
  email: string;
  full_name: string;
  status: number;
  created_at: Date;
  updated_at: Date;
}

export interface CurrentUser {
  admin_user_id: number;
  uuid: string;
  email: string;
  full_name: string;
  status: number;
  roles: string;
  created_at: Date;
  updated_at: Date;
}

export interface EvershopRequest extends ExpressRequest {
  isAdmin: boolean;
  currentRoute: Route;
  locals: {
    sessionID: string | null;
    delegates: {
      setOnce: (key: string, value: any) => void;
      get: (key: string) => any;
      has: (key: string) => boolean;
      keys: () => string[];
      getAll: () => Record<string, unknown>;
    };
    user: CurrentUser | null;
    customer: CurrentCustomer | null;
    context: Record<string, any>;
    webpackMatchedRoute: Route | null;
  };
  loginCustomerWithEmail: (
    email: string,
    password: string,
    callback: (err: Error | null, customer?: any) => void
  ) => Promise<void>;
  logoutCustomer: (callback: (err: Error | null) => void) => void;
  isCustomerLoggedIn: () => boolean;
  getCurrentCustomer: () => CurrentCustomer | null;
  loginUserWithEmail: (
    email: string,
    password: string,
    callback: (err: Error | null, user?: any) => void
  ) => Promise<void>;
  logoutUser: (callback: (err: Error | null) => void) => void;
  isUserLoggedIn: () => boolean;
  getCurrentUser: () => CurrentUser | null;
}
