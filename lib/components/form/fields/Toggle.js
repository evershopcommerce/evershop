import React from 'react';
import Error from './Error';

const Enabled = ({ onClick }) => {
    return <a href="#" className='toggle enabled' onClick={(e) => { e.preventDefault(); onClick() }}><span></span></a>
}

const Disabled = () => {
    return <a href="#" className='toggle disabled' onClick={(e) => { e.preventDefault(); onClick() }}><span></span></a>
}

function Toggle({ name, value, label, onChange, error, instruction }) {
    const [_value, setValue] = React.useState(value ? 1 : 0);

    const _onChange = (e) => {
        let newVal = value === 1 ? 0 : 1;
        setValue(newVal);

        if (onChange)
            onChange.call(window, newVal)
    };


    return (
        <div className={`form-field-container ${error ? 'has-error' : null}`}>
            {label && <label htmlFor={name}>{label}</label>}
            <input type="hidden" value={value} name={name} />
            <div className='field-wrapper flex flex-grow'>
                {parseInt(_value) === 0 && <Enabled onClick={() => _onChange()} />}
                {parseInt(_value) === 1 && <Disabled onClick={() => _onChange()} />}
            </div>
            {instruction &&
                <div className="field-instruction mt-sm">{instruction}</div>
            }
            <Error error={error} />
        </div>
    );
}

export { Toggle };