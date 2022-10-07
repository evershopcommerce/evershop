import PropTypes from "prop-types"
import React from 'react';

const CartContext = React.createContext();
const CartContextDispatch = React.createContext();

export function CartProvider({ id, children }) {
  const [id, setId] = React.useState(undefined);

  const getData = () => {
    fetch()
  };

  return (
    <CartContextDispatch.Provider value={getData}>
      <CartContext.Provider value={id}>
        {children}
      </CartContext.Provider>
    </CartContextDispatch.Provider>
  );
}

CartProvider.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  value: PropTypes.object.isRequired
};

export const useCartContext = () => React.useContext(CartContext);
export const useCartContextDispatch = () => React.useContext(CartContextDispatch);
