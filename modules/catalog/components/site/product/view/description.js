import React from "react";
import { get } from "../../../../../../lib/util/get";
import { useAppState } from "../../../../../../lib/context/app";

const Description = () => {
    const product = get(useAppState(), "product");
    return <div className="mt-2 md:mt-3">
        <div className={"product-description"} dangerouslySetInnerHTML={{ __html: product.description }}></div>
    </div>
};

export default Description;