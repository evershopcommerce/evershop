import React from "react";
import { Error } from "./error";
import { formContext } from "../form";

export default function Select(props) {
    const [value, setValue] = React.useState(props.value ? props.value : '');
    const context = React.useContext(formContext);
    const field = context.fields.find((f) => f.name === props.name);
    React.useEffect(() => {
        context.addField(props.name, props.value, props.validationRules);

        return () => {
            context.removeField(props.name);
        };
    }, []);

    const onChange = (e) => {
        setValue(e.target.value);
        context.updateField(props.name, e.target.value, props.validationRules);
        if (props.handler) props.handler.call(this, e, props);
    };

    return <div className="form-group">
        {props.label && <label htmlFor={props.name}>{props.label}</label>}
        <select
            className={"form-control"}
            id={props.name}
            name={props.name}
            value={value}
            onChange={onChange}
        >
            <option value="" disabled>Please select</option>
            {props.options && props.options.map((option, key) => {
                return <option key={key} value={option.value}>{option.text}</option>;
            })}
        </select>
        <Error error={field ? field.error : undefined} />
    </div>
}