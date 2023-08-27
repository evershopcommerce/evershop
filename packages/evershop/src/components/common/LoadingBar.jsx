/* eslint-disable consistent-return */
import React from 'react';
import { useAppState } from '@components/common/context/app';
import './LoadingBar.scss';

const LoadingBar = function LoadingBar() {
  const { fetching } = useAppState();
  const [width, setWidth] = React.useState(0);
  const widthRef = React.useRef(0);

  React.useEffect(() => {
    widthRef.current = width;
    if (fetching === true) {
      // Random number between 1 and 3
      const step = Math.random() * (3 - 1) + 1;
      // Random number between 85 and 95
      const peak = Math.random() * (95 - 85) + 85;
      if (widthRef.current < peak) {
        const timer = setTimeout(() => setWidth(widthRef.current + step), 0);
        return () => clearTimeout(timer);
      }
    } else if (widthRef.current === 100) {
      setWidth(0);
      widthRef.current = 0;
    } else if (widthRef.current !== 0) {
      setWidth(100);
    }
  });

  return (
    <div
      className="loading-bar"
      style={{
        width: `${width}%`,
        display: fetching === true ? 'block' : 'none'
      }}
    />
  );
};

export default LoadingBar;
