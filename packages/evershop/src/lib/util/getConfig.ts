import config from 'config';

type ConfigStructure = {
  shop: {
    language: string;
    timezone: string;
    homeUrl: string;
    // NOTE: `currency`, `weightUnit` and `dimensionUnit` are intentionally absent — they are
    // admin settings now (the `setting` table), read via getStoreCurrency / getWeightUnit /
    // getDimensionUnit in modules/setting/services; config.json is only a legacy fallback, read
    // untyped there (getLegacyConfig). `timezone` and `language` stay typed because they are
    // still read directly/operationally — `shop.timezone` sets the DB session in connection.ts
    // (before any query, so it can't be a DB setting), and `shop.language` is the locale system's
    // synchronous fallback across translate/render/formatters.
  };
  system: {
    file_storage: string;
    admin_collection_size?: number;
    upload_allowed_mime_types: string[];
    theme?: string;
    extensions: Array<{
      name: string;
      resolve: string;
      enabled: boolean;
    }>;
    session: {
      maxAge: number;
      resave: boolean;
      saveUninitialized: boolean;
      rolling: boolean;
      cookieSecret: string;
      cookieName: string;
      adminCookieName: string;
    };
    notification_emails: {
      from?: string;
      order_confirmation?: {
        enabled: boolean;
        templatePath?: string | null;
        [key: string]: unknown;
      };
      customer_welcome?: {
        enabled: boolean;
        templatePath?: string | null;
        [key: string]: unknown;
      };
      reset_password?: {
        enabled: boolean;
        templatePath?: string | null;
        [key: string]: unknown;
      };
      shipment_created?: {
        enabled: boolean;
        templatePath?: string | null;
        [key: string]: unknown;
      };
      shipment_delivered?: {
        enabled: boolean;
        templatePath?: string | null;
        [key: string]: unknown;
      };
    };
    stripe?: {
      secretKey?: string;
      publishableKey?: string;
      [key: string]: unknown;
    };
    paypal?: {
      [key: string]: unknown;
    };
    cod?: {
      status?: number;
      [key: string]: unknown;
    };
  };
  catalog: {
    collectionPageSize: number;
    product: {
      image: {
        width: number;
        height: number;
      };
    };
    showOutOfStockProduct: boolean;
  };
  checkout: {
    showShippingNote: boolean;
  };
  pricing: {
    rounding: string;
    precision: number;
    tax: {
      rounding: string;
      precision: number;
      round_level: string;
      price_including_tax: boolean;
    };
  };
  themeConfig: {
    headTags: {
      links: any[];
      metas: any[];
      scripts: any[];
      bases: any[];
    };
    copyRight: string;
  };
  oms: {
    order: {
      shipmentStatus: Record<
        string,
        {
          name: string;
          badge: string;
          progress?: string;
          isDefault?: boolean;
          isCancelable?: boolean;
        }
      >;
      paymentStatus: Record<
        string,
        {
          name: string;
          badge: string;
          progress?: string;
          isDefault?: boolean;
          isCancelable?: boolean;
        }
      >;
      status: Record<
        string,
        {
          name: string;
          badge: string;
          progress?: string;
          isDefault?: boolean;
          next: string[];
        }
      >;
      psoMapping: Record<string, string>;
      shipmentRollupCancelable: {
        pending?: boolean;
        partially_shipped?: boolean;
        shipped?: boolean;
        partially_delivered?: boolean;
        delivered?: boolean;
        canceled?: boolean;
      };
      reStockAfterCancellation: boolean;
    };
    tracking: {
      anonymousTokenTtlDays: number;
    };
  };
};

type PathValue<T, P extends string> = P extends keyof T
  ? T[P]
  : P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : never
  : never;

type ConfigPath =
  | keyof ConfigStructure
  | {
      [K in keyof ConfigStructure]: K extends string
        ?
            | `${K}.${Extract<keyof ConfigStructure[K], string>}`
            | {
                [K2 in keyof ConfigStructure[K]]: K2 extends string
                  ?
                      | `${K}.${K2}.${Extract<
                          keyof ConfigStructure[K][K2],
                          string
                        >}`
                      | {
                          [K3 in keyof ConfigStructure[K][K2]]: K3 extends string
                            ? `${K}.${K2}.${K3}.${Extract<
                                keyof ConfigStructure[K][K2][K3],
                                string
                              >}`
                            : never;
                        }[keyof ConfigStructure[K][K2]]
                  : never;
              }[keyof ConfigStructure[K]]
        : never;
    }[keyof ConfigStructure];

/**
 * Get the configuration value base on path. Return the default value if the path is not found.
 */
export function getConfig<P extends ConfigPath>(
  path: P,
  defaultValue?: PathValue<ConfigStructure, P & string>
): PathValue<ConfigStructure, P & string> {
  return config.has(path as string)
    ? config.get<PathValue<ConfigStructure, P & string>>(path as string)
    : (defaultValue as PathValue<ConfigStructure, P & string>);
}
