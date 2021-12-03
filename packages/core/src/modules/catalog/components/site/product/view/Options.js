import Select from "../../../../../../../../js/production/form/fields/select.js";
import Multiselect from "../../../../../../../../js/production/form/fields/multiselect.js";

export default function Options({options = []}) {
    if(options.length === 0)
        return null;

    const currency = ReactRedux.useSelector(state => _.get(state, 'appState.orderData.currency', 'USD'));
    const language = ReactRedux.useSelector(state => _.get(state, 'appState.orderData.language', 'en'));

    return <div className="product-single-options mt-4 mb-4">
        <div className="product-single-options-title mb-2"><strong>Options</strong></div>
        {options.map((o,i) => {
            let values = o.values.map((v) => {
                let _price = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(v.extra_price);
                return {
                    value: v.value_id,
                    text: v.value + ` (+ ${_price})`
                }
            });
            let FieldComponent = "";
            switch (o.option_type) {
                case "select":
                    FieldComponent = <Select
                        key={i}
                        name={`product_custom_options[${o.option_id}][]`}
                        options={values}
                        validation_rules={parseInt(o.is_required) === 1 ? ['notEmpty'] : []}
                        formId={"product-form"}
                        label={o.option_name}
                    />;
                    break;
                case "multiselect":
                    FieldComponent = <Multiselect
                        key={i}
                        name={`product_custom_options[${o.option_id}][]`}
                        options={values}
                        validation_rules={parseInt(o.is_required) === 1 ? ['notEmpty'] : []}
                        formId={"product-form"}
                        label={o.option_name}
                    />;
                    break;
                default:
                    FieldComponent = <Select
                        key={i}
                        name={`product_custom_options[${o.option_id}][]`}
                        options={values}
                        validation_rules={parseInt(o.is_required) === 1 ? ['notEmpty'] : []}
                        formId={"product-form"}
                        label={o.option_name}
                    />;
            }
            return FieldComponent;
        })}
    </div>
}