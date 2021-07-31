import React from "react";
import Area from "../../../../../../lib/components/area";
import { Form } from "../../../../../../lib/components/form/form";
import { useAppState } from "../../../../../../lib/context/app";
import { PageHeader } from "../../../../../cms/components/admin/PageHeader";

export default function ProductCreateForm(props) {
    const context = useAppState();
    return <Form {...props} submitBtn={false}>
        <PageHeader
            backUrl={props.gridUrl}
            heading={context.product.name}
        />
        <div className="row">
            <div className="col-xs-8">
                <Area id="left.side" noOuter={true} />
            </div>
            <div className="col-xs-4">
                <Area id="right.side" noOuter={true} />
            </div>
        </div>
    </Form>;
}