import React from "react";
import Area from "../../../../../../lib/components/area";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";
//import Ckeditor from "../../../../../../lib/components/form/fields/ckeditor";
import Field from "../../../../../../lib/components/form/field";
import { Card } from "../../../../../cms/components/admin/card";

export default function General(props) {
    const context = useAppState();
    const fields = [
        {
            component: { default: Field },
            props: { id: "name", name: "name", label: "Name", validationRules: ["notEmpty"], type: "text" },
            sortOrder: 10,
            id: "name"
        },
        {
            component: { default: Field },
            props: {
                id: "sku",
                name: "sku",
                label: "SKU",
                validation_rules: ["notEmpty"],
                type: 'text'
            },
            sortOrder: 20,
            id: "sku"
        },
        {
            component: { default: Field },
            props: { id: "status", name: "status", label: "Status", options: [{ value: 0, text: "Disabled" }, { value: 1, text: "Enabled" }], type: "radio" },
            sortOrder: 30,
            id: "status"
        },
        {
            component: { default: Field },
            props: { id: "visibility", name: "visibility", label: "Visibility", type: "text" },
            sortOrder: 35,
            id: "visibility"
        },
        {
            component: { default: Field },
            props: { id: "weight", name: "weight", type: "text", label: "Weight", validationRules: ["notEmpty", "decimal"], type: 'text' },
            sortOrder: 40,
            id: "weight"
        },
        {
            component: { default: Field },
            props: {
                id: "price",
                name: "price",
                label: "Price",
                validation_rules: ["notEmpty"],
                type: 'text'
            },
            sortOrder: 50,
            id: "price"
        },
        // {
        //     component: { default: Ckeditor },
        //     props: {
        //         id: "description",
        //         name: "description",
        //         label: "Description",
        //         browserApi: props.browserApi,
        //         deleteApi: props.deleteApi,
        //         uploadApi: props.uploadApi,
        //         folderCreateApi: props.folderCreateApi
        //     },
        //     sortOrder: 70,
        //     id: "description"
        // }
    ].filter((f) => {
        if (get(context, `product.${f.props.name}`) !== undefined)
            f.props.value = get(context, `product.${f.props.name}`);
        return f;
    });

    return <Card
        title="General"
    >
        <Card.Session>
            <Area id="product-edit-general" coreComponents={fields} />
        </Card.Session>
    </Card>;
}