import Area from "../../../../../lib/components/area";
import React from "react";

const Title = () => <div className="mb-5 mt-5 text-center col-12">
    <h1 className="shopping-cart-title">Shopping cart</h1>
</div>

export default function CartLayout() {
    return <div className="cart">
        <Area
            id="shoppingCartTop"
            className="cart-page-top"
            coreComponents={[
                {
                    "component": { default: Title },
                    "props": {},
                    "sortOrder": 10,
                    "id": "shoppingCartTitle"
                }
            ]}
        />
        <div className="cart-page-middle">
            <div className="row">
                <Area
                    id="shoppingCartLeft"
                    className="col-12 col-md-8"

                />
                <Area
                    id="shoppingCartRight"
                    className="col-12 col-md-4"
                />
            </div>
        </div>
        <Area
            id="shoppingCartBottom"
            className="cart-page-bottom"
        />
    </div>
}