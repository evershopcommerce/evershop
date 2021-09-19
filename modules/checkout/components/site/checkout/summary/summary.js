import React from 'react';
import { Items } from "./Items";
import { CartSummary } from "./Cart";
import Area from "../../../../../../lib/components/area";

function Title() {
    return <h4 className="mb-4">Order summary</h4>
}

function Summary() {
    return <Area
        id={"checkoutSummary"}
        className="checkout-summary"
        coreComponents={[
            {
                'component': { default: Title },
                'props': {},
                'sortOrder': 10,
                'id': 'checkoutOrderSummary'
            },
            {
                'component': { default: Items },
                'props': {},
                'sortOrder': 20,
                'id': 'checkoutOrderSummaryItems'
            },
            {
                'component': { default: CartSummary },
                'props': {},
                'sortOrder': 30,
                'id': 'checkoutOrderSummaryCart'
            }
        ]}
    />
}

export { Summary }