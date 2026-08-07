import React from 'react';

interface RenderIfTrueProps {
  condition: boolean;
  children: React.ReactNode;
}

export default function RenderIfTrue({
  condition,
  children
}: RenderIfTrueProps) {
  return condition === true ? children : null;
}
