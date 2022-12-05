import PropTypes from 'prop-types';
import React from 'react';
import Error from './Error';

export function Hidden({ name, value, error }) {
  return (
    <>
      {error && <Error error={error} />}
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        readOnly
        style={{ display: 'none' }}
      />
    </>
  );
}

Hidden.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

Hidden.defaultProps = {
  value: undefined
};
