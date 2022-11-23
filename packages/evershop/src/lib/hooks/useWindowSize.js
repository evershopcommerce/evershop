import { useEffect, useState } from 'react';

const useWindowSize = () => {
  const [size, setSize] = useState({});

  useEffect(() => {
    setSize({
      width: window.innerWidth,
      height: window.innerHeight
    });
    window.addEventListener('resize', () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    });
  }, []);

  return size;
};

export { useWindowSize };
