import React from 'react';
import { Items } from "./Items";
import { OrderSummary } from "./Order";
import Area from "../../../../../../lib/components/area";

function Summary() {
    return <Area
        id={"checkoutSuccessSummary"}
        className="checkout-summary hidden md:block"
        coreComponents={[
            {
                'component': { default: Items },
                'props': {},
                'sortOrder': 20,
                'id': 'checkoutSuccessOrderSummaryItems'
            },
            {
                'component': { default: OrderSummary },
                'props': {},
                'sortOrder': 30,
                'id': 'checkoutSuccessOrderSummary'
            }
        ]}
    />
}

export { Summary }