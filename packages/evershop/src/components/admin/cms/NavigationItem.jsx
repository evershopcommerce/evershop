import PropTypes from 'prop-types';
import React from 'react';
import './NavigationItem.scss';

export default function NavigationItem({ Icon, url, title }) {
  const [isActive, setIsActive] = React.useState(false);
 
 React.useEffect(() => {
  // TODO: Fix me
  const currentPath = window.location.pathname;
  const specialPath = ['/admin/products/new', '/admin/coupon/new', '/admin'];

  // Check if the current path is one of the special paths
  if (specialPath.includes(currentPath)) {
    // If the current path matches the URL, set the active state to true
    if (currentPath === url) {
      setIsActive(true);
    }
    return;
  }

  // Check if the current path starts with the URL and is not the dashboard
  if (currentPath.startsWith(url) && url !== '/admin') {
    setIsActive(true);
  }
}, []);

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
  Icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired
};
