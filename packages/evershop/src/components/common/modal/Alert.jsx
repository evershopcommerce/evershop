/* eslint-disable react/jsx-closing-tag-location */
/* eslint-disable react/jsx-no-constructed-context-values */
/* eslint-disable react/jsx-props-no-spreading */
import PropTypes from 'prop-types';
import React, { useReducer } from 'react';
import ReactDOM from 'react-dom';
import produce from 'immer';
import Button from '@components/common/form/Button';
import { assign } from '@evershop/evershop/src/lib/util/assign';
import './Alert.scss';
import { Card } from '@components/admin/cms/Card';

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
      // eslint-disable-next-line no-param-reassign
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
                <button
                  type="button"
                  className="modal-close-button text-icon"
                  onClick={() => dispatch({ type: 'closing' })}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="2rem"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <Card title={alert.heading}>
                  <Card.Session>{alert.content}</Card.Session>
                  {(alert.primaryAction !== undefined ||
                    alert.secondaryAction !== undefined) && (
                    <Card.Session>
                      <div className="flex justify-end space-x-4">
                        {alert.primaryAction && (
                          <Button {...alert.primaryAction} />
                        )}
                        {alert.secondaryAction && (
                          <Button {...alert.secondaryAction} />
                        )}
                      </div>
                    </Card.Session>
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
