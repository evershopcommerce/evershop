import Area from "../../../../../../lib/components/area";
import React from "react";

export default function ProductPageLayout() {
    return <div className="product-detail">
        <Area
            id="productPageTop"
            className="product-page-top"
        />
        <div className="product-page-middle">
            <div className="row">
                <Area
                    id="productPageMiddleLeft"
                    className="col-12 col-md-7 product-page-middle-left"
                />
                <Area
                    id="productPageMiddleRight"
                    className="col-12 col-md-5 product-page-middle-right"
                />
            </div>
        </div>
        <Area
            id="productPageBottom"
            className="product-page-top"
        />
    </div>
}