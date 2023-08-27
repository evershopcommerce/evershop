import PropTypes from 'prop-types';
import React from 'react';
import './Dot.scss';

export default function Dot({ size = '1rem', variant = 'primary' }) {
  const dotVariant = [
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
    <span
      className={`${dotVariant} dot`}
      style={{ width: size, height: size }}
    />
  );
}

Dot.propTypes = {
  size: PropTypes.string,
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

Dot.defaultProps = {
  size: '1rem'
};
