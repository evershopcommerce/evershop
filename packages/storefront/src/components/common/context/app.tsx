import { produce } from 'immer';
import React, { useMemo } from 'react';
import {
  AppContextDispatchValue,
  AppStateContextValue
} from '../../../types/appContext.js';

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

export const useAppState = (): AppStateContextValue =>
  React.useContext(AppStateContext);
export const useAppDispatch = (): AppContextDispatchValue =>
  React.useContext(AppContextDispatch);
