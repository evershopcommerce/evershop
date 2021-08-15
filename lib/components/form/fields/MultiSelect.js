import React from 'react';
import Error from './Error';

const MultiSelect = React.forwardRef(function MultiSelect({ name, value, label, onChange, error, instruction, options } = props, ref) {
    const [_value, setValue] = React.useState(value ? value : []);

    React.useEffect(() => {
        setValue(parseInt(value) === 1 ? 1 : 0);
    }, [value]);

    const _onChange = (e) => {
        let val = [...e.target.options].filter(o => o.selected).map(o => o.value);
        setValue(val);
        if (onChange) onChange.call(window, val);
    };

    return (
        <div className={`form-field-container ${error ? 'has-error' : null}`}>
            {label && <label htmlFor={name}>{label}</label>}
            <div className='field-wrapper flex flex-grow items-baseline'>
                <select
                    multiple={'multiple'}
                    className={"form-field"}
                    id={name}
                    name={name}
                    value={_value}
                    onChange={(e) => _onChange(e)}
                    ref={ref}
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
})

export { MultiSelect };