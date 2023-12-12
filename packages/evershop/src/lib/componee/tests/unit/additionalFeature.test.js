import { render } from "@testing-library/react";
import SearchBox from "@evershop/evershop/src/modules/cms/pages/admin/all/SearchBox";
import MiniCart from "@evershop/evershop/src/modules/checkout/pages/frontStore/all/MiniCart";
import UserIcon from "@evershop/evershop/src/modules/customer/pages/frontStore/all/UserIcon";

describe("Testing newly added feature", () => {
  test("search icon on navbar underlined when hovering", () => {
    render(
      <SearchBox />
    )

    let searchIcon = getByTestId("search-icon");
    expect(searchIcon).toNotHaveStyle("border-bottom: 1px solid");
    fireEvent.mouseEnter(searchIcon);
    expect(searchIcon).toHaveStyle("border-bottom: 1px solid");
    fireEvent.mouseEnter(searchIcon);
    expect(searchIcon).toNotHaveStyle("border-bottom: 1px solid");
  });

  test("cart icon on navbar underlined when hovering", () => {
    render(
      <MiniCart />
    )

    let searchIcon = getByTestId("cart-icon");
    expect(searchIcon).toNotHaveStyle("border-bottom: 1px solid");
    fireEvent.mouseEnter(searchIcon);
    expect(searchIcon).toHaveStyle("border-bottom: 1px solid");
    fireEvent.mouseEnter(searchIcon);
    expect(searchIcon).toNotHaveStyle("border-bottom: 1px solid");
  });

  test("profile icon on navbar underlined when hovering", () => {
    render(
      <UserIcon />
    )

    let searchIcon = getByTestId("user-icon");
    expect(searchIcon).toNotHaveStyle("border-bottom: 1px solid");
    fireEvent.mouseEnter(searchIcon);
    expect(searchIcon).toHaveStyle("border-bottom: 1px solid");
    fireEvent.mouseEnter(searchIcon);
    expect(searchIcon).toNotHaveStyle("border-bottom: 1px solid");
  })
})
