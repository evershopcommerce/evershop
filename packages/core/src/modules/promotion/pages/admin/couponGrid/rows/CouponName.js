import PropTypes from 'prop-types';
import React from 'react';

export default function CouponName({ url, name }) {
  return (
    <td>
      <div>
        <a className="hover:underline font-semibold" href={url}>{name}</a>
      </div>
    </td>
  );
}

PageName.propTypes = {
  name: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired
};
