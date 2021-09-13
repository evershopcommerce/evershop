import Area from "../../../../../lib/components/area";
import React from "react";

const Title = () => <div className="mb-3 text-center">
    <h1 className="shopping-cart-title mb-05">Shopping cart</h1>
    <a href="/" className='underline'>Continue shopping</a>
</div>

export default function CartLayout() {
    return <div>
        <div className="cart page-width">
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
    </div>
}