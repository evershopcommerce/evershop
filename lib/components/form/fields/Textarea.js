import React from 'react';
import Error from './Error';

function TextArea({ name, value, label, onChange, error, instruction }) {
    const [_value, setValue] = React.useState(value ? value : '');

    React.useEffect(() => {
        setValue(parseInt(value) === 1 ? 1 : 0);
    }, [value]);

    const _onChange = (e) => {
        setValue(e.target.value);
        if (onChange)
            onChange.call(window, e.target.value)
    };

    return (
        <div className={`form-field-container ${error ? 'has-error' : null}`}>
            {label && <label htmlFor={name}>{label}</label>}
            <div className='field-wrapper flex flex-grow'>
                <textarea
                    type="text"
                    className={"form-field"}
                    id={name}
                    name={name}
                    value={_value}
                    onChange={_onChange}
                />
                <div className='field-border'></div>
            </div>
            {instruction &&
                <div className="field-instruction mt-sm">{instruction}</div>
            }
            <Error error={error} />
        </div>
    );
}

export { TextArea };