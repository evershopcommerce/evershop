import React from "react";
import Area from "../../../../../../lib/components/area";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";

function Subtotal({ sub_total, currency, language }) {
    const _subTotal = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(sub_total);

    return <tr>
        <td>Subtotal</td>
        <td><span>{_subTotal}</span></td>
    </tr>
}

function Discount({ discount_amount, currency, language }) {
    if (discount_amount === 0)
        return null;

    const _discountAmount = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(discount_amount);

    return <tr>
        <td>Discount</td>
        <td><span>{_discountAmount}</span></td>
    </tr>
}

function ShippingFee({ shipping_fee, currency, language }) {
    const _shippingFee = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(shipping_fee);

    return <tr>
        <td>Shipping</td>
        <td><span>{shipping_fee === 0 && "Free"}{shipping_fee !== 0 && shipping_fee}</span></td>
    </tr>
}

function Tax({ tax_amount, currency, language }) {
    const _taxAmount = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(tax_amount);

    return <tr>
        <td>Tax</td>
        <td><span>{_taxAmount}</span></td>
    </tr>
}

function GrandTotal({ grand_total, currency, language }) {
    const _grandTotal = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(grand_total);

    return <tr>
        <td>Grand total</td>
        <td><span>{_grandTotal}</span></td>
    </tr>
}

function CartSummary() {
    const context = useAppState();
    const cart = get(context, "cart", {});
    const currency = get(context, "currency", "USD");
    const language = get(context, "language", "en");

    return <div className="checkout-summary-cart">
        <table className="checkout-cart-summary-table">
            <tbody>
                <Area
                    id={"checkoutSummaryCart"}
                    noOuter={true}
                    coreWidgets={[
                        {
                            'component': { default: Subtotal },
                            'props': { ...cart, currency, language },
                            'sortOrder': 10,
                            'id': 'checkoutOrderSummaryCartSubtotal'
                        },
                        {
                            'component': { default: Discount },
                            'props': { ...cart, currency, language },
                            'sortOrder': 20,
                            'id': 'checkoutOrderSummaryCartDiscount'
                        },
                        {
                            'component': { default: ShippingFee },
                            'props': { ...cart, currency, language },
                            'sort_order': 30,
                            'id': 'checkoutOrderSummaryCartShipping'
                        },
                        {
                            'component': { default: Tax },
                            'props': { ...cart, currency, language },
                            'sortOrder': 40,
                            'id': 'checkoutOrderSummaryCartTax'
                        },
                        {
                            'component': { default: GrandTotal },
                            'props': { ...cart, currency, language },
                            'sortOrder': 50,
                            'id': 'checkoutOrderSummaryCartGrandTotal'
                        }
                    ]}
                />
            </tbody>
        </table>
    </div>
}

export { CartSummary }