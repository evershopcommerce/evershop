import { render, screen } from "@testing-library/react";
// import MiniCart from "@evershop/evershop/src/modules/checkout/pages/frontStore/all/MiniCart";
// import Layout from "@evershop/evershop/src/modules/customer/pages/frontStore/account/Layout";


describe("Testing checkout functionality", () => {
  test("Correct number of items updated when products added to cart", () => {
    const cartUrl = '/cart';
    let cart = { totalQty: 1 };

    const { getByTestId, rerender } = render(
      <MiniCart cartUrl={cartUrl} cart={cart} />
    );

    let cartIcon = getByTestId('cart-icon');
    expect(getByTestId('cart-icon').querySelector('span')).toHaveTextContent('1');

    let updatedCart = { totalQty: 2 };
    rerender(<MiniCart cartUrl={cartUrl} cart={updatedCart} />);

    expect(getByTestId('cart-icon').querySelector('span')).toHaveTextContent('2');
  });
})

describe("Testing user related functionalities", () => {
  test("Correct user's information displayed", () => {
    render(<Layout />);

    expect(screen.getByText("chewbarka")).toBeInTheDocument();
    expect(screen.getByText("chewbarka@example.com")).toBeInTheDocument();
  })
});
