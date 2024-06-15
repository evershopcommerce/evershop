import PropTypes from 'prop-types';
import React from 'react';
import './Badge.scss';

export default function Badge({
  title,
  variant = 'default',
  progress = 'default'
}) {
  const badgeVariant = [
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
  const badgeProgress = [
    'incomplete',
    'complete',
    'partiallycomplete'
  ].includes(progress)
    ? `${progress}`
    : 'default';
  return (
    <span className={`${badgeVariant} badge`}>
      <span className={`${badgeProgress} progress rounded-full`}>
        {progress === 'partiallycomplete' && <span />}
      </span>
      <span className="self-center title">{title}</span>
    </span>
  );
}

Badge.propTypes = {
  progress: PropTypes.oneOf(['incomplete', 'complete', 'partiallycomplete'])
    .isRequired,
  title: PropTypes.string.isRequired,
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
