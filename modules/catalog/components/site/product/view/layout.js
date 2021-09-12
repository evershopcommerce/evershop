import Area from "../../../../../../lib/components/area";
import React from "react";

export default function ProductPageLayout() {
    return <div className="product-detail">
        <Area
            id="productPageTop"
            className="product-page-top"
        />
        <div className="product-page-middle page-width">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <Area
                    id="productPageMiddleLeft"
                />
                <Area
                    id="productPageMiddleRight"
                />
            </div>
        </div>
        <Area
            id="productPageBottom"
            className="product-page-top"
        />
    </div>
}