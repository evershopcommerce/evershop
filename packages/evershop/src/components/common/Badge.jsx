import PropTypes from 'prop-types';
import React from 'react';
import './Badge.scss';

const VARIANTS = [
  'attention',
  'critical',
  'default',
  'info',
  'new',
  'success',
  'warning'
];

const PROGRESSES = [
  'complete',
  'incomplete',
  'partiallycomplete'
];

export default function Badge({
  progress,
  title,
  variant
}) {
  const badgeVariant = VARIANTS.indexOf(variant) !== -1 ? variant : 'default';
  const badgeProgress = PROGRESSES.indexOf(variant) !== -1 ? progress : 'default';
  
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
