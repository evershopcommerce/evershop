/* eslint-disable react/jsx-props-no-spreading */
import PropTypes from 'prop-types';
import React from 'react';
import Error from '@components/common/form/fields/Error';
import '../Field.scss';

const inputProps = function buidProps(props) {
  const obj = {};
  [
    'autocomplete',
    'autofocus',
    'dirname',
    'disabled',
    'form',
    'maxlength',
    'minlength',
    'name',
    'pattern',
    'placeholder',
    'readonly',
    'onChange',
    'onFocus',
    'onBlur',
    'onKeyPress',
    'onKeyDown',
    'onKeyUp',
    'value'
  ].forEach((a) => {
    if (props[a]) obj[a] = props[a];
    obj.defaultValue = props.value;
  });

  return obj;
};

const Input = React.forwardRef((props, ref) => {
  const { label, name, instruction, prefix, suffix, error } = props;
  return (
    <div className={`form-field-container ${error ? 'has-error' : null}`}>
      {label && <label htmlFor={name}>{label}</label>}
      <div className="field-wrapper flex flex-grow">
        {prefix && <div className="field-prefix align-middle">{prefix}</div>}
        <input type="text" {...inputProps(props)} ref={ref} />
        <div className="field-border" />
        {suffix && <div className="field-suffix">{suffix}</div>}
      </div>
      {instruction && (
        <div className="field-instruction mt-sm">{instruction}</div>
      )}
      <Error error={error} />
    </div>
  );
});

Input.propTypes = {
  error: PropTypes.string,
  instruction: PropTypes.string,
  label: PropTypes.string,
  name: PropTypes.string,
  prefix: PropTypes.node,
  suffix: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

Input.defaultProps = {
  error: undefined,
  instruction: undefined,
  label: undefined,
  prefix: undefined,
  suffix: undefined,
  name: undefined,
  value: undefined
};

export { Input };
