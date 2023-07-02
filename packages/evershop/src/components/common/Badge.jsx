import PropTypes from 'prop-types';
import React from 'react';
import { PROGRESSES, VARIANTS, isValidProgress, isValidVariant } from '../../const/common';
import './Badge.scss';

export default function Badge({
  progress,
  title,
  variant
}) {
  const badgeVariant = isValidVariant(variant);
  const badgeProgress = isValidProgress(progress);
  
  return (
    <span className={`${badgeVariant} badge`}>
      <span className={`${badgeProgress} progress rounded-100`}>
        {progress === 'partiallycomplete' ? <span /> : null}
      </span>
      <span className="self-center title">{title}</span>
    </span>
  );
}

Badge.defaultProps = {
  progress: 'default',
  variant: 'default'
}

Badge.propTypes = {
  progress: PropTypes.oneOf([PROGRESSES]),
  title: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(VARIANTS)
};
