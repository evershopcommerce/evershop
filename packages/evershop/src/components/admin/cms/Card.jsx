import PropTypes from 'prop-types';
import React from 'react';
import './Card.scss';

function Card({ title, actions = [], subdued = false, children }) {
  return (
    <div className={subdued ? 'card shadow subdued' : 'card shadow'}>
      {(title || actions.length > 0) && (
        <div className="flex justify-between card-header">
          {title && <h2 className="card-title">{title}</h2>}
          {actions.length > 0 && (
            <div className="flex space-x-3">
              {actions.map((action, index) => {
                const className = {
                  primary: 'text-primary',
                  critical: 'text-critical',
                  interactive: 'text-interactive',
                  secondary: 'text-secondary'
                };
                return (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={index} className="card-action">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (action.onAction) action.onAction.call();
                      }}
                      className={
                        className[
                          action.variant ? action.variant : 'interactive'
                        ]
                      }
                    >
                      {action.name}
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

Card.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      onAction: PropTypes.func,
      variant: PropTypes.string,
      name: PropTypes.string
    })
  ),
  children: PropTypes.node.isRequired,
  subdued: PropTypes.bool,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node])
};

Card.defaultProps = {
  actions: [],
  subdued: false,
  title: ''
};

const Session = function Session({ actions = [], title, children }) {
  return (
    <div className="card-section border-b box-border">
      {(title || actions.length > 0) && (
        <div className="flex justify-between card-section-header mb-4">
          {title && <h3 className="card-session-title">{title}</h3>}
          {actions.length > 0 && (
            <div className="flex space-x-3">
              {actions.map((action, index) => {
                const className = {
                  primary: 'text-primary',
                  critical: 'text-critical',
                  interactive: 'text-interactive',
                  secondary: 'text-secondary'
                };
                return (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={index} className="card-action">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (action.onAction) action.onAction.call();
                      }}
                      className={
                        className[
                          action.variant ? action.variant : 'interactive'
                        ]
                      }
                    >
                      {action.name}
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <div className="card-session-content pt-lg">{children}</div>
    </div>
  );
};

Session.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      onAction: PropTypes.func,
      variant: PropTypes.string,
      name: PropTypes.string
    })
  ),
  children: PropTypes.node,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node])
};

Session.defaultProps = {
  actions: [],
  title: '',
  children: null
};

Card.Session = Session;

export { Card };
