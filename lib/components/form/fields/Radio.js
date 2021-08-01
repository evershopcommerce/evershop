import React from 'react';
import Error from './Error';

const CheckedIcon = () => {
    return <span className='radio-checked'><span></span></span>
}

const UnCheckedIcon = () => {
    return <span className='radio-unchecked'></span>
}

function Radio({ name, value, label, onChange, error, instruction, options }) {
    const [_value, setValue] = React.useState(value ? value : '');
    const _onChange = (e) => {
        setValue(e.target.value);
        if (onChange) onChange.call(window, e.target.value);
    };
    return (
        <div className={`form-field-container ${error ? 'has-error' : null}`}>
            {label && <label htmlFor={name}>{label}</label>}
            <div className='field-wrapper radio-field'>
                {
                    options.map((o, i) => {
                        return <div key={o.value}>
                            <label htmlFor={name + i} className="flex"><input
                                type="radio"
                                name={name}
                                id={name + i}
                                value={o.value}
                                checked={_value == o.value}
                                onChange={_onChange}
                            />
                                {_value == o.value && <CheckedIcon />}
                                {_value != o.value && <UnCheckedIcon />}
                                <span className="pl-1">{o.text}</span>
                            </label>
                        </div>
                    })
                }
            </div>
            {instruction &&
                <div className="field-instruction mt-sm">{instruction}</div>
            }
            <Error error={error} />
        </div>
    );
}

export { Radio };