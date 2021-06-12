import React from "react";
import { useAppState } from "../../../../../lib/context/app";

export default function DashboardProduct() {
    const Context = useAppState();
    const products = Context.dashboardProducts || [];
    return <div>
        <h2>Products</h2>
        {products.map((p, i) => {
            return <div key={i}>{p["sku"]}</div>;
        })}
    </div>;
}