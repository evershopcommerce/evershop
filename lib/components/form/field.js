import React from "react";
import { Checkbox } from "./fields/checkbox";
import { Input } from "./fields/Input";
import { Radio } from "./fields/radio";
import { Select } from "./fields/select";
import { useFormContext } from "./form";

export default function Field(props) {
    const context = useFormContext();
    const [value, setValue] = React.useState("");
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
        if (props.onChange) props.onChange.call(window, e, props);
    };

    let Field = (() => {
        switch (props.type) {
            case 'text':
                return Input
                break;
            case 'select':
                return Select
                break;
            case 'checkbox':
                return Checkbox
                break;
            case 'radio':
                return Radio
                break;
        }
    })();
    return <>
        <Field {...props} onChange={onChange} value={value} error={field ? field.error : undefined} />
    </>
}