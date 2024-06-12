import React from 'react';
import './Logo.scss';
import PropTypes from 'prop-types';

export default function Logo({ dashboardUrl }) {
  return (
    <div className="logo">
      <a href={dashboardUrl} className="flex items-end">
        {/* Substitua o SVG pelo elemento img com o URL do seu logotipo */}
        <img
          src="https://a.e-moio.com/emoiologo.webp"
          alt="Logotipo"
          width="120"
          height="54.4"
        />
       <span className="font-bold">✔️ </span>
    </a>
    </div>
  );
}

Logo.propTypes = {
  dashboardUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'header',
  sortOrder: 10
};

export const query = `
  query Query {
    dashboardUrl: url(routeId:"dashboard")
  }
`;
