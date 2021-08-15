import React from "react";
import Off from "../../Off";
import On from "../../On";

export default function StatusRow({ id, areaProps }) {
    return <td>
        <div className="nodejscart-switch">
            <div>
                {parseInt(areaProps.row[id]) === 0 && <Off />}
                {parseInt(areaProps.row[id]) == 1 && <On />}
            </div>
        </div>
    </td>
}