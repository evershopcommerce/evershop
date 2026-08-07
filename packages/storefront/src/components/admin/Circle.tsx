import React from 'react';
import './Circle.scss';

export type CircleVariant =
  | 'default'
  | 'success'
  | 'info'
  | 'attention'
  | 'critical'
  | 'warning'
  | 'new';

export interface CircleProps {
  variant: CircleVariant;
}

export function Circle({ variant = 'default' }: CircleProps) {
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
