import PropTypes from 'prop-types';
import React from 'react';
import './Logo.scss';

export default function Logo({ dashboardUrl }) {
  return (
    <div className="logo">
      <a href={dashboardUrl} className="flex items-end">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="254"
          height="292"
          fill="none"
          viewBox="0 0 254 292"
        >
          <path
            fill="url(#paint0_linear_375_2)"
            d="M62.982 36.256L.333 72.512l-.2 72.913L0 218.403l63.048 36.39c34.657 19.994 63.249 36.389 63.582 36.389.333 0 17.595-9.863 38.456-21.86 20.794-12.063 49.185-28.392 63.048-36.389l25.126-14.53v-31.257l-1.466.8c-.867.466-29.258 16.795-63.115 36.389-33.924 19.594-61.982 35.456-62.382 35.39-.467-.133-22.86-12.93-49.852-28.525l-49.12-28.325V88.241L49.52 75.445c12.13-6.998 34.39-19.794 49.386-28.459 14.929-8.664 27.458-15.728 27.725-15.728.267 0 17.662 9.93 38.655 22.06l61.183 34.923 9.649-5.678 17.143-10.05-26.792-15.263C205.274 44.72 127.097-.067 126.43 0c-.4 0-28.992 16.329-63.448 36.256z"
          />
          <path
            fill="url(#paint1_linear_375_2)"
            d="M190.611 108.702c-34.256 19.794-62.781 36.189-63.381 36.323-.667.2-17.395-9.131-39.189-21.661l-38.055-21.993v15.795l.066 15.729 36.99 21.327c20.327 11.73 37.655 21.594 38.522 21.927 1.333.467 10.663-4.665 64.114-35.523 34.39-19.928 62.782-36.389 63.115-36.656.267-.267.4-7.398.334-15.862l-.2-15.396-62.316 35.99z"
          />
          <path
            fill="url(#paint2_linear_375_2)"
            d="M246.262 133.828c-3.666 2.066-31.924 18.395-62.848 36.256-30.925 17.862-56.451 32.457-56.784 32.457-.333 0-17.595-9.863-38.456-21.86l-37.855-21.86-.2 15.329c-.133 11.73.066 15.528.666 16.128 1.267 1.133 75.045 43.588 75.845 43.588.667 0 125.097-71.646 126.164-72.579.266-.267.399-7.398.333-15.929l-.2-15.396-6.665 3.866z"
          />
          <defs>
            <linearGradient
              id="paint0_linear_375_2"
              x1="126.63"
              x2="126.63"
              y1="291.182"
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#00546B" />
              <stop offset="1" stopColor="#27BEA3" />
            </linearGradient>
            <linearGradient
              id="paint1_linear_375_2"
              x1="151.565"
              x2="151.565"
              y1="176.177"
              y2="72.712"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#00546B" />
              <stop offset="1" stopColor="#27BEA3" />
            </linearGradient>
            <linearGradient
              id="paint2_linear_375_2"
              x1="151.612"
              x2="151.612"
              y1="233.866"
              y2="129.962"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#00546B" />
              <stop offset="1" stopColor="#27BEA3" />
            </linearGradient>
          </defs>
        </svg>
        <span className="font-bold">EVERSHOP</span>
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
