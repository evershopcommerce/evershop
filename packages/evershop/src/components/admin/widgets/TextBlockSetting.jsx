import React from 'react';
import PropTypes from 'prop-types';
import { Field } from '@components/common/form/Field';
import Editor from '@components/common/form/fields/Editor';

export default function TextBlockSetting({ text, className }) {
  return (
    <div>
      <Field
        type="text"
        name="settings[className]"
        label="Custom CSS classes"
        value={className}
        validationRules={['notEmpty']}
      />
      <Editor name="settings[text]" label="Content" value={text} />
    </div>
  );
}

TextBlockSetting.propTypes = {
  text: PropTypes.string,
  className: PropTypes.string
};

TextBlockSetting.defaultProps = {
  text: '',
  className: ''
};
