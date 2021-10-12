import React from "react";

export default function BasicRow({ id, areaProps }) {
    return <td>{areaProps.row[id]}</td>
}