import React, { createContext, useReducer, useContext, ReactNode } from 'react';

// --- TYPE DEFINITIONS ---

// The shape of the user object
interface User {
  id: number;
  email: string;
  name: string;
}

// The shape of the global application state
interface AppState {
  user: User | null;
  isLoggedIn: boolean;
  currency: string;
  language: string;
  // Add other global states here (e.g., toast messages)
}

// The shape of the actions that can be dispatched
type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_CURRENCY'; payload: string };

// --- INITIAL STATE ---

// This is the default state if no initial state is provided from the server.
const initialState: AppState = {
  user: null,
  isLoggedIn: false,
  currency: 'USD',
  language: 'en'
};

// --- REDUCER ---

// The reducer function handles state transitions.
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isLoggedIn: !!action.payload
      };
    case 'SET_CURRENCY':
      return {
        ...state,
        currency: action.payload
      };
    default:
      return state;
  }
};

// --- CONTEXT DEFINITION ---

// We create two separate contexts for performance.
// One for the state, and one for the dispatch function.
const AppStateContext = createContext<AppState>(initialState);
const AppDispatchContext = createContext<React.Dispatch<AppAction> | undefined>(
  undefined
);

// --- PROVIDER COMPONENT ---

interface AppProviderProps {
  children: ReactNode;
  // `pageProps` will be populated by the server with the initial state for hydration.
  pageProps: {
    appState?: Partial<AppState>;
    [key: string]: any;
  };
}

/**
 * The AppProvider is the component that wraps the entire application.
 * It initializes the state with data from the server (hydration)
 * and provides the state and dispatch function to all child components.
 */
export const AppProvider = ({ children, pageProps }: AppProviderProps) => {
  // The initial state is a combination of the default state and the
  // state provided by the server via `pageProps`.
  const hydratedState = { ...initialState, ...pageProps.appState };
  const [state, dispatch] = useReducer(appReducer, hydratedState);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
};

// --- CUSTOM HOOKS ---

/**
 * Custom hook to access the global application state.
 * Usage: const { user, isLoggedIn } = useAppState();
 */
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
};

/**
 * Custom hook to access the dispatch function for dispatching actions.
 * Usage: const dispatch = useAppDispatch();
 *        dispatch({ type: 'SET_USER', payload: newUser });
 */
export const useAppDispatch = () => {
  const context = useContext(AppDispatchContext);
  if (context === undefined) {
    throw new Error('useAppDispatch must be used within an AppProvider');
  }
  return context;
};

/*
 * HOW TO USE THIS IN YOUR APPLICATION
 *
 * 1. In your main layout/entry file, wrap your application with the AppProvider.
 *    You MUST pass the server-provided pageProps to it.
 *
 *    // Example in a root layout component
 *    export default function Layout({ children, pageProps }) {
 *      return (
 *        <AppProvider pageProps={pageProps}>
 *          <CartProvider pageProps={pageProps}> // We will create this next
 *             // ... your other components
 *             {children}
 *          </CartProvider>
 *        </AppProvider>
 *      );
 *    }
 *
 * 2. In any child component, use the custom hooks to access state or dispatch actions.
 *
 *    // Example in a Header component
 *    import { useAppState, useAppDispatch } from './app';
 *
 *    function Header() {
 *      const { user, isLoggedIn } = useAppState();
 *      const dispatch = useAppDispatch();
 *
 *      const handleLogout = () => {
 *        // Make API call to log out...
 *        // On success:
 *        dispatch({ type: 'SET_USER', payload: null });
 *      }
 *
 *      return (
 *        <header>
 *          {isLoggedIn ? `Welcome, ${user.name}` : 'Welcome, Guest'}
 *        </header>
 *      );
 *    }
 */
