import React from "react";
import { Error } from "./error";
import { formContext } from "../form";

export default function MultiSelect(props) {
    const [value, setValue] = React.useState(props.value ? props.value : []);

    const context = React.useContext(formContext);
    const field = context.fields.find((f) => f.name === name);
    React.useEffect(() => {
        context.addField(props.name, props.value, props.validationRules);

        return () => {
            context.removeField(name);
        };
    }, []);

    const onChange = (e) => {
        let val = [...e.target.options].filter(o => o.selected).map(o => o.value);
        setValue(val);
        context.updateField(props.name, val, props.validationRules);
        if (props.handler) props.handler.call(context, e, props);
    };

    return <div className="form-group">
        {props.label && <label htmlFor={props.name}>{props.label}</label>}
        <select
            className="form-control"
            id={props.id}
            name={props.name}
            value={value}
            multiple="multiple"
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