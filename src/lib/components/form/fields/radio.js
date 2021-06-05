import React from "react";
import { Error } from "./error";
import { formContext } from "../form";

export default function Radio(props) {
    const [value, setValue] = React.useState(props.value ? props.value : '');

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
        context.updateField(props.name, e.target.value, props.validationRules);
        if (props.handler) props.handler.call(context, e, props);
    };

    return <div className="form-group nodejscart-radio">
        {props.label && <div><label>{props.label}</label></div>}
        {
            props.options.map((o, i) => {
                return <div>
                    <label key={i} htmlFor={props.name + i}><input
                        type="radio"
                        className="uk-radio"
                        name={props.name}
                        id={props.name + i}
                        value={o.value}
                        checked={value == o.value}
                        onChange={onChange}
                    />
                        {value != o.value && <i className="fas fa-circle font-color-primary"></i>}
                        {value == o.value && <i className="fas fa-check-circle font-color-primary"></i>}
                        {o.text}
                    </label>
                </div>
            })
        }
        {props.comment &&
            <div><i>{props.comment}</i></div>
        }
        <Error error={field ? field.error : undefined} />
    </div>
}