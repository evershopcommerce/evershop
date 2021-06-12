import React from "react";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";

function Current({ image, alt }) {
    return <div className="product-image product-single-page-image">
        <img src={image.single} alt={alt} />
    </div>
}

export default function Images() {
    const product = get(useAppState(), "product");
    const [current, setCurrent] = React.useState(product.gallery[0]);

    return <div className="product-single-media">
        <Current image={current} alt={product.name} />
        <ul className="more-view-thumbnail product-gallery">
            {product.gallery.map((i, j) => {
                return <li key={j}><a href={"#"} onClick={(e) => { e.preventDefault(); setCurrent({ ...product.gallery[j] }); }}><img src={i.thumb} alt={product.name} /></a></li>
            })}
        </ul>
    </div>
}