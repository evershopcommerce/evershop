import React from 'react';
import Error from './Error';

function Select({ name, placeholder, value, label, onChange, error, instruction, options }) {
    return (
        <div className={`form-field-container ${error ? 'has-error' : null}`}>
            {label && <label htmlFor={name}>{label}</label>}
            <div className='field-wrapper flex flex-grow items-baseline'>
                <select
                    className={"form-field"}
                    id={name}
                    name={name}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => { if (onChange) onChange.call(e) }}
                >
                    <option value="" disabled>Please select</option>
                    {options && options.map((option, key) => {
                        return <option key={key} value={option.value}>{option.text}</option>;
                    })}
                </select>
                <div className='field-border'></div>
                <div className='field-suffix'><svg viewBox="0 0 20 20" width={"1rem"} height={"1.25rem"} focusable="false" aria-hidden="true"><path d="m10 16-4-4h8l-4 4zm0-12 4 4H6l4-4z"></path></svg></div>
            </div>
            {instruction &&
                <div className="field-instruction mt-sm">{instruction}</div>
            }
            <Error error={error} />
        </div>
    );
}

export { Select };