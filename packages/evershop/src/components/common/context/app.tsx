import { produce } from 'immer';
import PropTypes from 'prop-types';
import React, { useMemo } from 'react';
import { PageMetaInfo } from 'src/types/pageMeta.js';

// Define the shape of the app state context
interface AppStateContextValue {
  graphqlResponse: {
    pageMeta: PageMetaInfo;
    [key: string]: any;
  };
  fetching: boolean;
}

// Define the shape of the app dispatch context
interface AppContextDispatchValue {
  setData: React.Dispatch<React.SetStateAction<AppStateContextValue>>;
  fetchPageData: (url: string | URL) => Promise<void>;
}

const AppStateContext = React.createContext<AppStateContextValue>(
  {} as AppStateContextValue
);
const AppContextDispatch = React.createContext<AppContextDispatchValue>(
  {} as AppContextDispatchValue
);

interface AppProviderProps {
  value: AppStateContextValue;
  children: React.ReactNode;
}

export function AppProvider({ value, children }: AppProviderProps) {
  const [data, setData] = React.useState<AppStateContextValue>(value);
  const [fetching, setFetching] = React.useState<boolean>(false);

  const fetchPageData = async (url: string | URL): Promise<void> => {
    setFetching(true);
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const dataResponse = await response.json();
      // Update the entire context using immer
      setData(
        produce(data, (draft) => {
          Object.assign(draft, dataResponse.eContext);
          return draft;
        })
      );
    } catch (error) {
      console.error('Failed to fetch page data:', error);
    } finally {
      setFetching(false);
    }
  };

  React.useEffect(() => {
    window.onpopstate = async () => {
      // Get the current url
      const url = new URL(window.location.href, window.location.origin);
      url.searchParams.append('ajax', 'true');
      await fetchPageData(url.toString());
    };
  }, []);

  const contextDispatchValue = useMemo<AppContextDispatchValue>(
    () => ({ setData, fetchPageData }),
    [setData, fetchPageData]
  );

  const contextValue = useMemo<AppStateContextValue>(
    () => ({ ...data, fetching }),
    [data, fetching]
  );
  return (
    <AppContextDispatch.Provider value={contextDispatchValue}>
      <AppStateContext.Provider value={contextValue}>
        {children}
      </AppStateContext.Provider>
    </AppContextDispatch.Provider>
  );
}

AppProvider.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,

  value: PropTypes.object.isRequired
};

export const useAppState = (): AppStateContextValue =>
  React.useContext(AppStateContext);
export const useAppDispatch = (): AppContextDispatchValue =>
  React.useContext(AppContextDispatch);
