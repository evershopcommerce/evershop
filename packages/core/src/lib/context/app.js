import PropTypes from 'prop-types';
import React from "react";

const AppStateContext = React.createContext();
const AppContextDispatch = React.createContext();

export function AppProvider({ value, children }) {

  // React.useEffect(() => {
  //   window.eContext = undefined;
  // }, []);
  const [data, setData] = React.useState(value);
  return (
    <AppContextDispatch.Provider value={setData}>
      <AppStateContext.Provider value={data}>
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
