import React from "react";

const Name = ({ name, url, id }) => {
    return <div className="product-name product-list-name mt-1">
        <a href={url} className='font-bold hover:underline'><span>{name}</span></a>
    </div>
};
export { Name };