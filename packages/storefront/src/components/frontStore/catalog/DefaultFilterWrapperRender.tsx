import React from 'react';

export const DefaultFilterWrapperRender: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="filter__section">
    <div className="filter__title font-medium mb-3">{title}</div>
    <div className="filter__content">{children}</div>
  </div>
);
