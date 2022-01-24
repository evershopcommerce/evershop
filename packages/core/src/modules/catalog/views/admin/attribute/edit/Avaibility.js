import React from "react";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";
import { Field } from "../../../../../../lib/components/form/Field";
import { Card } from "../../../../../cms/views/admin/Card";

export default function General(props) {
    const context = useAppState();

    return <Card
        title="Setting"
        subdued={true}
    >
        <Card.Session>
            <Field
                id="is_required"
                type="radio"
                name="is_required"
                label="Is Required?"
                options={[
                    { value: 0, text: "Not required" },
                    { value: 1, text: "Required" }
                ]}
                value={get(context, "attribute.is_required")}
            />
        </Card.Session>
        <Card.Session>
            <Field
                id="is_filterable"
                type="radio"
                name="is_filterable"
                label="Is Filterable?"
                options={[
                    { value: 0, text: "No" },
                    { value: 1, text: "Yes" }
                ]}
                value={get(context, "attribute.is_filterable")}
            />
        </Card.Session>
        <Card.Session>
            <Field
                id="display_on_frontend"
                type="radio"
                name="display_on_frontend"
                label="Show to customers?"
                options={[
                    { value: 0, text: "No" },
                    { value: 1, text: "Yes" }
                ]}
                value={get(context, "attribute.display_on_frontend")}
            />
        </Card.Session>
        <Card.Session>
            <Field
                id="sort_order"
                type="text"
                name="sort_order"
                label="Sort order"
                value={get(context, "attribute.sort_order")}
            />
        </Card.Session>
    </Card>;
}