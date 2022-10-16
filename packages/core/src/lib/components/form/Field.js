/* eslint-disable react/jsx-props-no-spreading */
import PropTypes from "prop-types";
import React from "react";
import PubSub from 'pubsub-js';
import { Checkbox } from './fields/Checkbox';
import { Date } from './fields/Date';
import { DateTime } from './fields/DateTime';
import { Hidden } from './fields/Hidden';
import { Input } from './fields/Input';
import { MultiSelect } from './fields/MultiSelect';
import { Radio } from './fields/Radio';
import { Select } from './fields/Select';
import { TextArea } from './fields/Textarea';
import { Toggle } from './fields/Toggle';
import { useFormContext } from './Form';
import { FORM_FIELD_UPDATED } from '../../util/events';
import './Field.scss';

export function Field(props) {
  const {
    name,
    value,
    validationRules,
    onChange,
    type
  } = props;
  const context = useFormContext();
  const [fieldValue, setFieldValue] = React.useState('');
  const field = context.fields.find((f) => f.name === name);

  React.useEffect(() => {
    context.addField(name, value, validationRules || []);

    return () => {
      context.removeField(name);
    };
  }, []);

  React.useEffect(() => {
    setFieldValue(value);
    context.updateField(name, value, validationRules);
  }, [value]);

  React.useEffect(() => {
    if (field) setFieldValue(field.value);
  }, [field]);

  React.useEffect(() => {
    PubSub.publishSync(FORM_FIELD_UPDATED, { name: name, value: fieldValue });
  }, [fieldValue]);

  const onChangeFunc = (newValue) => {
    let fieldVal;
    if (typeof newValue === 'object' && newValue !== null && newValue.target) {
      fieldVal = newValue.target.value;
    } else {
      fieldVal = newValue;
    }
    setFieldValue(fieldVal);
    context.updateField(name, fieldVal, validationRules);

    if (onChange) {
      onChange.call(window, newValue, props);
    }
  };

  const F = (() => {
    switch (type) {
      case 'text':
        return Input;
      case 'select':
        return Select;
      case 'multiselect':
        return MultiSelect;
      case 'checkbox':
        return Checkbox;
      case 'radio':
        return Radio;
      case 'toggle':
        return Toggle;
      case 'date':
        return Date;
      case 'datetime':
        return DateTime;
      case 'textarea':
        return TextArea;
      case 'hidden':
        return Hidden;
      default:
        return Input;
    }
  })();
  return (
    <F
      {...props}
      onChange={onChangeFunc}
      value={fieldValue}
      error={field ? field.error : undefined}
    />
  );
}

Field.propTypes = {
  name: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  validationRules: PropTypes.arrayOf(PropTypes.string),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

Field.defaultProps = {
  onChange: undefined,
  validationRules: [],
  value: ''
};
