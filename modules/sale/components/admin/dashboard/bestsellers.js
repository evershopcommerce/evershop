import React from "react";
import { useAppState } from "../../../../../lib/context/app";

export default function BestSellers({ listUrl }) {
    const context = useAppState();
    const currency = context.currency || "USD";
    const products = context.bestsellers || [];

    return <div className="sml-block mt-4">
        <div className="sml-block-title sml-flex-space-between">
            <div>Best sellers</div>
            <div><a className="normal-font" href={listUrl}>All products</a></div>
        </div>
        <table className="table table-bordered">
            <thead>
                <tr>
                    <th>Product name</th>
                    <th>Sku</th>
                    <th>Price</th>
                    <th>Sold Quantity</th>
                </tr>
            </thead>
            <tbody>
                {products.map((p, i) => {
                    const _price = new Intl.NumberFormat("en", { style: "currency", currency: currency }).format(p.price);
                    return <tr key={i}>
                        <td><a href={p.editUrl || ""}>{p.name}</a></td>
                        <td>{p.sku}</td>
                        <td>{_price}</td>
                        <td>{p.qty}</td>
                    </tr>;
                })}
            </tbody>
        </table>
    </div>;
}