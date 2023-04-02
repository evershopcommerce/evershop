import PropTypes from 'prop-types';
import React from 'react';
import Area from '@components/common/Area';
import NavigationItem from '@components/admin/cms/NavigationItem';
import './NavigationItemGroup.scss';

export default function NavigationItemGroup({
  id,
  name,
  items = [],
  Icon = null,
  url = null
}) {
  return (
    <li className="root-nav-item nav-item">
      <div className="flex justify-between items-center">
        <div className="root-label flex justify-between items-center">
          {Icon && (
            <span>
              <Icon />
            </span>
          )}
          {!url && <span>{name}</span>}
          {url && <a href={url}>{name}</a>}
        </div>
      </div>
      <ul className="item-group">
        <Area
          id={id}
          noOuter
          coreComponents={items.map((item) => ({
            component: {
              // eslint-disable-next-line react/no-unstable-nested-components
              default: () => (
                <NavigationItem
                  Icon={item.Icon}
                  url={item.url}
                  title={item.title}
                />
              )
            }
          }))}
        />
      </ul>
    </li>
  );
}

NavigationItemGroup.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      Icon: PropTypes.elementType,
      url: PropTypes.string,
      title: PropTypes.string.isRequired
    })
  ),
  Icon: PropTypes.elementType,
  url: PropTypes.string
};

NavigationItemGroup.defaultProps = {
  items: [],
  Icon: null,
  url: null
};
