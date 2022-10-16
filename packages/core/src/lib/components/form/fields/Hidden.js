import PropTypes from "prop-types";
import React from "react";

export function Hidden({ name, value }) {
  return (
    <input
      type="text"
      id={name}
      name={name}
      value={value}
      readOnly
      style={{ display: 'none' }}
    />
  );
}

Hidden.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

Hidden.defaultProps = {
  value: undefined
};
