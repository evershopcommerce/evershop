import React from "react";

export default function YesNoRow({ id, areaProps }) {
    return <td>
        <div className="nodejscart-switch">
            <div>
                {parseInt(areaProps.row[id]) === 0 && <span>No</span>}
                {parseInt(areaProps.row[id]) == 1 && <span>Yes</span>}
            </div>
        </div>
    </td>
}