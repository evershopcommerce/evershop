import { WidgetInstance } from '@evershop/evershop/types/widget';
import { PageMetaInfo } from './pageMeta.js';

type GraphqlScalar = string | number | boolean | null;
type GraphqlResponseValue =
  | GraphqlScalar
  | GraphqlResponseValue[]
  | { [key: string]: GraphqlResponseValue };

interface Config {
  pageMeta: PageMetaInfo;
  tax: {
    priceIncludingTax: boolean;
  };
  catalog: {
    imageDimensions: { width: number; height: number };
  };
}

interface AppStateContextValue {
  graphqlResponse: Record<string, GraphqlResponseValue>;
  config: Config;
  propsMap: Record<string, any[]>;
  widgets?: WidgetInstance[];
  fetching: boolean;
  /** Locale payload injected into eContext (spec §6.11). */
  locale?: string;
  defaultLocale?: string;
  availableLocales?: string[];
  translations?: Record<string, string>;
}

interface AppContextDispatchValue {
  setData: React.Dispatch<React.SetStateAction<AppStateContextValue>>;
  setFetching: React.Dispatch<React.SetStateAction<boolean>>;
  fetchPageData: (url: string | URL) => Promise<void>;
}

export { AppStateContextValue, Config, AppContextDispatchValue };
