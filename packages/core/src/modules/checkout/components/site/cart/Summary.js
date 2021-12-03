import React from "react";
import Area from "../../../../../lib/components/Area";
import Button from "../../../../../lib/components/form/Button";
import { useAppState } from "../../../../../lib/context/app";
const { get } = require("../../../../../lib/util/get");

function Subtotal({ subTotal }) {
    const currency = get(useAppState(), "currency", "USD");
    const language = get(useAppState(), "language", "en");
    const _subTotal = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(subTotal);
    return <div className='flex justify-end gap-3' style={{ fontSize: '2rem' }}>
        <div>Subtotal</div>
        <div className='text-right'>{_subTotal}</div>
    </div>
}

function Discount({ discountAmount }) {
    const currency = get(useAppState(), "currency", "USD");
    const language = get(useAppState(), "language", "en");
    const _discountAmount = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(discountAmount);

    if (!discountAmount)
        return null;
    return <div className='flex justify-end gap-3'>
        <div>Discount</div>
        <div className='text-right'>{_discountAmount}</div>
    </div>
}

function Tax({ taxAmount }) {
    const currency = get(useAppState(), "currency", "USD");
    const language = get(useAppState(), "language", "en");
    const _taxAmount = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(taxAmount);

    return <div>
        <div>Tax</div>
        <div>{_taxAmount}</div>
    </div>
}

function GrandTotal({ grandTotal }) {
    const currency = get(useAppState(), "currency", "USD");
    const language = get(useAppState(), "language", "en");
    const _grandTotal = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(grandTotal);

    return <div>
        <div>Grand total</div>
        <div>{_grandTotal}</div>
    </div>
}

function Summary({ checkoutUrl }) {
    const cart = get(useAppState(), "cart", {});
    if (cart.items === undefined || cart.items.length === 0)
        return null;
    return <div className="summary mt-3">
        <div className='flex justify-end flex-col'>
            <Area
                id="shopping-cart-summary"
                noOuter={true}
                cart={cart}
                coreComponents={[
                    {
                        component: { default: Subtotal },
                        props: { subTotal: cart.sub_total },
                        sortOrder: 10,
                        id: "shoppingCartSubtotal"
                    },
                    {
                        component: { default: Discount },
                        props: { discountAmount: cart.discount_amount },
                        sortOrder: 20,
                        id: "shoppingCartDiscount"
                    },
                    {
                        component: { default: () => <div className='flex justify-end italic text-textSubdued'>Taxes and shipping calculated at checkout</div> },
                        props: {},
                        sortOrder: 30,
                        id: "summaryNote"
                    }
                ]}
            />
        </div>
        <div className="shopping-cart-checkout-btn flex justify-end mt-3">
            <Button url={checkoutUrl} title="CHECKOUT" variant="primary" />
        </div>
    </div>
}

export default Summary