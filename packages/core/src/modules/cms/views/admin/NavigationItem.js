import PropTypes from 'prop-types';
import React from 'react';
import './NavigationItem.scss';

function Icon({ name }) {
  try {
    // eslint-disable-next-line global-require
    const ICON = require(`@heroicons/react/solid/${name}.js`);
    return <ICON />;
  } catch (e) {
    return (null);
  }
}

Icon.propTypes = {
  name: PropTypes.string.isRequired
};

export default function MenuItem({ icon, url, title }) {
  const [isActive, setIsActive] = React.useState(false);
  React.useEffect(() => {
    const currentUrl = window.location.href;
    const baseUrl = window.location.origin;
    const check = currentUrl.split(baseUrl + url);
    if (check.length === 2 && url.indexOf('products/new') === -1) { // TODO: Fix me
      if (url.split('/').length === 2) {
        if (check[1] === '' || !/^\/[a-zA-Z1-9]/.test(check[1])) {
          setIsActive(true);
        }
      } else {
        setIsActive(true);
      }
    }
  }, []);

  return (
    <li className={isActive ? 'active nav-item' : 'nav-item'}>
      <a href={url} className="flex justify-left">
        <i className="menu-icon">
          <Icon name={icon} />
        </i>
        {title}
      </a>
    </li>
  );
}

MenuItem.propTypes = {
  icon: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired
};
