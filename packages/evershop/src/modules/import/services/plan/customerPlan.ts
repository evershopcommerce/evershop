import type { CustomerState } from '../entities/customer/customerValidator.js';

/** Customers have no order among them: they are written in the order of the file. */
export interface CustomerPlan {
  rows: number;
}

export function planCustomers(state: CustomerState): CustomerPlan {
  return { rows: state.firstRow.size };
}
