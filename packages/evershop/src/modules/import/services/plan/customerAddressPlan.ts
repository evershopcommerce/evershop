/** Addresses have no order among them: they are written in the order of the file. */
export interface AddressPlan {
  rows: number;
}

export function planAddresses(): AddressPlan {
  return { rows: 0 };
}
