import React from "react";

export default function BasicColumnHeader({ title }) {
    return <th className={"column"}>
        <div className="table-header id-header">
            <div className={"title"}><span>{title}</span></div>
        </div>
    </th>
}