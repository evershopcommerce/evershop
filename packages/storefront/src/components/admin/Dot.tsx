import React from 'react';
import './Dot.scss';

export type DotProps = {
  size?: string;
  variant?:
    | 'default'
    | 'primary'
    | 'success'
    | 'info'
    | 'attention'
    | 'critical'
    | 'warning'
    | 'new';
};

export function Dot({ size = '1rem', variant = 'primary' }: DotProps) {
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
