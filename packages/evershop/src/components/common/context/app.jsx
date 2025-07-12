
import produce from 'immer';
import PropTypes from 'prop-types';
import React, { useMemo } from 'react';

const AppStateContext = React.createContext();
const AppContextDispatch = React.createContext();

export function AppProvider({ value, children }) {
  const [data, setData] = React.useState(value);
  const [fetching, setFetching] = React.useState(false);

  const fetchPageData = async (url) => {
    setFetching(true);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const dataResponse = await response.json();
    // Update the entire context using immer
    setData(
      produce(data, (draff) => {
        draff = dataResponse.eContext;
        return draff;
      })
    );
    setFetching(false);
  };

  React.useEffect(() => {
    window.onpopstate = async () => {
      // Get the current url
      const url = new URL(window.location.href, window.location.origin);
      url.searchParams.append('ajax', true);
      await fetchPageData(url);
    };
  }, []);

  const contextDispatchValue = useMemo(() => ({ setData, fetchPageData }), []);
  const contextValue = useMemo(() => ({ ...data, fetching }), [data, fetching]);
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

export const useAppState = () => React.useContext(AppStateContext);
export const useAppDispatch = () => React.useContext(AppContextDispatch);
