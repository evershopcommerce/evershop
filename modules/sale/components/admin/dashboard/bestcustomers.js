import React from "react";
import { useAppState } from "../../../../../lib/context/app";
import { Card } from "../../../../cms/components/admin/card";

export default function BestCustomers({ listUrl }) {
    const context = useAppState();
    const currency = context.currency || "USD";
    const customers = context.bestCustomers || [];

    return <Card
        title='Best customers'
        actions={[{ name: 'All customers', onAction: () => { window.location.href = listUrl } }]}
    >
        <Card.Session>
            <table className="listing">
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
        </Card.Session>
    </Card>;
}