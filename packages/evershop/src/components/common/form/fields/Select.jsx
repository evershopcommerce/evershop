import Error from '@components/common/form/fields/Error';
import PropTypes from 'prop-types';
import React from 'react';

import '../Field.scss';
import { _ } from '../../../../lib/locale/translate/_.js';

const Select = React.forwardRef((props, ref) => {
  const {
    name,
    placeholder,
    disableDefaultOption,
    value,
    label,
    onChange,
    error,
    instruction,
    options
  } = props;
  const [_value, setValue] = React.useState(value || '');

  React.useEffect(() => {
    setValue(value);
  }, [value]);

  return (
    <div
      className={`form-field-container dropdown ${error ? 'has-error' : null}`}
    >
      {label && <label htmlFor={name}>{label}</label>}
      <div className="field-wrapper flex flex-grow items-baseline">
        <select
          className="form-field"
          id={name}
          name={name}
          placeholder={placeholder}
          value={_value}
          onChange={(e) => {
            if (onChange) {
              onChange.call(window, e);
            } else {
              setValue(e.target.value);
            }
          }}
          ref={ref}
        >
          <option value="" disabled={disableDefaultOption}>
            {placeholder || _('Please select')}
          </option>
          {options &&
            options.map((option, key) => (
              <option key={key} value={option.value}>
                {option.text}
              </option>
            ))}
        </select>
        <div className="field-border" />
        <div className="field-suffix">
          <svg
            viewBox="0 0 20 20"
            width="1rem"
            height="1.25rem"
            focusable="false"
            aria-hidden="true"
          >
            <path d="m10 16-4-4h8l-4 4zm0-12 4 4H6l4-4z" />
          </svg>
        </div>
      </div>
      {instruction && (
        <div className="field-instruction mt-sm">{instruction}</div>
      )}
      <Error error={error} />
    </div>
  );
});

Select.propTypes = {
  error: PropTypes.string,
  instruction: PropTypes.string,
  label: PropTypes.string,
  name: PropTypes.string,
  onChange: PropTypes.func,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      text: PropTypes.string
    })
  ),
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  disableDefaultOption: PropTypes.bool
};

Select.defaultProps = {
  error: undefined,
  instruction: undefined,
  label: undefined,
  onChange: undefined,
  options: [],
  placeholder: undefined,
  name: undefined,
  value: undefined,
  disableDefaultOption: true
};

export { Select };
