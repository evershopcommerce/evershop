import React from "react";
import Area from "../../../../../../lib/components/Area";

export default function OrderEdit() {
    return <div className="grid grid-cols-3 gap-x-2 grid-flow-row ">
        <div className="col-span-2 grid grid-cols-1 gap-2 auto-rows-max">
            <Area id="leftSide" noOuter={true} />
        </div>
        <div className="col-span-1 grid grid-cols-1 gap-2 auto-rows-max">
            <Area id="rightSide" noOuter={true} />
        </div>
    </div>;
}