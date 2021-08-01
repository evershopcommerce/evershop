import React from "react";
import Area from "../../../../../../lib/components/area";
import { Form } from "../../../../../../lib/components/form/Form";
import { useAppState } from "../../../../../../lib/context/app";

export default function ProductCreateForm(props) {
    const context = useAppState();
    return <Form {...props} submitBtn={false}>
        <div className="grid grid-cols-3 gap-x-25" style={{ maxWidth: '100rem', margin: '0 auto' }}>
            <div className="col-span-2">
                <Area id="leftSide" noOuter={true} />
            </div>
            <div className="col-span-1">
                <Area id="rightSide" noOuter={true} />
            </div>
        </div>
    </Form>;
}