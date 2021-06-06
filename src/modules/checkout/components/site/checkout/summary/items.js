import React from 'react';
import { appContext } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";

function Items() {
    const context = React.useContext(appContext);
    const currency = get(context, "data.currency", "USD");
    const language = get(context, "data.language", "en");
    const items = get(context, "data.cart.items", []);

    return <div id="summary-items">
        <table className="table">
            <thead>
                <tr>
                    <td><span>Product</span></td>
                    <td><span>Quantity</span></td>
                    <td><span>Total</span></td>
                </tr>
            </thead>
            <tbody>
                {
                    items.map((item, index) => {
                        const _total = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(item.total);

                        return <tr key={index}>
                            <td>
                                <a href={item.product_url} classes="uk-link-muted">item.product_name{item.product_name}</a>
                            </td>
                            <td><span>{item.qty}</span></td>
                            <td><span>{_total}</span></td>
                        </tr>
                    })
                }
            </tbody>
        </table>
    </div>
}

export { Items };