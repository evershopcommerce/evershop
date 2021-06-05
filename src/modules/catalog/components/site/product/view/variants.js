import { appContext } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";
import React from "react";
import { FORM_VALIDATED } from "../../../../../../lib/util/events";
import PubSub from "pubsub-js";

function isSelected(attributeCode, optionId, currentFilters = {}) {
    return (currentFilters[attributeCode] !== undefined && parseInt(currentFilters[attributeCode]) === parseInt(optionId));
}

function isAvailable(attributeCode, optionId, variants, currentFilters = {}) {
    let availableVars = [];
    if (Object.keys(currentFilters).length === 0)
        availableVars = variants;
    else
        variants.forEach((v) => {
            let vAttrs = v.attributes;
            let flag = true;
            for (let attr of Object.keys(currentFilters)) {
                let option = vAttrs.find((a) => a.attribute_code === attr);
                if (attr !== attributeCode && parseInt(option.option_id) !== parseInt(currentFilters[attr]))
                    flag = false;
            }
            if (flag === true)
                availableVars.push(v);
        });
    return availableVars.find((a) => {
        return a.attributes.find((at) => { return at.attribute_code === attributeCode && parseInt(at.option_id) === parseInt(optionId) }) !== undefined
    })
}

export default function Variants() {
    const attributes = get(React.useContext(appContext), "data.product.variantAttributes", []);
    const variants = get(React.useContext(appContext), "data.product.variants", []);
    const [error, setError] = React.useState(null);
    const variantFilters = get(React.useContext(appContext), "data.product.variantSelection", {});
    const currentProductUrl = get(React.useContext(appContext), "data.currentUrl");

    const validate = (formId, errors) => {
        if (formId !== "productForm")
            return true;

        let flag = true;
        attributes.forEach((a) => {
            if (variantFilters[a.attribute_code] === undefined)
                flag = false;
        });
        if (flag === false) {
            errors["variants"] = "Missing variant";
            setError("Please select variant option");
        }
    };

    React.useEffect(() => {
        let token = PubSub.subscribe(FORM_VALIDATED, function (message, data) {
            validate(data.formId, data.errors);
        });

        return function cleanup() {
            PubSub.unsubscribe(token);
        };
    }, []);

    const getUrl = (attribute_code, option_id) => {
        let url = new URL(currentProductUrl);
        90
        if (!Object.keys(variantFilters).includes(attribute_code) || parseInt(variantFilters[attribute_code]) !== parseInt(option_id)) {
            url.searchParams.set(attribute_code, option_id);
        } else {
            url.searchParams.delete(attribute_code);
        }

        return url;
    };

    return <div className="variant variant-container">
        {attributes.map((a, i) => {
            let options = a.options.filter((v, i, s) => s.findIndex(o => o.option_id === v.option_id) === i);
            return <div key={a.attribute_code}>
                <input name={`variant_options[${i}][attribute_id]`} type={"hidden"} value={a.attribute_id} />
                <input name={`variant_options[${i}][option_id]`} type={"hidden"} value={variantFilters[a.attribute_code] ? variantFilters[a.attribute_code] : ""} />
                <div>{a.attribute_name}</div>
                <ul className="variant-option-list">
                    {options.map((o) => {
                        let className = "";
                        if (isSelected(a.attribute_code, o.option_id, variantFilters))
                            className = "selected";
                        if (isAvailable(a.attribute_code, o.option_id, variants, variantFilters))
                            return <li key={o.option_id} className={className}><a href={getUrl(a.attribute_code, o.option_id)}>{o.option_text}</a></li>;
                        else
                            return <li key={o.option_id} className="un-available"><span>{o.option_text}</span></li>;
                    })}
                </ul>
            </div>
        })}
        {error && <div className="variant-validate error text-danger">{error}</div>}
    </div>
}