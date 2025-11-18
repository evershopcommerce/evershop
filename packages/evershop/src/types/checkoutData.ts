import { Address } from './customerAddress.js';

export interface CheckoutData {
  customer?: {
    id?: string;
    email: string;
    fullName?: string;
  };
  shippingAddress?: Address;
  billingAddress?: Address;
  paymentMethod?: string;
  shippingMethod?: string;
  [key: string]: unknown;
}
