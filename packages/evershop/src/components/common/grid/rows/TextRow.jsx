import PropTypes from 'prop-types';
import React from 'react';

export default function TextRow({ text }) {
  return <td>{text}</td>;
}

TextRow.propTypes = {
  text: PropTypes.string.isRequired
};
