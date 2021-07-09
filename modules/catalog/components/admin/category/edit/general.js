import React from "react";
import Area from "../../../../../../lib/components/area";
import { useAppState } from "../../../../../../lib/context/app";
import Text from "../../../../../../lib/components/form/fields/text";
import Switch from "../../../../../../lib/components/form/fields/switch";
import { get } from "../../../../../../lib/util/get";
import Ckeditor from "../../../../../../lib/components/form/fields/ckeditor";

export default function General(props) {
    const context = useAppState();
    const fields = [
        {
            component: { default: Text },
            props: { id: "name", name: "name", label: "Name", validationRules: ["notEmpty"] },
            sort_order: 10,
            id: "name"
        },
        {
            component: { default: Switch },
            props: { id: "status", name: "status", label: "Status", options: [{ value: 0, text: "Disabled" }, { value: 1, text: "Enabled" }] },
            sort_order: 30,
            id: "status"
        },
        {
            component: { default: Ckeditor },
            props: {
                id: "description",
                name: "description",
                label: "Description",
                browserApi: props.browserApi,
                deleteApi: props.deleteApi,
                uploadApi: props.uploadApi,
                folderCreateApi: props.folderCreateApi
            },
            sort_order: 70,
            id: "description"
        }
    ].filter((f) => {
        if (get(context, `category.${f.props.name}`) !== undefined)
            f.props.value = get(context, `category.${f.props.name}`);
        return f;
    });

    return <div className="category-edit-general sml-block">
        <div className="sml-block-title">General</div>
        <Area id="category-edit-general" coreWidgets={fields} />
    </div>;
}