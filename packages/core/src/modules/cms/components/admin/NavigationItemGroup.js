import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../lib/components/Area';
import NavigationItem from './NavigationItem';

export default function NavigationItemGroup({ id, name, items = [] }) {
  return (
    <li className="nav-item">
      <span className="root-label">{name}</span>
      <ul className="item-group">
        <Area
          id={id}
          noOuter
          coreComponents={items.map((item) => {
            return {
              component: { default: () => <NavigationItem {...item} /> }
            }
          })}
        />
      </ul>
    </li>
  );
}

NavigationItemGroup.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired
};
