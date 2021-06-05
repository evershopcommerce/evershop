import React from "react";
import { get } from "../../../../../../lib/util/get";
import { appContext } from "../../../../../../lib/context/app";
import ProductMediaManager from "./media";

export default function ProductImageManager() {
    const context = React.useContext(appContext);

    return <div className="product-edit-image sml-block mt-4">
        <div className="sml-block-title">Images</div>
        <div className={"product-image-manager"}>
            <ProductMediaManager id={"productMainImages"} productImages={get(context, "data.product.images", [])} />
        </div>
    </div>;
}