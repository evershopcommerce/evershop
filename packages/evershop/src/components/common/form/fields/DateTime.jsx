import PropTypes from 'prop-types';
import React from 'react';
import Error from '@components/common/form/fields/Error';
import flatpickr from './Flatpickr';
import '../Field.scss';

const DateTime = React.forwardRef((props, ref) => {
  const {
    name,
    value,
    label,
    onChange,
    error,
    suffix,
    prefix,
    placeholder,
    instruction
  } = props;

  const inputRef = ref || React.createRef();

  React.useEffect(() => {
    const instance = flatpickr(inputRef.current, { enableTime: true });
    instance.config.onChange.push((selectedDates, dateStr) => {
      if (onChange) onChange.call(window, dateStr);
    });
  }, []);

  return (
    <div className={`form-field-container ${error ? 'has-error' : null}`}>
      {label && <label htmlFor={name}>{label}</label>}
      <div className="field-wrapper flex flex-grow">
        {prefix && <div className="field-prefix align-middle">{prefix}</div>}
        <input
          type="text"
          className="form-field"
          id={name}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          ref={inputRef}
        />
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

DateTime.propTypes = {
  error: PropTypes.string,
  instruction: PropTypes.string,
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  prefix: PropTypes.node,
  suffix: PropTypes.node,
  value: PropTypes.string
};

DateTime.defaultProps = {
  error: undefined,
  instruction: undefined,
  label: undefined,
  onChange: undefined,
  placeholder: undefined,
  prefix: undefined,
  suffix: undefined,
  value: undefined
};

export { DateTime };
