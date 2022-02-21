import React from 'react';
import { useAppState } from '../../../../lib/context/app';
import { get } from '../../../../lib/util/get';

export default function MobileMenu() {
  const items = get(useAppState(), 'menuItems', []);
  const [show, setShow] = React.useState(false);

  return (
    <div className="main-menu-mobile self-center">
      <a className="menu-icon" href="#" onClick={(e) => { e.preventDefault(); setShow(!show); }}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </a>
      {show && (
        <ul className="nav justify-content-center">
          {items.map((i, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <li className="nav-item" key={index}>
              <a className="nav-link" href={i.url}>{i.name}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
