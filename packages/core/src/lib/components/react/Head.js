import React from 'react';
import ReactDOM from 'react-dom';
import Area from '../Area';

export default function Head() {
  return ReactDOM.createPortal(
    <Area id="head" noOuter={true} />,
    document.getElementsByTagName('head')[0]
  );
}