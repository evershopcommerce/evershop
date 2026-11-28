import Area from '@components/common/Area.js';
import React from 'react';

export function Header() {
  return (
    <header className="header bg-background">
      {/* Announcement bar area (Announcement bar widget lands here). */}
      <Area
        id="headerTop"
        className="header__top"
        isGlobal
        editableInPageBuilder
      />
      {/* Three columns, constrained to the page width: the menu on the left,
          the logo in the middle, search / account / cart on the right. The
          left and right areas share the free space equally (`flex-1`), so the
          logo sits in the centre of the row; without that, every area was only
          as wide as its content and all three packed to the left.
          Themes lay this row out with their own CSS grid, where the flex
          sizing below has no effect. Do not push an area with an auto margin
          (`ml-auto`): auto margins also act on grid items. */}
      <div className="header__middle page-width flex items-center gap-6 py-6">
        <Area
          id="headerMiddleLeft"
          className="header__middle__left flex flex-1 justify-start items-center"
          isGlobal
          editableInPageBuilder
        />
        <Area
          id="headerMiddleCenter"
          className="header__middle__center flex shrink-0 justify-center items-center"
          isGlobal
          editableInPageBuilder
        />
        <Area
          id="headerMiddleRight"
          className="header__middle__right flex flex-1 justify-end items-center gap-3"
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
