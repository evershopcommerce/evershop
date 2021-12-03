import React from 'react';
import Error from './Error';

var inputProps = function (props) {
    var obj = {};
    [
        'autocomplete',
        'autofocus',
        'dirname',
        'disabled',
        'form',
        'maxlength',
        'minlength',
        'name',
        'pattern',
        'placeholder',
        'readonly',
        'onChange',
        'onFocus',
        'onBlur',
        'onKeyPress',
        'onKeyDown',
        'onKeyUp'
    ].forEach(function (a) {
        if (props[a])
            obj[a] = props[a];
        obj["defaultValue"] = props['value'];
    })

    return obj;
}


const Input = React.forwardRef(function Input(props, ref) {
    return (
        <div className={`form-field-container ${props.error ? 'has-error' : null}`}>
            {props.label && <label htmlFor={props.name}>{props.label}</label>}
            <div className='field-wrapper flex flex-grow'>
                {props.prefix && <div className='field-prefix align-middle'>{props.prefix}</div>}
                <input
                    type="text"
                    {...inputProps(props)}
                    ref={ref}
                />
                <div className='field-border'></div>
                {props.suffix && <div className='field-suffix'>{props.suffix}</div>}
            </div>
            {props.instruction &&
                <div className="field-instruction mt-sm">{props.instruction}</div>
            }
            <Error error={props.error} />
        </div>
    );
});

export { Input };