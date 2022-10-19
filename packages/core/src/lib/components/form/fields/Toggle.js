/* eslint-disable jsx-a11y/control-has-associated-label */
import PropTypes from 'prop-types';
import React from 'react';
import Error from './Error';
import './Toggle.scss';

function Enabled({ onClick }) {
  return <a href="#" className="toggle enabled" onClick={(e) => { e.preventDefault(); onClick(); }}><span /></a>;
}

Enabled.propTypes = {
  onClick: PropTypes.func.isRequired
};

function Disabled({ onClick }) {
  return <a href="#" className="toggle disabled" onClick={(e) => { e.preventDefault(); onClick(); }}><span /></a>;
}

Disabled.propTypes = {
  onClick: PropTypes.func.isRequired
};

function Toggle({
  name, value, label, onChange, error, instruction
}) {
  const [_value, setValue] = React.useState(parseInt(value, 10) === 1 ? 1 : 0);

  React.useEffect(() => {
    setValue(parseInt(value, 10) === 1 ? 1 : 0);
  }, [value]);

  const onChangeFunc = () => {
    const newVal = _value === 1 ? 0 : 1;
    setValue(newVal);

    if (onChange) onChange.call(window, newVal);
  };

  return (
    <div className={`form-field-container ${error ? 'has-error' : null}`}>
      {label && <label htmlFor={name}>{label}</label>}
      <input type="hidden" value={_value} name={name} />
      <div className="field-wrapper flex flex-grow">
        {parseInt(_value, 10) === 1 && <Enabled onClick={() => onChangeFunc()} />}
        {parseInt(_value, 10) === 0 && <Disabled onClick={() => onChangeFunc()} />}
      </div>
      {instruction
        && <div className="field-instruction mt-sm">{instruction}</div>}
      <Error error={error} />
    </div>
  );
}

Toggle.propTypes = {
  error: PropTypes.string,
  instruction: PropTypes.string,
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

Toggle.defaultProps = {
  error: undefined,
  instruction: undefined,
  label: undefined,
  onChange: undefined
};

export { Toggle };
