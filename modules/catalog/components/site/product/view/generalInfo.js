import React from "react";
import Area from "../../../../../../lib/components/area";
import { get } from "../../../../../../lib/util/get";
import { useAppState } from "../../../../../../lib/context/app";

function Name({ name }) {
    return <h1 className="product-single-name">{name}</h1>
}

function Price({ price, salePrice }) {
    const currency = get(useAppState(), "currency", "USD");
    const language = get(useAppState(), "language", "en");
    const _price = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(price);
    const _salePrice = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(salePrice);

    return <h3 className="product-single-price">
        {parseFloat(salePrice) === parseFloat(price) && <div>
            <span className="sale-price">{_price}</span>
        </div>}
        {parseFloat(salePrice) < parseFloat(price) && <div>
            <span className="sale-price">{_salePrice}</span> <span className="regular-price">{_price}</span>
        </div>}
    </h3>
}

function Sku({ sku }) {
    return <div className="product-single-sku text-textSubdued"><span>Sku</span><span>: </span>{sku}</div>
}

export default function GeneralInfo() {
    const product = get(useAppState(), "product");

    return <Area id="product_view_general_info" coreComponents={[
        {
            'component': { default: Name },
            'props': {
                name: product.name
            },
            'sort_order': 10,
            'id': 'product_single_name'
        },
        {
            'component': { default: Price },
            'props': {
                price: product.price,
                salePrice: product.price
            },
            'sort_order': 10,
            'id': 'product_single_price'
        },
        {
            'component': { default: Sku },
            'props': {
                sku: product.sku
            },
            'sort_order': 20,
            'id': 'product_single_sku'
        }
    ]} />
}