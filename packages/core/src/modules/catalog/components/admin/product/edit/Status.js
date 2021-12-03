import React from "react";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";
import { Field } from "../../../../../../lib/components/form/Field";
import { Card } from "../../../../../cms/components/admin/Card";

export default function Status() {
    const context = useAppState();

    return <Card
        title="Product status"
        subdued={true}
    >
        <Card.Session>
            <Field
                id="status"
                name="status"
                value={get(context, `product.status`, '')}
                label="Status"
                options={[{ value: 0, text: "Disabled" }, { value: 1, text: "Enabled" }]}
                type="radio"
            />
        </Card.Session>
        <Card.Session>
            <Field
                id="visibility"
                name="visibility"
                value={get(context, `product.visibility`, '')}
                label="Visibility"
                options={[{ value: 0, text: "Not visible" }, { value: 1, text: "Visible" }]}
                type="radio"
            />
        </Card.Session>
    </Card>;
}