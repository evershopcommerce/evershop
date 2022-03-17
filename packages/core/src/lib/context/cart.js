import PropTypes from "prop-types"
import React from 'react';

const CartContext = React.createContext();
const CartContextDispatch = React.createContext();

export function CartProvider({ value, children }) {
  const [data, setData] = React.useState(value);
  return (
    <CartContextDispatch.Provider value={setData}>
      <CartContext.Provider value={data}>
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
