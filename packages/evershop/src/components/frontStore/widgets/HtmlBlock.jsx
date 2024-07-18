import React from 'react';
import PropTypes from 'prop-types';

export default function HtmlBlock({ html, css }) {
  const text = `${html  }<style>${css}</style>`;
  return <div dangerouslySetInnerHTML={{ __html: text }} />;
}

HtmlBlock.propTypes = {
  html: PropTypes.string,
  css: PropTypes.string
};

HtmlBlock.defaultProps = {
  html: '',
  css: ''
};
