import React from "react";
import { useAppState } from "../../../../../lib/context/app";
import { get } from "../../../../../lib/util/get";

export default function Empty({ homeUrl }) {
    const items = get(useAppState(), "cart.items", []);
    if (items.length > 0)
        return null
    return <div className="empty-shopping-cart w-100">
        <div>
            <div className="mb-4"><h4>Your cart is empty!</h4></div>
            <a href={homeUrl} className="btn btn-primary">Home page</a>
        </div>
    </div>
}