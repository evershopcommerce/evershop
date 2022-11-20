import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../lib/components/Area';
import Open from '@heroicons/react/solid/esm/ChevronDoubleDownIcon';
import Close from '@heroicons/react/solid/esm/ChevronDoubleUpIcon';
import NavigationItem from './NavigationItem';
import './NavigationItemGroup.scss';

export default function NavigationItemGroup({ id, name, items = [], isOpen = false, Icon = null }) {
  const [open, setOpen] = React.useState(isOpen);

  return (
    <li className={open ? 'root-nav-item nav-item opening' : 'root-nav-item nav-item closed'}>
      <div className='flex justify-between items-center'>
        <div className="root-label flex justify-between items-center">
          {Icon && <span><Icon /></span>}
          <span>{name}</span>
        </div>
        <span className='controller'>
          {open && <a>
            <Open width={15} height={15} onClick={() => setOpen(false)} />
          </a>}
          {!open && <a>
            <Close width={15} height={15} onClick={() => setOpen(true)} />
          </a>}
        </span>
      </div>
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
