import React from "react";

const Name = ({ name, url, id }) => {
    return <div className="product-name product-list-name">
        <a href={url}><span>{name} ---- {id}</span></a>
    </div>
};
export { Name };