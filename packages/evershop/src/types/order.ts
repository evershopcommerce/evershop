export type PaymentStatus = {
  name: string;
  badge: string;
  progress: string;
  isDefault: boolean;
  next: string[];
};

export type ShipmentStatus = {
  name: string;
  badge: string;
  progress: string;
  isDefault: boolean;
  next: string[];
  isCancelable?: boolean;
};

export type OrderStatus = {
  name: string;
  badge: string;
  progress: string;
  isDefault: boolean;
  next: string[];
};
