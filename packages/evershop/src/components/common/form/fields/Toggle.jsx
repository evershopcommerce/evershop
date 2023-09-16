/* eslint-disable jsx-a11y/control-has-associated-label */
import PropTypes from 'prop-types';
import React from 'react';
import Error from '@components/common/form/fields/Error';
import './Toggle.scss';

function Enabled({ onClick }) {
  return (
    <a
      href="#"
      className="toggle enabled"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      <span />
    </a>
  );
}

Enabled.propTypes = {
  onClick: PropTypes.func.isRequired
};

function Disabled({ onClick }) {
  return (
    <a
      href="#"
      className="toggle disabled"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      <span />
    </a>
  );
}

Disabled.propTypes = {
  onClick: PropTypes.func.isRequired
};

const isBool = (value) => typeof value === 'boolean';
const isEnable = (value) => (isBool(value) ? value : parseInt(value, 10) === 1);
const getValue = (value) => (isBool(value) ? value : parseInt(value, 10) || 0);
const getOppositeValue = (value) => {
  if (isBool(value)) {
    return !value;
  }
  if (value === 1) {
    return 0;
  }
  return 1;
};

function Toggle({ name, value, label, onChange, error, instruction }) {
  const [_value, setValue] = React.useState(getValue(value));

  React.useEffect(() => {
    setValue(getValue(value));
  }, [value]);

  const onChangeFunc = () => {
    const newVal = getOppositeValue(_value);
    setValue(newVal);

    if (onChange) {
      onChange.call(window, newVal);
    }
  };

  return (
    <div className={`form-field-container ${error ? 'has-error' : null}`}>
      {label && <label htmlFor={name}>{label}</label>}
      <input type="hidden" value={+getValue(_value)} name={name} />
      <div className="field-wrapper flex flex-grow">
        {isEnable(_value) && <Enabled onClick={() => onChangeFunc()} />}
        {!isEnable(_value) && <Disabled onClick={() => onChangeFunc()} />}
      </div>
      {instruction && (
        <div className="field-instruction mt-sm">{instruction}</div>
      )}
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
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.bool
  ]).isRequired
};

Toggle.defaultProps = {
  error: undefined,
  instruction: undefined,
  label: undefined,
  onChange: undefined
};

export { Toggle };
