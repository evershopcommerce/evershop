import PropTypes from 'prop-types';
import React from 'react';

export default function SuccessMessage({ message, homeUrl }) {
  return (
    <div className="order-success-message">
      <div className="w-100">
        <div>
          <div className="mb-4"><h4>{message}</h4></div>
          <a href={homeUrl} className="btn btn-primary">Home page</a>
        </div>
      </div>
    </div>
  );
}

SuccessMessage.propTypes = {
  homeUrl: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired
};
