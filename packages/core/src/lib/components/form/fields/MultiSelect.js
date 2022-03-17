import PropTypes from 'prop-types';
import React from 'react';
import Error from './Error';

const MultiSelect = React.forwardRef((props, ref) => {
  const {
    name, value, label, onChange, error, instruction, options
  } = props;
  const [_value, setValue] = React.useState(value || []);

  React.useEffect(() => {
    setValue(parseInt(value, 10) === 1 ? 1 : 0);
  }, [value]);

  const onChangeFunc = (e) => {
    const val = [...e.target.options].filter((o) => o.selected).map((o) => o.value);
    setValue(val);
    if (onChange) onChange.call(window, val);
  };

  return (
    <div className={`form-field-container ${error ? 'has-error' : null}`}>
      {label && <label htmlFor={name}>{label}</label>}
      <div className="field-wrapper flex flex-grow items-baseline">
        <select
          multiple="multiple"
          className="form-field"
          id={name}
          name={name}
          value={_value}
          onChange={(e) => onChangeFunc(e)}
          ref={ref}
        >
          <option value="" disabled>Please select</option>
          {options && options.map(
            // eslint-disable-next-line react/no-array-index-key
            (option, key) => <option key={key} value={option.value}>{option.text}</option>
          )}
        </select>
        <div className="field-border" />
        <div className="field-suffix"><svg viewBox="0 0 20 20" width="1rem" height="1.25rem" focusable="false" aria-hidden="true"><path d="m10 16-4-4h8l-4 4zm0-12 4 4H6l4-4z" /></svg></div>
      </div>
      {instruction
        && <div className="field-instruction mt-sm">{instruction}</div>}
      <Error error={error} />
    </div>
  );
});

MultiSelect.propTypes = {
  error: PropTypes.string,
  instruction: PropTypes.string,
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  options: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  value: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number]))
};

MultiSelect.defaultProps = {
  error: undefined,
  instruction: undefined,
  label: '',
  onChange: undefined,
  options: [],
  value: []
};

export { MultiSelect };
