import React from 'react';
import PropTypes from 'prop-types';
import { Field } from '@components/common/form/Field';

export default function TidioWidgetSetting({
  tidioWidget: { text }
}) {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <p>Enter Tidio's script code below</p><br />
      <p>Enter content in AREA Enter Enter</p>
      <p>Select ALL from Page</p>
      <p>Sort order Enter 1</p>

      <Field
        type="textarea"
        name="settings[text]"
        placeholder='<script src="//code.tidio.co/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.js" async></script>'
        label="Code"
        value={text}
        style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
      />
    </div>
  );
}

TidioWidgetSetting.propTypes = {
  tidioWidget: PropTypes.shape({
    text: PropTypes.string,
  })
};

TidioWidgetSetting.defaultProps = {
  tidioWidget: {
    text: null,
  }
};

export const query = `
  query Query($settings: JSON) {
    tidioWidget(settings: $settings) {
      text
    }
  }
`;

export const variables = `{
  settings: getWidgetSetting()
}`;