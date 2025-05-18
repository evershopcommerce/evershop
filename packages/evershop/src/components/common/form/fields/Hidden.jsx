import Error from '@components/common/form/fields/Error';
import PropTypes from 'prop-types';
import React from 'react';

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
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  error: PropTypes.string
};

Hidden.defaultProps = {
  value: undefined,
  error: undefined
};
