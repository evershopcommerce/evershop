import React from 'react';
import ReactDOM from 'react-dom';
import Area from '@components/common/Area';

export default function Head() {
  return ReactDOM.createPortal(
    <Area id="head" noOuter />,
    document.getElementsByTagName('head')[0]
  );
}
