import { Field } from '@components/common/form/Field';
import { Editor } from '@components/common/form/fields/Editor.js';
import PropTypes from 'prop-types';
import React from 'react';

export default function TextBlockSetting({ textWidget: { text, className } }) {
  return (
    <div>
      <Field
        type="text"
        name="settings[className]"
        label="Custom css classes"
        value={className}
        placeholder="Custom css classes"
      />
      <Editor name="settings[text]" label="Content" value={text} />
    </div>
  );
}

TextBlockSetting.propTypes = {
  textWidget: PropTypes.shape({
    text: PropTypes.array,
    className: PropTypes.string
  })
};

TextBlockSetting.defaultProps = {
  textWidget: {
    text: [],
    className: ''
  }
};

export const query = `
  query Query($text: String, $className: String) {
    textWidget(text: $text, className: $className) {
      text
      className
    }
  }
`;

export const variables = `{
  text: getWidgetSetting("text"),
  className: getWidgetSetting("className")
}`;
