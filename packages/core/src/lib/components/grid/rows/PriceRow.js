import React from "react";
import { useAppState } from "../../../context/app";

export default function PriceRow({ id, areaProps }) {
    const context = useAppState();
    return <td>
        <div>
            <span>{new Intl.NumberFormat(context.language, { style: 'currency', currency: context.currency }).format(areaProps.row[id])}</span>
        </div>
    </td>
}