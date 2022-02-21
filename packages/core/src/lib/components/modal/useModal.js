import React, { useState } from 'react';

const useModal = () => {
  const [isShowing, setIsShowing] = useState(false);
  const [closing, setClosing] = useState(false);

  React.useEffect(() => {
    if (isShowing) setClosing(false);
  }, [isShowing]);

  function toggle() {
    if (isShowing === false) setIsShowing(true);
    else {
      setClosing(true);
    }
  }

  return {
    isShowing,
    close: () => { setIsShowing(false); setClosing(false); },
    closing,
    toggle
  };
};

export { useModal };
