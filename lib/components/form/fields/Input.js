import React from 'react';
import Error from './Error';

function Input({ name, placeholder, value, label, onChange, error, instruction, prefix, suffix }) {
    return (
        <div className={`form-field-container ${error ? 'has-error' : null}`}>
            {label && <label htmlFor={name}>{label}</label>}
            <div className='field-wrapper flex flex-grow'>
                {prefix && <div className='field-prefix align-middle'>{prefix}</div>}
                <input
                    type="text"
                    className={"form-field"}
                    id={name}
                    name={name}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => { if (onChange) onChange.call(window, e) }}
                />
                <div className='field-border'></div>
                {suffix && <div className='field-suffix'>{suffix}</div>}
            </div>
            {instruction &&
                <div className="field-instruction mt-sm">{instruction}</div>
            }
            <Error error={error} />
        </div>
    );
}

export { Input };