import PropTypes from "prop-types";
import React from "react";

export default function Menu({ menu: { items } }) {
  const [showNavMenu, setShowNavMenu] = React.useState(false);

  return (
    <nav className="h-full hidden md:block">
      <ul className="h-full space-x-275 justify-content-center items-center flex">
        <li className="h-full flex items-center relative" onClick={e => { setShowNavMenu(!showNavMenu) }} href={"#"} onMouseOver={(e) => { setShowNavMenu(true); }} onMouseLeave={(e) => { setShowNavMenu(false) }}>
          <span className="text-[1.6rem] hover:underline cursor-pointer">
            Shop
          </span>
          {showNavMenu && (
            <ul className="absolute min-w-[18rem] -ml-2 top-6 z-50 p-15 bg-[#f9fbf8] justify-content-left border-header-border border-b border-x">
              {[{ name: "All Products", url: "/all" }, ...items].map((i, index) => (
                <li className="py-15 border-border first:border-t border-b" key={index}>
                  <a className="text-[1.6rem] hover:underline" href={i.url}>
                    {i.name}
                  </a>
                </li>
              ))}
            </ul>)
          }
        </li>
        <li className="h-full flex items-center">
          <a className="text-[1.6rem] hover:underline" href="/page/about">
            About
          </a>
        </li>
        <li className="h-full flex items-center">
          <a className="text-[1.6rem] hover:underline" href="/page/contact">
            Contact
          </a>
        </li>
      </ul>
    </nav>
  );
}

Menu.propTypes = {
  menu: PropTypes.shape({
    items: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        url: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
};

export const layout = {
  areaId: "header",
  sortOrder: 1,
};

export const query = `
  query {
    menu {
      items {
        name
        url
      }
    }
}`;
