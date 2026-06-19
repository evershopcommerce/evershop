import Area from '@components/common/Area.js';
import React from 'react';

export function Header() {
  return (
    <header className="header">
      <Area
        id="headerTop"
        className="header__top"
        isGlobal
        editableInPageBuilder
      />
      <div className="header__middle grid grid-cols-3 px-6 py-3">
        <Area
          id="headerMiddleLeft"
          className="header__middle__left flex justify-start items-center"
          isGlobal
          editableInPageBuilder
        />
        <Area
          id="headerMiddleCenter"
          className="header__middle__center flex justify-center items-center"
          isGlobal
          editableInPageBuilder
        />
        <Area
          id="headerMiddleRight"
          className="header__middle__right flex justify-end items-center gap-3"
          isGlobal
          editableInPageBuilder
        />
      </div>
      <Area
        id="headerBottom"
        className="header__bottom"
        isGlobal
        editableInPageBuilder
      />
    </header>
  );
}
