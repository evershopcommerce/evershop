import { PageMetaInfo } from './pageMeta.js';

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
  graphqlResponse: {
    [key: string]: any;
  };
  config: Config;
  propsMap: Record<string, any[]>;
  widgets?: any[];
  fetching: boolean;
}

interface AppContextDispatchValue {
  setData: React.Dispatch<React.SetStateAction<AppStateContextValue>>;
  fetchPageData: (url: string | URL) => Promise<void>;
}

export { AppStateContextValue, Config, AppContextDispatchValue };
