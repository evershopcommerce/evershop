import React from 'react';
import './Button.scss';

export interface ButtonProps {
  title: string | React.ReactNode;
  outline?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  onAction?: () => void;
  url?: string;
  isLoading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  title,
  outline = false,
  variant = 'primary',
  onAction,
  url = undefined,
  isLoading = false,
  type = 'button',
  className: _className = ''
}) => {
  const className = ['button', variant];
  if (outline === true) className.push('outline');
  if (isLoading === true) className.push('loading');
  if (_className) className.push(_className);

  const onActionFunc = (e) => {
    e.preventDefault();
    if (isLoading === true) return;
    onAction && onAction();
  };

  if (!url) {
    return (
      <button
        type={type}
        onClick={(e) => {
          if (type !== 'submit') {
            e.preventDefault();
            onActionFunc(e);
          } else {
            e.stopPropagation();
          }
        }}
        className={className.join(' ')}
      >
        <span>{title}</span>
        {isLoading === true && (
          <svg
            style={{
              background: 'rgb(255, 255, 255, 0)',
              display: 'block',
              shapeRendering: 'auto'
            }}
            width="2rem"
            height="2rem"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid"
          >
            <circle
              cx="50"
              cy="50"
              fill="none"
              stroke="#5c5f62"
              strokeWidth="10"
              r="43"
              strokeDasharray="202.63272615654165 69.54424205218055"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                repeatCount="indefinite"
                dur="1s"
                values="0 50 50;360 50 50"
                keyTimes="0;1"
              />
            </circle>
          </svg>
        )}
      </button>
    );
  } else {
    return (
      <a href={url} className={className.join(' ')}>
        <span>{title}</span>
      </a>
    );
  }
};

export default Button;
