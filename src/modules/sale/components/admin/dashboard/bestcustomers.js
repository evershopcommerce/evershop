import React from "react";
import { useAppState } from "../../../../../lib/context/app";

export default function BestCustomers({ listUrl }) {
    const context = useAppState();
    const currency = context.currency || "USD";
    const customers = context.bestCustomers || [];

    return <div className="sml-block mt-4">
        <div className="sml-block-title sml-flex-space-between">
            <div>Best customers</div>
            <div><a className="normal-font" href={listUrl}>All customers</a></div>
        </div>
        <table className="table table-bordered">
            <thead>
                <tr>
                    <th>Full name</th>
                    <th>Orders</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                {customers.map((c, i) => {
                    const _total = new Intl.NumberFormat("en", { style: "currency", currency: currency }).format(c.total);
                    return <tr key={i}>
                        <td><a href={c.editUrl || ""}>{c.full_name}</a></td>
                        <td>{c.orders}</td>
                        <td>{_total}</td>
                    </tr>;
                })}
            </tbody>
        </table>
    </div>;
}