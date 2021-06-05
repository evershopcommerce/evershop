import React from "react";
import Text from "../../../../../../lib/components/form/fields/text";
import Switch from "../../../../../../lib/components/form/fields/switch";
import Select from "../../../../../../lib/components/form/fields/select";
import { appContext } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";

export default function CustomOption(props) {
    const context = React.useContext(appContext);

    const [options, setOptions] = React.useState(get(context, "data.productOptions", []));

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

    return <div className="product-edit-custom-option sml-block mt-4">
        <div className="sml-block-title">Custom Options</div>
        <ul className="list-unstyled">
            {options.map((option, index) => {
                let values = option["values"] === undefined ? [] : option["values"];
                let { option_id, option_name, sort_order, option_type, is_required } = option;
                return <li key={index} className="overflow-auto">
                    <table className="table table-bordered">
                        <thead>
                            <tr>
                                <td>Option name</td>
                                <td>Type</td>
                                <td>Is required?</td>
                                <td>Sort order</td>
                                <td className="align-middle"><a href="#" onClick={(e) => { e.preventDefault(); removeOption(index, e); }} className="text-danger"><i className="fas fa-trash-alt"></i></a></td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <Text name={"options[" + option_id + "][option_name]"} value={option_name} validationRules={["notEmpty"]} />
                                </td>
                                <td>
                                    <Select
                                        name={"options[" + option_id + "][option_type]"}
                                        value={option_type}
                                        options={[
                                            { value: "select", text: "Single choice" },
                                            { value: "multiselect", text: "Multiple choice" }
                                        ]}
                                    />
                                </td>
                                <td>
                                    <Switch
                                        name={"options[" + option_id + "][is_required]"}
                                        value={is_required}
                                    />
                                </td>
                                <td>
                                    <Text name={"options[" + option_id + "][sort_order]"} value={sort_order} />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <table className="table-bordered table">
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
                                        <Text
                                            name={"options[" + option_id + "][values][" + value_id + "][value]"}
                                            value={value}
                                            validationRules={["notEmpty"]}
                                        />
                                    </td>
                                    <td>
                                        <Text name={"options[" + option_id + "][values][" + value_id + "][extra_price]"} value={extra_price} />
                                    </td>
                                    <td>
                                        <Text name={"options[" + option_id + "][values][" + value_id + "][sort_order]"} value={sort_order} />
                                    </td>
                                    <td colSpan="3"><a href="#" onClick={(e) => { e.preventDefault(); removeCustomOptionValue(option_id, value_id, e); }} className="text-danger"><i className="fas fa-trash-alt"></i></a></td>
                                </tr>;
                            })}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan="3"><a href="#" onClick={(e) => { e.preventDefault(); addCustomOptionValue(option_id, e); }}><i className="fas fa-plus"></i></a></td>
                            </tr>
                        </tfoot>
                    </table>
                </li>;
            })}
        </ul>
        <div><a href="#" onClick={(e) => { e.preventDefault(); addOption(e); }}><i className="fas fa-plus"></i> <span className="pl-1">Add option</span></a></div>
    </div>;
}