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
    // NOTE: `s3` / `azure` are declared non-optional so ConfigPath can derive
    // `system.s3.*` paths (keyof an optional member resolves to never) — at
    // runtime they are absent unless the operator configures them, so read
    // individual keys, never the whole object.
    s3: {
      region?: string;
      bucket?: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      endpoint?: string;
      forcePathStyle?: boolean;
      baseUrl?: string;
    };
    azure: {
      connectionString?: string;
      containerName?: string;
      containerAccess?: string;
      baseUrl?: string;
    };
    gcs: {
      bucket?: string;
      serviceAccountKey?: string;
      baseUrl?: string;
    };
    admin_collection_size?: number;
    /** Hard ceiling on `?limit=`. Default 200. */
    max_collection_size?: number;
    upload_allowed_mime_types: string[];
    upload_max_file_size?: number;
    upload_max_file_size_per_type?: Record<string, number>;
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
      order_refunded?: {
        enabled: boolean;
        templatePath?: string | null;
        [key: string]: unknown;
      };
      order_canceled?: {
        enabled: boolean;
        templatePath?: string | null;
        [key: string]: unknown;
      };
      contact_form?: {
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
    // NOTE: declared non-optional (like `s3`) so ConfigPath can derive
    // `system.webhook.*`; at runtime it is absent unless the operator sets it,
    // so read individual keys, never the whole object.
    webhook: {
      /**
       * Allow webhook URLs that resolve to private/loopback addresses and plain
       * `http:`. Off by default (SSRF protection); turn on for a receiver on
       * the same network or for local development.
       */
      allowPrivateNetworks?: boolean;
    };
    // NOTE: declared non-optional for the same reason as `webhook`; every key
    // is optional and has a default in `modules/import/adapters/importConfig.ts`.
    import: {
      /** The largest upload, in MB. Default 100. */
      maxFileSizeMb?: number;
      /** The most rows a file may have. Default 200,000. */
      maxRows?: number;
      /** The longest cell, in characters. Default 65,536. */
      maxCellLength?: number;
      /** The most problems kept for one job and phase. Default 100,000. */
      maxIssues?: number;
      /** How long a finished job is kept, in days. Default 7. */
      retentionDays?: number;
      /** How long one image download may take, in seconds. Default 30. */
      imageTimeoutSeconds?: number;
      /** How many images the import fetches at the same time. Default 4. */
      imageConcurrency?: number;
      /** The most import workers one instance runs at a time. Default 2. */
      maxWorkersPerInstance?: number;
      /** The memory ceiling of one worker (`--max-old-space-size`), in MB. Default 1024. */
      workerMemoryMb?: number;
      /**
       * The import pauses while more than this many events are waiting for the
       * event process, so the store's own events (order emails) are not
       * delayed. Default 500.
       */
      eventBacklogHigh?: number;
      /** ...and goes on when fewer than this are waiting. Default 100. */
      eventBacklogLow?: number;
      /**
       * An import that has waited this long, in minutes, for the queue to
       * drain stops (`interrupted`) and can be resumed. Default 30.
       */
      eventBacklogMaxWaitMinutes?: number;
      lockTimeoutSeconds?: number;
      /**
       * Download images from private/loopback addresses and plain `http:`. Off
       * by default (SSRF protection); for the end-to-end tests and a source on
       * the same network.
       */
      allowPrivateNetworks?: boolean;
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
    crossSell: {
      recomputeSchedule: string;
      recomputeEnabled: boolean;
      maxOrderKeys: number;
    };
  };
  checkout: {
    showShippingNote: boolean;
    allowGuestCheckout: boolean;
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
      noscripts: any[];
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
  sitemap: {
    enabled: boolean;
    schedule: string;
    maxUrlsPerFile: number;
    maxAge: number;
    hreflang: boolean;
    staticPaths: string[];
    changefreq: {
      product: string;
      category: string;
      cmsPage: string;
      landingPage: string;
      static: string;
    };
    priority: {
      product: number;
      category: number;
      cmsPage: number;
      landingPage: number;
      static: number;
    };
    robots: {
      enabled: boolean;
      disallow: string[];
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
