import React from "react";
import Area from "../../../../../../lib/components/area";
import Text from "../../../../../../lib/components/form/fields/text";
import Switch from "../../../../../../lib/components/form/fields/switch";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";

export default function Inventory({ data }) {
    const context = useAppState();
    const fields = [
        {
            component: { default: Switch },
            props: { id: "manage_stock", name: "manage_stock", label: "Manage stock?", options: [{ value: 0, text: "No" }, { value: 1, text: "Yes" }] },
            sortOrder: 10,
            id: "manage_stock"
        },
        {
            component: { default: Text },
            props: {
                id: "qty",
                name: "qty",
                type: "text",
                label: "Quantity",
                validationRules: ["notEmpty", "integer"]
            },
            sortOrder: 20,
            id: "qty"
        },
        {
            component: { default: Switch },
            props: { id: "stock_availability", name: "stock_availability", label: "Stock availability", options: [{ value: 0, text: "Out of stock" }, { value: 1, text: "In stock" }], validationRules: ["notEmpty"] },
            sortOrder: 30,
            id: "stock_availability"
        }
    ].filter((f) => {
        if (get(context, `product.${f.props.name}`) !== undefined)
            f.props.value = get(context, `product.${f.props.name}`);
        return f;
    });

    return <div className="product-edit-inventory sml-block mt-4">
        <div className="sml-block-title">Inventory</div>
        <Area id="product-edit-inventory" coreComponents={fields} />
    </div>;
}