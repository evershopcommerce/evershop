import PropTypes from 'prop-types';
import React from 'react';
import { VARIANTS, isValidVariant } from '../../const/common';
import './Dot.scss';

export default function Dot({ size, variant}) {
  const dotVariant = isValidVariant(variant)
  return (
    <span
      className={`${dotVariant} dot`}
      style={{ width: size, height: size }}
    />
  );
}

Dot.propTypes = {
  size: PropTypes.string,
  variant: PropTypes.oneOf(VARIANTS)
};

Dot.defaultProps = {
  size: '1rem',
  variant: 'primary'
};
