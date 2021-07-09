import React from "react";
import Area from "../../../../../lib/components/area";
import { useAppState } from "../../../../../lib/context/app";
const { get } = require("../../../../../lib/util/get");

function Subtotal({ subTotal }) {
    const currency = get(useAppState(), "currency", "USD");
    const language = get(useAppState(), "language", "en");
    const _subTotal = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(subTotal);
    return <tr>
        <td>Subtotal</td>
        <td>{_subTotal}</td>
    </tr>
}

function Discount({ discountAmount }) {
    const currency = get(useAppState(), "currency", "USD");
    const language = get(useAppState(), "language", "en");
    const _discountAmount = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(discountAmount);

    return <tr>
        <td>Discount</td>
        <td>{_discountAmount}</td>
    </tr>
}

function Tax({ taxAmount }) {
    const currency = get(useAppState(), "currency", "USD");
    const language = get(useAppState(), "language", "en");
    const _taxAmount = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(taxAmount);

    return <tr>
        <td>Tax</td>
        <td>{_taxAmount}</td>
    </tr>
}

function GrandTotal({ grandTotal }) {
    const currency = get(useAppState(), "currency", "USD");
    const language = get(useAppState(), "language", "en");
    const _grandTotal = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(grandTotal);

    return <tr>
        <td>Grand total</td>
        <td>{_grandTotal}</td>
    </tr>
}

function Summary({ checkoutUrl }) {
    const cart = get(useAppState(), "cart", {});
    if (cart.items === undefined || cart.items.length === 0)
        return null;
    return <div className="summary">
        <table className={"table"}>
            <tbody>
                <Area
                    id="shopping-cart-summary"
                    noOuter={true}
                    cart={cart}
                    coreWidgets={[
                        {
                            component: { default: Subtotal },
                            props: { subTotal: cart.sub_total },
                            sortOrder: 10,
                            id: "shopping-cart-subtotal"
                        },
                        {
                            component: { default: Discount },
                            props: { discountAmount: cart.discount_amount },
                            sortOrder: 20,
                            id: "shopping-cart-discount"
                        },
                        {
                            component: { default: Tax },
                            props: { taxAmount: cart.tax_amount },
                            sortOrder: 30,
                            id: "shopping-cart-tax"
                        },
                        {
                            component: { default: GrandTotal },
                            props: { grandTotal: cart.grand_total },
                            sortOrder: 40,
                            id: "shopping-cart-grand-total"
                        }
                    ]}
                />
            </tbody>
        </table>
        <div className="shopping-cart-checkout-btn">
            <a className={"btn btn-primary"} href={checkoutUrl}>{"Checkout"}</a>
        </div>
    </div>
}

export default Summary