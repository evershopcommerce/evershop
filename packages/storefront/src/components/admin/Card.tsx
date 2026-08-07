import React from 'react';

import './Card.scss';

export interface CardProps {
  title?: string | React.ReactNode;
  actions?: Array<{
    onAction?: () => void;
    variant?: 'primary' | 'secondary' | 'critical' | 'interactive';
    name: string;
  }>;
  subdued?: boolean;
  children: React.ReactNode;
}

function Card({ title, actions = [], subdued = false, children }: CardProps) {
  return (
    <div className={subdued ? 'card shadow subdued' : 'card shadow'}>
      {(title || actions.length > 0) && (
        <div className="flex justify-between card-header">
          {title && <h2 className="card-title">{title}</h2>}
          {actions.length > 0 && (
            <div className="flex space-x-2">
              {actions.map((action, index) => {
                const className = {
                  primary: 'text-primary',
                  critical: 'text-critical',
                  interactive: 'text-interactive',
                  secondary: 'text-secondary'
                };
                return (
                  <div key={index} className="card-action">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (action.onAction) action.onAction.call(null);
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

Card.defaultProps = {
  actions: [],
  subdued: false,
  title: ''
};

export interface CardSessionProps {
  actions?: Array<{
    onAction?: () => void;
    variant?: 'primary' | 'secondary' | 'critical' | 'interactive';
    name: string;
  }>;
  title?: string | React.ReactNode;
  children: React.ReactNode;
}

const Session = function Session({
  actions = [],
  title,
  children
}: CardSessionProps) {
  return (
    <div className="card-section border-b box-border">
      {(title || actions.length > 0) && (
        <div className="flex justify-between card-section-header mb-2">
          {title && <h3 className="card-session-title">{title}</h3>}
          {actions.length > 0 && (
            <div className="flex space-x-2">
              {actions.map((action, index) => {
                const className = {
                  primary: 'text-primary',
                  critical: 'text-critical',
                  interactive: 'text-interactive',
                  secondary: 'text-secondary'
                };
                return (
                  <div key={index} className="card-action">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (action.onAction) action.onAction.call(null);
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

Session.defaultProps = {
  actions: [],
  title: '',
  children: null
};

Card.Session = Session;

export { Card };
