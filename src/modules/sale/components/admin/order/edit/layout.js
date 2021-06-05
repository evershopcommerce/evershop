import React from "react";
import Area from "../../../../../../lib/components/area";

export default function OrderEdit() {
    return <div className="row order-edit-page">
        <div className="col-8">
            <Area id="leftSide" noOuter={true} />
        </div>
        <div className="col-4">
            <Area id="rightSide" noOuter={true} />
        </div>
    </div>;
}