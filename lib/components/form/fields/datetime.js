import React from "react";
import { Error } from "./error"
import flatpickr from "flatpickr";
import { formContext } from "../form";

export default function Date(props) {
    const [value, setValue] = React.useState(props.value ? props.value : '');
    const inputRef = React.createRef();

    const context = React.useContext(formContext);
    const field = context.fields.find((f) => f.name === props.name);

    React.useEffect(() => {
        context.addField(props.name, props.value, props.validationRules);

        return () => {
            context.removeField(props.name);
        };
    }, []);

    React.useEffect(() => {
        flatpickr(inputRef.current, { enableTime: true });
    }, []);

    const onChange = (e) => {
        setValue(e.target.value);
        context.updateField(props.name, e.target.value, props.validationRules);
    };

    return <div className="form-group">
        {props.label && <label htmlFor={props.name}>{props.label}</label>}
        <input
            type="text"
            className="form-control"
            id={props.name}
            name={props.name}
            placeholder={props.placeholder}
            value={value}
            onChange={onChange}
            ref={inputRef}
        />
        <Error error={field ? field.error : undefined} />
    </div>
}