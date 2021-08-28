import React from "react";
import Area from "../../../../../../lib/components/area";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";
import { Field } from "../../../../../../lib/components/form/Field";
import { Card } from "../../../../../cms/components/admin/card";

function Options({ _options = [] }) {
    const [options, setOptions] = React.useState(_options);

    const addOption = (e) => {
        e.preventDefault();
        setOptions(options.concat({
            attribute_option_id: Date.now(),
            option_text: ""
        }));
    };

    const removeOption = (key, e) => {
        e.preventDefault();
        const newOptions = options.filter((_, index) => index !== key);
        setOptions(newOptions);
    };

    return <div className="attribute-edit-options">
        {options.map((option, index) => {
            let { attribute_option_id, option_text } = option;
            return <div key={attribute_option_id} className="flex mb-05 space-x-2">
                <div>
                    <Field
                        type="text"
                        name={'options[' + attribute_option_id + '][option_text]'}
                        formId={"attribute-edit-form"} value={option_text}
                        validationRules={['notEmpty']}
                    />
                </div>
                <div className="self-center"><a href="#" onClick={(e) => removeOption(index, e)} className="text-critical hover:underline">Remove option</a></div>
            </div>
        })}
        <div className='mt-1'><a href="#" onClick={(e) => addOption(e)} className="text-interactive hover:underline">Add option</a></div>
    </div>;
}

export default function General() {
    const context = useAppState();
    const [type, setType] = React.useState(get(context, 'attribute.type', undefined));
    const fields = [
        {
            component: { default: Field },
            props: {
                id: "attribute_name",
                name: "attribute_name",
                label: "Name",
                validationRules: ["notEmpty"],
                type: "text"
            },
            sortOrder: 10,
            id: "name"
        },
        {
            component: { default: Field },
            props: {
                id: "attribute_id",
                name: "attribute_id",
                type: "hidden"
            },
            sortOrder: 10,
            id: "attribute_id"
        },
        {
            component: { default: Field },
            props: {
                id: "type",
                type: "radio",
                name: "type",
                label: "Type",
                options: [
                    { value: 'text', text: "Text" },
                    { value: 'select', text: "Select" },
                    { value: 'multiselect', text: "Multiselect" },
                    { value: 'textarea', text: "Textarea" },
                ],
                onChange: (value) => {
                    setType(value);
                }
            },
            sortOrder: 20,
            id: "type"
        }
    ].filter((f) => {
        if (get(context, `attribute.${f.props.name}`) !== undefined)
            f.props.value = get(context, `attribute.${f.props.name}`);
        return f;
    });

    return <Card
        title="General"
    >
        <Card.Session>
            <Area id="attribute-edit-general" coreComponents={fields} />
        </Card.Session>
        {['select', 'multiselect'].includes(type) && <Card.Session title="Attribute options">
            <Options _options={get(context, "attribute.options", [])} />
        </Card.Session>}
    </Card>;
}