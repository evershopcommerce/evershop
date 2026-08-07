export interface CustomerAddressGraphql {
  uuid?: string;
  fullName?: string | null;
  telephone?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  postcode?: string | null;
  province?: {
    code: string;
    name: string;
  } | null;
  country?: {
    code: string;
    name: string;
  };
}

export interface Address {
  uuid?: string | null;
  full_name?: string | null;
  address_1?: string | null;
  address_2?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  postcode?: string | null;
  telephone?: string | number | null;
  [key: string]: any;
}
