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
                    return <li key={index}>
                        <table className="table-auto border-collapse">
                            <thead>
                                <tr>
                                    <td>Option name</td>
                                    <td>Type</td>
                                    <td>Is required?</td>
                                    <td>Sort order</td>
                                    <td className="align-middle"><a href="#" onClick={(e) => { e.preventDefault(); removeOption(index, e); }} className="text-critical">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </a></td>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <Field name={"options[" + option_id + "][option_name]"} value={option_name} validationRules={["notEmpty"]} type='text' />
                                    </td>
                                    <td>
                                        <Field
                                            name={"options[" + option_id + "][option_type]"}
                                            value={option_type}
                                            options={[
                                                { value: "select", text: "Single choice" },
                                                { value: "multiselect", text: "Multiple choice" }
                                            ]}
                                            type='select'
                                        />
                                    </td>
                                    <td>
                                        <Field
                                            name={"options[" + option_id + "][is_required]"}
                                            value={is_required}
                                            type='toggle'
                                        />
                                    </td>
                                    <td>
                                        <Field name={"options[" + option_id + "][sort_order]"} value={sort_order} type='text' />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
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
                                        <td colSpan="3">
                                            <a href="#" onClick={(e) => { e.preventDefault(); removeCustomOptionValue(option_id, value_id, e); }} className="text-critical w-15 block">
                                                Remove
                                            </a>
                                        </td>
                                    </tr>;
                                })}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan="3"><a href="#" onClick={(e) => { e.preventDefault(); addCustomOptionValue(option_id, e); }}>
                                        Add value
                                    </a></td>
                                </tr>
                            </tfoot>
                        </table>
                    </li>;
                })}
            </ul>
            <div><a href="#" onClick={(e) => { e.preventDefault(); addOption(e); }}><span className="text-interactive">Add option</span></a></div>
        </Card.Session>
    </Card>;
}