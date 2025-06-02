import Area from '@components/common/Area';
import React from 'react';
import ReactDOM from 'react-dom';

export default function Head() {
  return ReactDOM.createPortal(
    <Area id="head" noOuter />,
    document.getElementsByTagName('head')[0]
  );
}
