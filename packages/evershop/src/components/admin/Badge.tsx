import React from 'react';
import './Badge.scss';

export type BadgeProps = {
  title: string;
  variant?:
    | 'default'
    | 'success'
    | 'info'
    | 'attention'
    | 'critical'
    | 'warning'
    | 'new';
  progress?: 'incomplete' | 'complete' | 'partiallycomplete' | 'default';
};

export function Badge({
  title,
  variant = 'default',
  progress = 'default'
}: BadgeProps) {
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
    'partiallycomplete',
    'default'
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
