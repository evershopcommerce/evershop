import React from 'react';
import Error from './Error';

const CheckedIcon = () => {
    return <span className='checkbox-checked'>
        <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path d="m8.315 13.859-3.182-3.417a.506.506 0 0 1 0-.684l.643-.683a.437.437 0 0 1 .642 0l2.22 2.393 4.942-5.327a.436.436 0 0 1 .643 0l.643.684a.504.504 0 0 1 0 .683l-5.91 6.35a.437.437 0 0 1-.642 0"></path></svg>
    </span>
}

const UnCheckedIcon = () => {
    return <span className='checkbox-unchecked'></span>
}

function Checkbox({ name, value, label, onChange, error, instruction, isChecked = false }) {
    const [_isChecked, setChecked] = React.useState(isChecked);

    const _onChange = (e) => {
        setChecked(e.target.checked);
        if (onChange) onChange.call(window, e.target.value);
    };

    React.useEffect(() => {
        setValue(parseInt(value) === 1 ? 1 : 0);
    }, [value]);

    return (
        <div className={`form-field-container ${error ? 'has-error' : null}`}>
            {label && <label htmlFor={name}>{label}</label>}
            <div className='field-wrapper radio-field'>
                <label htmlFor={name}><input
                    type="checkbox"
                    name={name}
                    id={name}
                    value={value}
                    checked={_isChecked}
                    onChange={_onChange}
                />
                    {_isChecked === true && <CheckedIcon />}
                    {_isChecked === false && <UnCheckedIcon />}
                    <span className='pl05'>{label}</span>
                </label>
            </div>
            {instruction &&
                <div className="field-instruction mt-sm">{instruction}</div>
            }
            <Error error={error} />
        </div>
    );
}

export { Checkbox };