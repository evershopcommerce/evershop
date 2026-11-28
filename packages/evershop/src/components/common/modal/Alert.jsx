import { Button } from '@components/common/ui/Button.js';
import { useAsyncAction } from '@components/common/ui/hooks/useAsyncAction.js';
import { assign } from '@evershop/evershop/lib/util/assign';
import { produce } from 'immer';
import PropTypes from 'prop-types';
import React, { useReducer } from 'react';
import ReactDOM from 'react-dom';

import './Alert.scss';
import { Card } from '@components/common/ui/Card';
import {
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';

const AlertContext = React.createContext();
export const useAlertContext = () => React.useContext(AlertContext);

function reducer(state, action) {
  switch (action.type) {
    case 'close':
      return { ...state, showing: false, closing: false };
    case 'closing':
      return { ...state, showing: true, closing: true };
    case 'open':
      return { ...state, showing: true, closing: false };
    default:
      throw new Error();
  }
}

const alertReducer = produce((draff, action) => {
  switch (action.type) {
    case 'open':
      draff = { ...action.payload };
      return draff;
    case 'remove':
      return {};
    case 'update':
      assign(draff, action.payload);
      return draff;
    default:
      throw new Error();
  }
});

/**
 * A footer button of the alert. When its `onAction` returns a promise (a
 * bulk delete, a status change), it shows a spinner until the promise
 * settles, and keeps it while the page reloads after a success. The caller's
 * `isLoading` still works for callers that manage it through `dispatchAlert`.
 */
function AlertActionButton({ action }) {
  const [run, running] = useAsyncAction((event) => action.onAction?.(event));
  return (
    <Button
      onClick={run}
      variant={action.variant}
      isLoading={action.isLoading || running}
    >
      {action.title}
    </Button>
  );
}

AlertActionButton.propTypes = {
  action: PropTypes.shape({
    title: PropTypes.node,
    onAction: PropTypes.func,
    variant: PropTypes.string,
    isLoading: PropTypes.bool
  }).isRequired
};

function Alert({ children }) {
  const [alert, dispatchAlert] = useReducer(alertReducer, {});
  const [state, dispatch] = useReducer(reducer, {
    showing: false,
    closing: false
  });

  const openAlert = ({ heading, content, primaryAction, secondaryAction }) => {
    dispatchAlert({
      type: 'open',
      payload: {
        heading,
        content,
        primaryAction,
        secondaryAction
      }
    });
    dispatch({ type: 'open' });
  };

  return (
    <AlertContext.Provider
      value={{
        dispatchAlert,
        openAlert,
        closeAlert: () => dispatch({ type: 'closing' })
      }}
    >
      {children}
      {state.showing === true &&
        ReactDOM.createPortal(
          <div
            className={
              state.closing === false
                ? 'modal-overlay fadeIn'
                : 'modal-overlay fadeOut'
            }
            onAnimationEnd={() => {
              if (state.closing) {
                dispatch({ type: 'close' });
                dispatchAlert({ type: 'remove' });
              }
            }}
          >
            <div
              key={state.key}
              className="modal-wrapper flex self-center justify-center"
              aria-modal
              aria-hidden
              tabIndex={-1}
              role="dialog"
            >
              <div className="modal">
                <Card>
                  {alert.heading && (
                    <CardHeader>
                      <CardTitle>{alert.heading}</CardTitle>
                    </CardHeader>
                  )}
                  <CardContent>{alert.content}</CardContent>
                  {(alert.primaryAction !== undefined ||
                    alert.secondaryAction !== undefined) && (
                    <CardFooter>
                      <div className="flex justify-end space-x-2 w-full">
                        {alert.primaryAction && (
                          <AlertActionButton action={alert.primaryAction} />
                        )}
                        {alert.secondaryAction && (
                          <AlertActionButton action={alert.secondaryAction} />
                        )}
                      </div>
                    </CardFooter>
                  )}
                </Card>
              </div>
            </div>
          </div>,
          document.body
        )}
    </AlertContext.Provider>
  );
}

Alert.propTypes = {
  children: PropTypes.node.isRequired
};

export { Alert };
