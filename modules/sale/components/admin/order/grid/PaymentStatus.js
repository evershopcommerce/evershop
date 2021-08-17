import React from "react";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";
import Badge from "../../../../../../lib/components/Badge";

export default function PaymentStatusRow({ id, areaProps }) {
    const context = useAppState();
    const paymentStatus = get(context, "paymentStatus", []);
    let status = paymentStatus.find((s) => s.code === areaProps.row[id]);
    if (status)
        return <td><Badge title={status.name} variant={status.badge} progress={status.progress} /></td>
    else
        return <td>{areaProps.row[id]}</td>
}