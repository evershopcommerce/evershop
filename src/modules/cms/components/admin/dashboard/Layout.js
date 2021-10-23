import Area from "../../../../../lib/components/Area";
import React from "react";

export default function DashboardLayout() {
    return <div className="grid grid-cols-3 gap-x-2 grid-flow-row ">
        <div className="col-span-2 grid grid-cols-1 gap-2 auto-rows-max">
            <Area id="leftSide" noOuter={true} />
        </div>
        <div className="col-span-1 grid grid-cols-1 gap-2 auto-rows-max">
            <Area id="rightSide" noOuter={true} />
        </div>
    </div>;
}