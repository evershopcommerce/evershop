import React from 'react';
import flatpickr from './Flatpickr';
import Error from './Error';

function DateTime({
  name, placeholder, value, label, onChange, error, instruction, prefix, suffix
}) {
  const [_value, setValue] = React.useState(value || '');
  const inputRef = React.createRef();

  React.useEffect(() => {
    setValue(parseInt(value) === 1 ? 1 : 0);
  }, [value]);

  React.useEffect(() => {
    flatpickr(inputRef.current, { enableTime: true });
  }, []);

  const _onChange = (e) => {
    setValue(e.target.value);
    if (onChange) onChange.call(window, e.target.value);
  };

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
          value={_value}
          onChange={_onChange}
          ref={inputRef}
        />
        <div className="field-border" />
        {suffix && <div className="field-suffix">{suffix}</div>}
      </div>
      {instruction
                && <div className="field-instruction mt-sm">{instruction}</div>}
      <Error error={error} />
    </div>
  );
}

export { DateTime };
