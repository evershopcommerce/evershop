import PropTypes from 'prop-types';
import React from 'react';
import { VARIANTS, isValidVariant } from '../../const/common';
import './Circle.scss';

export default function Circle({ variant }) {
  const circleVariant = isValidVariant(variant);
  return (
    <span className={`${circleVariant} circle`}>
      <span className="self-center">
        <span />
      </span>
    </span>
  );
}

Circle.defaultProps = {
  variant: 'default'
}

Circle.propTypes = {
  variant: PropTypes.oneOf(VARIANTS)
};
