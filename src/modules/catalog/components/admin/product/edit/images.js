import React from "react";
import { get } from "../../../../../../lib/util/get";
import { useAppState } from "../../../../../../lib/context/app";
import ProductMediaManager from "./media";

export default function ProductImageManager() {
    const context = useAppState();

    return <div className="product-edit-image sml-block mt-4">
        <div className="sml-block-title">Images</div>
        <div className={"product-image-manager"}>
            <ProductMediaManager id={"productMainImages"} productImages={get(context, "product.images", [])} />
        </div>
    </div>;
}