import axios from "axios";
import React from "react";
const { get } = require("../../../../../lib/util/get");
import { useAppState } from "../../../../../lib/context/app";

function ItemOptions({ options = [] }) {
    if (options.length === 0)
        return null;
    const currency = get(useAppState(), "currency", "USD");
    const language = get(useAppState(), "language", "en");

    return <div className="cart-item-options mt-05">
        <ul className="list-basic">
            {options.map((o, i) => {
                return <li key={i}>
                    <span className="option-name">{o.option_name}: </span>
                    {o.values.map((v, k) => {
                        const _extraPrice = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(v.extra_price);
                        return <span key={k}>{v.value_text}<span className="extra-price">({_extraPrice})</span> </span>
                    })}
                </li>
            })}
        </ul>
    </div>
}

function ItemVariantOptions({ options = [] }) {
    if (!Array.isArray(options) || !options || options.length === 0)
        return null;

    return <div className="cart-item-variant-options mt-05">
        <ul>
            {options.map((o, i) => {
                return <li key={i}>
                    <span className="attribute-name">{o.attribute_name}: </span>
                    <span>{o.option_text}</span>
                </li>
            })}
        </ul>
    </div>
}

function Items() {
    const context = useAppState();
    const items = get(context, "cart.items", []);
    const currency = get(context, "currency", "USD");
    const language = get(context, "language", "en");
    const currentUrl = get(context, "currentUrl");

    const removeItem = async (API) => {
        let response = await axios.get(API);
        if (response.data.success === true) {
            window.location.href = currentUrl
        } else {
            //TODO: display message
            alert(response.data.message)
        }
    }

    if (items.length === 0)
        return null;
    else
        return <div id="shopping-cart-items">
            <table className="items-table listing">
                <thead>
                    <tr>
                        <td><span>Product</span></td>
                        <td><span>Price</span></td>
                        <td className='hidden md:table-cell'><span>Quantity</span></td>
                        <td className='hidden md:table-cell'><span>Total</span></td>
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
                                    <div className='flex justify-start space-x-1 product-info'>
                                        <div className="flex justify-center">
                                            {item.thumbnail && <img className='self-center' src={item.thumbnail} alt={item.product_name} />}
                                            {!item.thumbnail && <svg className='self-center' xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>}
                                        </div>
                                        <div className="cart-tem-info">
                                            <a href={item.productUrl} className='name font-semibold hover:underline'>{item.product_name}</a>
                                            {//TODO: item errors
                                                [].map((e, i) => <div className="text-critical" key={i}>{e.message}</div>)
                                            }
                                            <ItemOptions options={item.options} />
                                            <ItemVariantOptions options={JSON.parse(item.variant_options)} />
                                            <div className='mt-05'>
                                                <a onClick={async (e) => {
                                                    e.preventDefault();
                                                    await removeItem(item.removeUrl);
                                                }} href="#" className='text-textSubdued underline'><span>Remove</span></a>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    {parseFloat(item.final_price) < parseFloat(item.product_price) && <div>
                                        <span className="regular-price">{_regularPrice}</span> <span className="sale-price">{_finalPrice}</span>
                                    </div>}
                                    {parseFloat(item.final_price) >= parseFloat(item.product_price) && <div>
                                        <span className="sale-price">{_finalPrice}</span>
                                    </div>}
                                    <div className='md:hidden mt-05'>
                                        <span>Qty</span>
                                        <span>{item.qty}</span>
                                    </div>
                                </td>
                                <td className='hidden md:table-cell'><span>{item.qty}</span></td>
                                <td className='hidden md:table-cell'><span>{_total}</span></td>
                            </tr>
                        })
                    }
                </tbody>
            </table>
        </div>
}

export default Items;