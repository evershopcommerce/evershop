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

export const useCartContext = () => React.useContext(CartContext);
export const useCartContextDispatch = () => React.useContext(CartContextDispatch);
