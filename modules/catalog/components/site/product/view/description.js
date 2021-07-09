import React from "react";
import { get } from "../../../../../../lib/util/get";
import { useAppState } from "../../../../../../lib/context/app";

const Description = () => {
    const product = get(useAppState(), "product");
    return <div className="mt-5">
        <div><p className="h1">Description</p></div>
        <div className={"product-description"} dangerouslySetInnerHTML={{ __html: product.description }}></div>
    </div>
};

export default Description;