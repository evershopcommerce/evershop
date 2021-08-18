import flatpickr from './Flatpickr';
import React from 'react';
import Error from './Error';

const Date = React.forwardRef(function Date(props, ref) {
    const [_value, setValue] = React.useState(props.value ? props.value : '');
    const inputRef = ref ? ref : React.createRef();

    React.useEffect(() => {
        setValue(parseInt(props.value) === 1 ? 1 : 0);
    }, [props.value]);

    React.useEffect(() => {
        let instance = flatpickr(inputRef.current, { enableTime: false });
        instance.config.onChange.push(function (selectedDates, dateStr, instance) {
            if (props.onChange)
                props.onChange.call(window, dateStr)
        });
    }, []);

    const _onChange = (e) => {
        setValue(e.target.value);
        if (props.onChange)
            props.onChange.call(window, e.target.value)
    };

    return (
        <div className={`form-field-container ${props.error ? 'has-error' : null}`}>
            {props.label && <label htmlFor={props.name}>{props.label}</label>}
            <div className='field-wrapper flex flex-grow'>
                {props.prefix && <div className='field-prefix align-middle'>{props.prefix}</div>}
                <input
                    type="text"
                    className={"form-field"}
                    id={props.name}
                    name={props.name}
                    placeholder={props.placeholder}
                    value={props._value}
                    onChange={props._onChange}
                    ref={inputRef}
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

export { Date };