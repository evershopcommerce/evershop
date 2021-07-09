import React from "react";

export default function BasicRow({ id, areaProps }) {
    let status = areaProps.row[id].replace('_', ' ')
    status = status.charAt(0).toUpperCase() + status.slice(1)
    return <td>{status}</td>
}