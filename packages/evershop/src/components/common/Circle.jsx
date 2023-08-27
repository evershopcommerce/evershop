import PropTypes from 'prop-types';
import React from 'react';
import './Circle.scss';

export default function Circle({ variant = 'default' }) {
  const circleVariant = [
    'default',
    'success',
    'info',
    'attention',
    'critical',
    'warning',
    'new'
  ].includes(variant)
    ? `${variant}`
    : 'default';
  return (
    <span className={`${circleVariant} circle`}>
      <span className="self-center">
        <span />
      </span>
    </span>
  );
}

Circle.propTypes = {
  variant: PropTypes.oneOf([
    'default',
    'success',
    'info',
    'attention',
    'critical',
    'warning',
    'new'
  ]).isRequired
};
