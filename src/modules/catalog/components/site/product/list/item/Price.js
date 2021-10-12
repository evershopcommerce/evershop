import React from "react";
import { useAppState } from "../../../../../../../lib/context/app";
import { get } from "../../../../../../../lib/util/get";

const Price = ({ price, salePrice }) => {
    const context = useAppState();
    const currency = get(context, "currency", "USD");
    const language = get(context, "language", "en");
    const _price = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(price);
    const _salePrice = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(salePrice);
    return <div className="product-price-listing">
        {parseFloat(salePrice) === parseFloat(price) && <div>
            <span className="sale-price font-semibold">{_price}</span>
        </div>}
        {parseFloat(salePrice) < parseFloat(price) && <div>
            <span className="sale-price text-critical font-semibold">{_salePrice}</span> <span className="regular-price font-semibold">{_price}</span>
        </div>}
    </div>
};
export { Price };