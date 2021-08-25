import React from "react";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";
import { Field } from "../../../../../../lib/components/form/Field";
import { Card } from "../../../../../cms/components/admin/card";

export default function CustomOption(props) {
    const context = useAppState();

    const [options, setOptions] = React.useState(get(context, "productOptions", []));

    const addOption = (e) => {
        e.preventDefault();
        setOptions(options.concat({
            option_id: Date.now(),
            option_name: "",
            option_type: "",
            is_required: 0,
            sort_order: ""
        }));
    };

    const removeOption = (key, e) => {
        e.preventDefault();
        const newOptions = options.filter((_, index) => index !== key);
        setOptions(newOptions);
    };

    const addCustomOptionValue = (option_id, e) => {
        e.preventDefault();
        setOptions(options.map((o, i) => {
            if (parseInt(o.option_id) === parseInt(option_id)) {
                let values = o.values === undefined ? [] : o.values;
                values.push({
                    value_id: Date.now(),
                    option_id: option_id,
                    extra_price: "",
                    sort_order: "",
                    value: ""
                });
                o.values = values;
            }
            return o;
        }));
    };

    const removeCustomOptionValue = (option_id, value_id, e) => {
        e.preventDefault();
        setOptions(options.map((o, i) => {
            if (parseInt(o.option_id) === parseInt(option_id)) {
                let values = o.values === undefined ? [] : o.values;
                o.values = values.filter((v, i) => parseInt(v.value_id) !== parseInt(value_id));
            }
            return o;
        }));
    };

    return <Card
        title="Custom option"
    >
        <Card.Session>
            <ul>
                {options.map((option, index) => {
                    let values = option["values"] === undefined ? [] : option["values"];
                    let { option_id, option_name, sort_order, option_type, is_required } = option;
                    return <Card.Session key={index} title={option_name}>
                        <div className='grid grid-cols-2 gap-1'>
                            <div>
                                <Field
                                    name={"options[" + option_id + "][option_name]"}
                                    value={option_name}
                                    validationRules={["notEmpty"]}
                                    label="Option name"
                                    type='text' />
                            </div>
                            <div>
                                <Field
                                    name={"options[" + option_id + "][option_type]"}
                                    value={option_type}
                                    label="Type"
                                    options={[
                                        { value: "select", text: "Single choice" },
                                        { value: "multiselect", text: "Multiple choice" }
                                    ]}
                                    type='select'
                                />
                            </div>
                            <div>
                                <Field
                                    name={"options[" + option_id + "][sort_order]"}
                                    value={sort_order}
                                    label="Sort order"
                                    type='text' />
                            </div>
                            <div>
                                <Field
                                    name={"options[" + option_id + "][is_required]"}
                                    isChecked={parseInt(is_required) === 1}
                                    label="This option is mandatory"
                                    type='checkbox'
                                />
                            </div>
                        </div>
                        <table className="table-auto border-collapse">
                            <thead>
                                <tr>
                                    <td>Value</td>
                                    <td>Extra Price</td>
                                    <td>Sort Order</td>
                                    <td></td>
                                </tr>
                            </thead>
                            <tbody>
                                {values.map((val, i) => {
                                    let { value_id, option_id, extra_price, sort_order, value } = val;
                                    return <tr key={val.value_id}>
                                        <td>
                                            <Field
                                                name={"options[" + option_id + "][values][" + value_id + "][value]"}
                                                value={value}
                                                validationRules={["notEmpty"]}
                                                type='text'
                                            />
                                        </td>
                                        <td>
                                            <Field
                                                name={"options[" + option_id + "][values][" + value_id + "][extra_price]"}
                                                value={extra_price}
                                                type='text'
                                            />
                                        </td>
                                        <td>
                                            <Field
                                                name={"options[" + option_id + "][values][" + value_id + "][sort_order]"}
                                                value={sort_order}
                                                type='text'
                                            />
                                        </td>
                                        <td>
                                            <a href="#" onClick={(e) => { e.preventDefault(); removeCustomOptionValue(option_id, value_id, e); }} className="text-critical hover:underline">
                                                Remove
                                            </a>
                                        </td>
                                    </tr>;
                                })}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan="3"><a href="#" className='text-interactive hover:underline' onClick={(e) => { e.preventDefault(); addCustomOptionValue(option_id, e); }}>
                                        Add value
                                    </a></td>
                                </tr>
                            </tfoot>
                        </table>
                    </Card.Session>;
                })}
            </ul>
            <div><a href="#" onClick={(e) => { e.preventDefault(); addOption(e); }}><span className="text-interactive">Add option</span></a></div>
        </Card.Session>
    </Card>;
}