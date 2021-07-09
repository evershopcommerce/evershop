import React from "react";
const { get } = require("../../../../../lib/util/get");
import { useAppState } from "../../../../../lib/context/app";

function ItemOptions({ options = [] }) {
    if (options.length === 0)
        return null;
    const currency = get(useAppState(), "currency", "USD");
    const language = get(useAppState(), "language", "en");

    return <div className="cart-item-options">
        <ul className="list-basic">
            {options.map((o, i) => {
                return <li key={i}>
                    <span className="option-name"><strong>{o.option_name} : </strong></span>
                    {o.values.map((v, k) => {
                        const _extraPrice = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(v.extra_price);
                        return <span key={k}><i className="value-text">{v.value_text}</i><span className="extra-price">({_extraPrice})</span> </span>
                    })}
                </li>
            })}
        </ul>
    </div>
}

function ItemVariantOptions({ options = [] }) {
    if (!Array.isArray(options) || !options || options.length === 0)
        return null;

    return <div className="cart-item-variant-options">
        <ul>
            {options.map((o, i) => {
                return <li key={i}>
                    <span className="attribute-name"><strong>{o.attribute_name} : </strong></span>
                    <span><i className="value-text">{o.option_text}</i></span>
                </li>
            })}
        </ul>
    </div>
}

function Items() {
    const items = get(useAppState(), "cart.items", []);
    const currency = get(useAppState(), "currency", "USD");
    const language = get(useAppState(), "language", "en");
    const homeUrl = get(useAppState(), "homeUrl");

    if (items.length === 0)
        return null;
    else
        return <div id="shopping-cart-items">
            <table className="table">
                <thead>
                    <tr>
                        <td><span>Product</span></td>
                        <td><span>Price</span></td>
                        <td><span>Quantity</span></td>
                        <td><span>Total</span></td>
                        <td><span> </span></td>
                    </tr>
                </thead>
                <tbody>
                    {
                        items.map((item, index) => {
                            const _regularPrice = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(item.product_price);
                            const _finalPrice = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(item.final_price);
                            const _total = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(item.total);
                            return <tr key={index}>
                                <td>
                                    <div className="cart-item-thumb shopping-cart-item-thumb">
                                        {item.thumbnail && <img src={item.thumbnail} alt={item.product_name} />}
                                        {!item.thumbnail && <span uk-icon="icon: image; ratio: 5"></span>}
                                    </div>
                                    <div className="cart-tem-info">
                                        <a href={item.productUrl}>{item.product_name}</a>
                                        {
                                            [].map((e, i) => <div className="text-danger" key={i}>{e.message}</div>)
                                        }
                                        <ItemOptions options={item.options} />
                                        <ItemVariantOptions options={JSON.parse(item.variant_options)} />
                                    </div>
                                </td>
                                <td>
                                    {parseFloat(item.final_price) < parseFloat(item.product_price) && <div>
                                        <span className="regular-price">{_regularPrice}</span> <span className="sale-price">{_finalPrice}</span>
                                    </div>}
                                    {parseFloat(item.final_price) >= parseFloat(item.product_price) && <div>
                                        <span className="sale-price">{_finalPrice}</span>
                                    </div>}
                                </td>
                                <td><span>{item.qty}</span></td>
                                <td><span>{_total}</span></td>
                                <td><a href={item.removeUrl}><span>x</span></a></td>
                            </tr>
                        })
                    }
                </tbody>
            </table>
        </div>
}

export default Items;