import React from 'react';
import Area from '../../../../lib/components/Area';

export default function MenuItemGroup({ id, name }) {
  return (
    <li className="nav-item">
      <span className="root-label">{name}</span>
      <ul className="item-group">
        <Area id={id} noOuter />
      </ul>
    </li>
  );
}
