import React from "react";

export default function Meta(props) {
    const attributes = Object.keys(props)
        .filter(key => ["charSet", "name", "content", "httpEquiv"].includes(key) && props[key])
        .reduce((obj, key) => {
            obj[key] = props[key];
            return obj;
        }, {});

    return <meta {...attributes} />
}