import React from "react";

export default function StatusRow({ id, areaProps }) {
    return <td>
        <div className="nodejscart-switch">
            <div>
                {parseInt(areaProps.row[id]) === 0 && <i className="fas fa-toggle-off"></i>}
                {parseInt(areaProps.row[id]) == 1 && <i className="fas fa-toggle-on"></i>}
            </div>
        </div>
    </td>
}