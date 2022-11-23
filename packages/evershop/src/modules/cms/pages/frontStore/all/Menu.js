import React from 'react';
import './Menu.scss';

export default function Menu({ menu: { items } }) {
  return (
    <div className="main-menu self-center hidden md:block">
      <ul className="nav flex space-x-275 justify-content-center">
        {items.map((i, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <li className="nav-item" key={index}>
            <a className="nav-link hover:underline" href={i.url}>{i.name}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const layout = {
  areaId: "header",
  sortOrder: 5
}

export const query = `
  query {
    menu {
      items {
        name
        url
      }
    }
}`;