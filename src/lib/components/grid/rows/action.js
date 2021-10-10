import React from "react";
import { get } from "../../../util/get";

export default function ActionColumnRow({ areaProps }) {
    return <td>
        <div><a href={get(areaProps, 'row.editUrl', '#')}><i className="fas fa-edit"></i></a></div>
        <div>
            {get(areaProps, 'row.deleteUrl') && <span className="text-danger link" onClick={
                () => {
                    if (window.confirm('Are you sure?'))
                        window.location.href = get(areaProps, 'row.deleteUrl')
                }
            }>
                <i className="fas fa-trash-alt"></i>
            </span>}
        </div>
    </td>;
}