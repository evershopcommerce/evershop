import Area from "../../../../../lib/components/area";
import React from "react";

export default function DashboardLayout() {
    return <div className="row">
        <div className="col-8">
            <Area id="left.side" noOuter={true} />
        </div>
        <div className="col-4">
            <Area id="right.side" noOuter={true} />
        </div>
    </div>
}