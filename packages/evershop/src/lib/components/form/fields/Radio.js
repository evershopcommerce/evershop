/* eslint-disable eqeqeq */
import PropTypes from 'prop-types';
import React from 'react';
import Error from './Error';
import '../Field.scss';

function CheckedIcon() {
  return <span className="radio-checked"><span /></span>;
}

function UnCheckedIcon() {
  return <span className="radio-unchecked" />;
}

function Radio({
  name, value, label, onChange, error, instruction, options
}) {
  const [_value, setValue] = React.useState(value || '');
  const onChangeFunc = (e) => {
    setValue(e.target.value);
    if (onChange) onChange.call(window, e.target.value);
  };

  React.useEffect(() => {
    setValue(value);
  }, [value]);

  return (
    <div className={`form-field-container ${error ? 'has-error' : null}`}>
      {label && <label htmlFor={name}>{label}</label>}
      <div className="field-wrapper radio-field">
        {
          options.map((o, i) => (
            <div key={o.value}>
              <label htmlFor={name + i} className="flex">
                <input
                  type="radio"
                  name={name}
                  id={name + i}
                  value={o.value}
                  checked={_value == o.value}
                  onChange={onChangeFunc}
                />
                {_value == o.value && <CheckedIcon />}
                {_value != o.value && <UnCheckedIcon />}
                <span className="pl-1">{o.text}</span>
              </label>
            </div>
          ))
        }
      </div>
      {instruction
        && <div className="field-instruction mt-sm">{instruction}</div>}
      <Error error={error} />
    </div>
  );
}

Radio.propTypes = {
  error: PropTypes.string,
  instruction: PropTypes.string,
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    text: PropTypes.string
  })).isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

Radio.defaultProps = {
  error: undefined,
  instruction: undefined,
  label: undefined,
  onChange: undefined
};

export { Radio };
