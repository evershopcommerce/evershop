import PropTypes from 'prop-types';
import React from 'react';
import produce from 'immer';

const AppStateContext = React.createContext();
const AppContextDispatch = React.createContext();

export function AppProvider({ value, children }) {
  // React.useEffect(() => {
  //   window.eContext = undefined;
  // }, []);
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
    setData(produce(data, (draff) => {
      // eslint-disable-next-line no-param-reassign
      draff = dataResponse.eContext;
      return draff;
    }));
    setFetching(false);
  };

  React.useEffect(() => {
    window.onpopstate = async (event) => {
      // Get the current url
      const url = new URL(window.location.href, window.location.origin);
      url.searchParams.append('ajax', true);
      await fetchPageData(url);
    };
  }, []);

  return (
    <AppContextDispatch.Provider value={{ setData, fetchPageData }}>
      <AppStateContext.Provider value={{ ...data, fetching }}>
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
  // eslint-disable-next-line react/forbid-prop-types
  value: PropTypes.object.isRequired
};

export const useAppState = () => React.useContext(AppStateContext);
export const useAppDispatch = () => React.useContext(AppContextDispatch);
