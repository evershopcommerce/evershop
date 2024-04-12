/* eslint-disable react/jsx-props-no-spreading */
import PropTypes from 'prop-types';
import React from 'react';
import PubSub from 'pubsub-js';
import isEqual from 'react-fast-compare';
import { Checkbox } from '@components/common/form/fields/Checkbox';
import { Date } from '@components/common/form/fields/Date';
import { DateTime } from '@components/common/form/fields/DateTime';
import { Hidden } from '@components/common/form/fields/Hidden';
import { Input } from '@components/common/form/fields/Input';
import { MultiSelect } from '@components/common/form/fields/MultiSelect';
import { Radio } from '@components/common/form/fields/Radio';
import { Select } from '@components/common/form/fields/Select';
import { TextArea } from '@components/common/form/fields/Textarea';
import { Toggle } from '@components/common/form/fields/Toggle';
import { useFormContext } from '@components/common/form/Form';
import { FORM_FIELD_UPDATED } from '@evershop/evershop/src/lib/util/events';
import './Field.scss';
import { Password } from '@components/common/form/fields/Password';

const useMemoizeArgs = (args, equalityFunc) => {
  const ref = React.useRef();
  const prevArgs = ref.current;
  const argsAreEqual =
    prevArgs !== undefined &&
    args.length === prevArgs.length &&
    args.every((v, i) => equalityFunc(v, prevArgs[i]));

  React.useEffect(() => {
    if (!argsAreEqual) {
      ref.current = args;
    }
  });

  return argsAreEqual ? prevArgs : args;
};

export function Field(props) {
  const { name, value, validationRules, onChange, type } = props;
  const context = useFormContext();
  const [fieldValue, setFieldValue] = React.useState(value);
  const field = context.fields.find((f) => f.name && f.name === name);

  React.useEffect(() => {
    context.addField(name, value, validationRules || []);

    return () => {
      context.removeField(name);
    };
  }, [name]);

  React.useEffect(() => {
    setFieldValue(value);
    if (!field) {
      return;
    }
    context.updateField(name, value, validationRules);
  }, useMemoizeArgs([value], isEqual));

  React.useEffect(() => {
    if (field) {
      setFieldValue(field.value);
    }
  }, [field]);

  React.useEffect(() => {
    PubSub.publishSync(FORM_FIELD_UPDATED, { name, value: fieldValue });
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
      case 'password':
        return Password;
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
