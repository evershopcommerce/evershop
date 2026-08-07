import Area from '@components/common/Area.js';
import React from 'react';
import './Header.scss';

export function Header() {
  return (
    <header className="header">
      <Area id="headerTop" className="header__top" />
      <div className="page-width">
        <div className="header__middle">
          <Area
            id="headerMiddleLeft"
            className="header__middle__left flex justify-start items-center gap-6 min-w-0"
          />
          <Area
            id="headerMiddleCenter"
            className="header__middle__center flex justify-center items-center"
          />
          <Area
            id="headerMiddleRight"
            className="header__middle__right flex justify-end items-center gap-1 sm:gap-2"
          />
        </div>
      </div>
      <Area id="headerBottom" className="header__bottom" />
    </header>
  );
}
