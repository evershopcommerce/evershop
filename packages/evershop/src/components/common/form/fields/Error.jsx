import PropTypes from 'prop-types';
import React from 'react';

function Error({ error }) {
  if (!error) return null;
  return (
    <div className="field-error pt025 flex">
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM9 9a1 1 0 0 0 2 0V7a1 1 0 1 0-2 0v2zm0 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" />
      </svg>
      <span className="pl025 text-critical">{error}</span>
    </div>
  );
}

Error.propTypes = {
  error: PropTypes.string
};

Error.defaultProps = {
  error: undefined
};

export default Error;
