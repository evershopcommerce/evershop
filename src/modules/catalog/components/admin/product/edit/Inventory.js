import React from "react";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";
import { Field } from "../../../../../../lib/components/form/Field";
import { Card } from "../../../../../cms/components/admin/Card";

export default function Inventory({ data }) {
    const context = useAppState();
    return <Card
        title="Inventory"
        subdued={true}
    >
        <Card.Session>
            <Field
                id="manage_stock"
                name="manage_stock"
                value={get(context, `product.manage_stock`, '')}
                label="Manage stock?"
                options={[{ value: 0, text: "No" }, { value: 1, text: "Yes" }]}
                type="radio"
            />
        </Card.Session>
        <Card.Session>
            <Field
                id="stock_availability"
                name="stock_availability"
                value={get(context, `product.stock_availability`, '')}
                label="Stock availability"
                options={[{ value: 0, text: "No" }, { value: 1, text: "Yes" }]}
                type="radio"
            />
        </Card.Session>
        <Card.Session>
            <Field
                id="qty"
                name="qty"
                value={get(context, `product.qty`)}
                placeholder="Quantity"
                label="Quantity"
                type="text"
            />
        </Card.Session>
    </Card>;
}