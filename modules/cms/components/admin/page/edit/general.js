import React from "react";
import Area from "../../../../../../lib/components/area";
import { useAppState } from "../../../../../../lib/context/app";
import Text from "../../../../../../lib/components/form/fields/text";
import Switch from "../../../../../../lib/components/form/fields/switch";
import { get } from "../../../../../../lib/util/get";
import Ckeditor from "../../../../../../lib/components/form/fields/ckeditor";
import { Card } from "../../card";

export default function General(props) {
    const context = useAppState();
    const fields = [
        {
            component: { default: Text },
            props: { id: "name", name: "name", label: "Name", validationRules: ["notEmpty"] },
            sortOrder: 10,
            id: "name"
        },
        {
            component: { default: Switch },
            props: { id: "status", name: "status", label: "Status", options: [{ value: 0, text: "Disabled" }, { value: 1, text: "Enabled" }] },
            sortOrder: 20,
            id: "status"
        },
        {
            component: { default: Ckeditor },
            props: {
                id: "content",
                name: "content",
                label: "Content",
                browserApi: props.browserApi,
                deleteApi: props.deleteApi,
                uploadApi: props.uploadApi,
                folderCreateApi: props.folderCreateApi
            },
            sortOrder: 30,
            id: "content"
        }
    ].filter((f) => {
        if (get(context, `page.${f.props.name}`) !== undefined)
            f.props.value = get(context, `page.${f.props.name}`);
        return f;
    });

    return <div className="page-edit-general sml-block">
        <div className="sml-block-title">General</div>
        <Area id="page-edit-general" coreWidgets={fields} />
        <Card />
    </div>;
}