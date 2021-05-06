import React from "react";
import Area from "../../../../../../lib/components/area";
import { appContext } from "../../../../../../lib/context/app";
import Text from "../../../../../../lib/components/form/fields/text";
import TextArea from "../../../../../../lib/components/form/fields/textarea";
import { get } from "../../../../../../lib/util/get";

export default function General(props) {
    const context = React.useContext(appContext);
    const fields = [
        {
            component: { default: Text },
            props: { id: "url_key", name: "url_key", label: "Url key", validationRules: ["notEmpty"] },
            sort_order: 0,
            id: "url_key"
        },
        {
            component: { default: Text },
            props: { id: "meta_title", name: "meta_title", label: "Meta title" },
            sort_order: 10,
            id: "meta_title"
        },
        {
            component: { default: Text },
            props: {
                id: "meta_keywords",
                name: "meta_keywords",
                label: "Meta keywords"
            },
            sort_order: 20,
            id: "meta_keywords"
        },
        {
            component: { default: TextArea },
            props: { id: "meta_description", name: "meta_description", label: "Meta description", options: [{ value: 0, text: "Disabled" }, { value: 1, text: "Enabled" }] },
            sort_order: 30,
            id: "meta_description"
        }
    ].filter((f) => {
        if (get(context, `data.product.${f.props.name}`) !== undefined)
            f.props.value = get(context, `data.product.${f.props.name}`);
        return f;
    });

    return <div className="product-edit-seo sml-block mt-4">
        <div className="sml-block-title">SEO</div>
        <Area id="product-edit-seo" coreWidgets={fields} />
    </div>;
}