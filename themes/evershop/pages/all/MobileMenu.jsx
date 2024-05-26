import PropTypes from "prop-types";
import React, { useState } from "react";
import "./MobileMenu.scss";

export default function MobileMenu({ menu: { items } }) {
  const [show, setShow] = useState(false);

  return (
    <div className="main-menu-mobile self-center">
      <a
        className="menu-icon"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setShow(!show);
        }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </a>
      {show && (
        <ul className="nav justify-content-center bg-[#f9fbf8]">
          <li className="nav-item">
            <a className="nav-link hover:underline" href="/todos-os-produtos">
              Todos os Produtos
            </a>
          </li>
          {items.map((i, index) => (
            <li className="nav-item" key={index}>
              <a className="nav-link hover:underline" href={i.url}>
                {i.name}
              </a>
            </li>
          ))}
          <li className="nav-item">
            <a className="nav-link hover:underline" href="/page/sobrenos">
              Sobre
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link hover:underline" href="/page/contacto">
              Contato
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link hover:underline" href="/page/politica">
              Político 
            </a>
          </li>
           <li className="nav-item">
            <a className="nav-link hover:underline" href="/page/documentos">
              Docs
            </a>
          </li>       
        </ul>
      )}
    </div>
  );
}

MobileMenu.propTypes = {
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
  areaId: "icon-wrapper",
  sortOrder: 50,
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
