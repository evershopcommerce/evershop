import PropTypes from 'prop-types';
import React from 'react';


export default function CopyRight({ themeConfig: { copyRight } }) {
  return (
    <div className="copyright">
      <span>{copyRight}</span>
    </div>
  );
}

CopyRight.propTypes = {
  themeConfig: PropTypes.shape({
    copyRight: PropTypes.string.isRequired
  })
};

CopyRight.defaultProps = {
  themeConfig: {
    copyRight: '© 2025 Evershop. All Rights Reserved.'
  }
};

export const layout = {
  areaId: 'footerLeft',
  sortOrder: 10
};

export const query = `
  query query {
    themeConfig {
      copyRight
    }
  }
`;
