import React from 'react';
import PropTypes from 'prop-types';
import Editor from '@components/common/Editor';

export default function TextBlock({ text }) {
  return <Editor rows={text} />;
}

TextBlock.propTypes = {
  text: PropTypes.string
};

TextBlock.defaultProps = {
  text: []
};
