import { Error } from "./error";
import React from "react";
import { formContext } from "../form";

export default function Text(props) {
    const [value, setValue] = React.useState("");
    const context = React.useContext(formContext);
    const field = context.fields.find((f) => f.name === props.name);

    React.useEffect(() => {
        context.addField(props.name, props.value, props.validationRules || []);

        return () => {
            context.removeField(props.name);
        };
    }, []);

    React.useEffect(() => {
        setValue(props.value ? props.value : "");
        context.updateField(props.name, props.value ? props.value : "", props.validationRules);
    }, [props.value]);

    const onChange = (e) => {
        setValue(e.target.value);
        context.updateField(props.name, e.target.value, props.validationRules);
        if (props.handler) props.handler.call(context, e, props);
    };

    return <div className="form-group">
        {props.label && <label htmlFor={props.name}>{props.label}</label>}
        <input
            type="text"
            className={"form-control"}
            id={props.name}
            name={props.name}
            placeholder={props.placeholder}
            value={value}
            onChange={onChange}
        />
        {props.comment &&
            <small className="form-text text-muted"><i>{props.comment}</i></small>
        }
        <Error error={field ? field.error : undefined} />
    </div>
}