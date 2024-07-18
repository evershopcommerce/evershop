import React from 'react';
import PropTypes from 'prop-types';
import { TextArea } from '@components/common/form/fields/Textarea';

export default function HtmlBlockSetting({ html, css }) {
  return (
    <div>
      <TextArea name="settings[html]" label="HTML" value={html} />
      <TextArea name="settings[css]" label="Stylesheet" value={css} />
    </div>
  );
}

HtmlBlockSetting.propTypes = {
  html: PropTypes.string,
  css: PropTypes.string
};

HtmlBlockSetting.defaultProps = {
  html: '',
  css: ''
};
