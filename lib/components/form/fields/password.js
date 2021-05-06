import { Error } from "./error"
import React from "react";
import { formContext } from "../form";

export default function Password(props) {
    const context = React.useContext(formContext);
    const field = context.fields.find((f) => f.name === name);
    React.useEffect(() => {
        context.addField(props.name, props.value, props.validationRules);

        return () => {
            context.removeField(name);
        };
    }, []);

    const onChange = (e) => {
        setValue(e.target.value);
        if (props.handler) props.handler.call(context, e, props);
    };

    return <div className="form-group">
        {props.label && <label htmlFor={props.name}>{props.label}</label>}
        <input
            type="password"
            className={"form-control"}
            id={props.name}
            name={props.name}
            placeholder={props.placeholder}
            value={value}
            onChange={onChange}
            disabled={isDisabled}
            readOnly={readOnly}
        />
        {props.comment &&
            <small className="form-text text-muted"><i>{props.comment}</i></small>
        }
        <Error error={field ? field.error : undefined} />
    </div>
}