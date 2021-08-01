import React from "react";
import Area from "../../../../../../lib/components/area";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";
import { Field } from "../../../../../../lib/components/form/Field";
import { Card } from "../../../../../cms/components/admin/card";

export default function Inventory({ data }) {
    const context = useAppState();
    const fields = [
        {
            component: { default: Field },
            props: {
                id: "manage_stock",
                name: "manage_stock",
                label: "Manage stock?",
                options: [{ value: 0, text: "No" }, { value: 1, text: "Yes" }],
                type: 'radio'
            },
            sortOrder: 10,
            id: "manage_stock"
        },
        {
            component: { default: Field },
            props: {
                id: "qty",
                name: "qty",
                type: "text",
                label: "Quantity",
                validationRules: ["notEmpty", "integer"],
                type: 'text'
            },
            sortOrder: 20,
            id: "qty"
        },
        {
            component: { default: Field },
            props: {
                id: "stock_availability",
                name: "stock_availability",
                label: "Stock availability",
                options: [{ value: 0, text: "Out of stock" }, { value: 1, text: "In stock" }], validationRules: ["notEmpty"],
                type: 'radio'
            },
            sortOrder: 30,
            id: "stock_availability"
        }
    ].filter((f) => {
        if (get(context, `product.${f.props.name}`) !== undefined)
            f.props.value = get(context, `product.${f.props.name}`);
        return f;
    });

    return <Card
        title="Inventory"
    >
        <Card.Session>
            <Area id="productEditSeo" coreComponents={fields} />
        </Card.Session>
    </Card>;
}