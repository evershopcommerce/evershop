const React = require('react');

const AppStateContext = React.createContext();
const AppContextDispatch = React.createContext();

export function AppProvider({ value, children }) {
  const [data, setData] = React.useState(value);
  return (
    <AppContextDispatch.Provider value={setData}>
      <AppStateContext.Provider value={data}>
        {children}
      </AppStateContext.Provider>
    </AppContextDispatch.Provider>
  );
}

export const useAppState = () => React.useContext(AppStateContext);
export const useAppDispatch = () => React.useContext(AppContextDispatch);
