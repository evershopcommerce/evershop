import React from "react";

export default function Hidden(props) {
    return <input
        type="text"
        id={props.name}
        name={props.name}
        value={props.value}
        readOnly={true}
        style={{ display: 'none' }}
    />
}