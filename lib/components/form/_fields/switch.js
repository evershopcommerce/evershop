import React from "react";
import { formContext } from "../form";

export default function Switch(props) {
    const [value, setValue] = React.useState(props.value ? 1 : 0);
    const context = React.useContext(formContext);
    React.useEffect(() => {
        context.addField(props.name, props.value, props.validationRules);

        return () => {
            context.removeField(name);
        };
    }, []);

    const onChange = (e) => {
        setValue(value === 1 ? 0 : 1);
        context.updateField(props.name, value === 1 ? 0 : 1, props.validationRules);
        if (props.handler) props.handler.call(context, e, props);
    };

    return <div className="form-group nodejscart-switch">
        {props.label && <label htmlFor={props.name}>{props.label}</label>}
        <input type="hidden" value={value} name={props.name} />
        <div>
            {value == 0 && <i className="fas fa-toggle-off" onClick={(e) => onChange(e)}></i>}
            {value == 1 && <i className="fas fa-toggle-on" onClick={(e) => onChange(e)}></i>}
        </div>
        {props.comment &&
            <div><i>{props.comment}</i></div>
        }
    </div>
}