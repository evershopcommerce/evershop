import { useReducer } from 'react';
import './Alert.scss';

function reducer(state, action) {
  switch (action.type) {
    case 'close':
      return { ...state, showing: false, closing: false };
    case 'closing':
      return { ...state, showing: true, closing: true };
    case 'open':
      return { ...state, showing: true, closing: false };
    default:
      throw new Error();
  }
}

const useModal = () => {
  const [state, dispatch] = useReducer(reducer, {
    showing: false,
    closing: false
  });

  const openModal = () => {
    dispatch({
      type: 'open'
    });
  };

  const closeModal = () => {
    dispatch({
      type: 'closing'
    });
  };

  const onAnimationEnd = () => {
    if (state.closing) {
      dispatch({ type: 'close' });
    }
  };

  return {
    state,
    openModal,
    closeModal,
    onAnimationEnd,
    className:
      state.closing === false ? 'modal-overlay fadeIn' : 'modal-overlay fadeOut'
  };
};

export { useModal };
