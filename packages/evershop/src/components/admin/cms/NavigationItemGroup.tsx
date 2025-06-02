import {
  NavigationItem,
  NavigationItemProps
} from '@components/admin/cms/NavigationItem.jsx';
import Area from '@components/common/Area.jsx';
import React from 'react';
import './NavigationItemGroup.scss';

interface NavigationItemGroupProps {
  id: string;
  name: string;
  items: NavigationItemProps[];
  Icon: React.ElementType | null;
  url: string | null;
}

export function NavigationItemGroup({
  id,
  name,
  items = [],
  Icon = null,
  url = null
}: NavigationItemGroupProps) {
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

NavigationItemGroup.defaultProps = {
  items: [],
  Icon: null,
  url: null
};
