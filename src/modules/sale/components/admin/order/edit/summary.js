import React from "react";
import Area from "../../../../../../lib/components/area";
import { appContext } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";

export default function OrderSummary() {
    let order = get(React.useContext(appContext), "data.order", {});
    const language = get(React.useContext(appContext), "data.shop.language", "en");
    const _taxAmount = new Intl.NumberFormat(language, { style: 'currency', currency: order.currency }).format(order.tax_amount);
    const _discountAmount = new Intl.NumberFormat(language, { style: 'currency', currency: order.currency }).format(order.discount_amount);
    const _subTotal = new Intl.NumberFormat(language, { style: 'currency', currency: order.currency }).format(order.sub_total);
    const _grandTotal = new Intl.NumberFormat(language, { style: 'currency', currency: order.currency }).format(order.grand_total);

    return <div className="sml-block mt-4">
        <div className="sml-block-title">Summary</div>
        <table className="table table-bordered">
            <tbody>
                <Area
                    id={"orderSummaryBlock"}
                    orderId={order.order_id}
                    currency={order.currency}
                    grandTotal={order.grand_total}
                    coupon={order.coupon}
                    discountAmount={order.discount_amount}
                    taxAmount={order.tax_amount}
                    noOuter={true}
                    coreWidgets={[
                        {
                            'component': { default: "tr" },
                            'props': { children: [<td key="key"><span>Subtotal</span></td>, <td key="value"><span>{_subTotal}</span></td>] },
                            'sort_order': 5,
                            'id': 'summary_subtotal'
                        },
                        {
                            'component': { default: "tr" },
                            'props': { children: [<td key="key"><span>Tax</span></td>, <td key="value"><span>{_taxAmount}</span></td>] },
                            'sort_order': 10,
                            'id': 'summary_tax'
                        },
                        {
                            'component': { default: "tr" },
                            'props': { children: [<td key="key"><span>Discount ({order.coupon})</span></td>, <td key="value"><span>{_discountAmount}</span></td>] },
                            'sort_order': 20,
                            'id': 'summary_discount'
                        },
                        {
                            'component': { default: "tr" },
                            'props': { children: [<td key="key"><span>Grand total</span></td>, <td key="value"><span>{_grandTotal}</span></td>] },
                            'sort_order': 30,
                            'id': 'summary_grand_total'
                        }
                    ]}
                />
            </tbody>
        </table>
    </div>
}