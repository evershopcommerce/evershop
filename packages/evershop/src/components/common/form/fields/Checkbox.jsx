import Error from '@components/common/form/fields/Error';
import PropTypes from 'prop-types';
import React from 'react';
import '../Field.scss';

function CheckedIcon() {
  return (
    <span className="checkbox-checked">
      <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
        <path d="m8.315 13.859-3.182-3.417a.506.506 0 0 1 0-.684l.643-.683a.437.437 0 0 1 .642 0l2.22 2.393 4.942-5.327a.436.436 0 0 1 .643 0l.643.684a.504.504 0 0 1 0 .683l-5.91 6.35a.437.437 0 0 1-.642 0" />
      </svg>
    </span>
  );
}

function UnCheckedIcon() {
  return <span className="checkbox-unchecked" />;
}

function Checkbox({
  name,
  label,
  onChange,
  error,
  instruction,
  isChecked = false
}) {
  const [_isChecked, setChecked] = React.useState(isChecked);

  const onChangeFunc = (e) => {
    setChecked(e.target.checked);
    if (onChange) onChange.call(window, e);
  };

  React.useEffect(() => {
    setChecked(!!isChecked);
  }, [isChecked]);

  return (
    <div className={`form-field-container ${error ? 'has-error' : null}`}>
      <div className="field-wrapper radio-field">
        <label htmlFor={name}>
          <input
            type="checkbox"
            id={name}
            value={_isChecked ? 1 : 0}
            checked={_isChecked}
            onChange={onChangeFunc}
          />
          {_isChecked === true && <CheckedIcon />}
          {_isChecked === false && <UnCheckedIcon />}
          <span className="pl-2">{label}</span>
          <input type="hidden" name={name} value={_isChecked ? 1 : 0} />
        </label>
      </div>
      {instruction && (
        <div className="field-instruction mt-sm">{instruction}</div>
      )}
      <Error error={error} />
    </div>
  );
}

Checkbox.propTypes = {
  error: PropTypes.string,
  instruction: PropTypes.string,
  isChecked: PropTypes.bool,
  label: PropTypes.string,
  name: PropTypes.string,
  onChange: PropTypes.func.isRequired
};

Checkbox.defaultProps = {
  error: undefined,
  instruction: '',
  isChecked: false,
  label: '',
  name: undefined
};

export { Checkbox };
