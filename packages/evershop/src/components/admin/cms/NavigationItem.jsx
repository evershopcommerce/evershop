import PropTypes from 'prop-types';
import React from 'react';
import './NavigationItem.scss';

export default function NavigationItem({ Icon, url, title }) {
  const [isActive, setIsActive] = React.useState(false);
  React.useEffect(() => {
    const currentPath = window.location.pathname.replace(/\/$/, '');
    const linkPath = new URL(url).pathname.replace(/\/$/, '');

    const isActiveLink = currentPath === linkPath;

    setIsActive(isActiveLink);
  }, [url]);

  return (
    <li className={isActive ? 'active nav-item' : 'nav-item'}>
      <a href={url} className="flex justify-left">
        <i className="menu-icon">
          <Icon />
        </i>
        {title}
      </a>
    </li>
  );
}

NavigationItem.propTypes = {
  Icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired
};
