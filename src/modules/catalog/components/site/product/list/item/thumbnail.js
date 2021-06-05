import React from "react";

const Thumbnail = ({ imageUrl, alt }) => {
    return <div className="product-thumbnail-listing">
        <span className="list-placeholder-helper"></span>
        {imageUrl && <img src={imageUrl} alt={alt} />}
        {!imageUrl && <span uk-icon="icon: image; ratio: 10"></span>}
    </div>
};
export { Thumbnail };