import React from "react";
import Badge from "../../../../../../lib/components/Badge";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";

export default function ShipmentStatusRow({ id, areaProps }) {
    const context = useAppState();
    const shipmentStatus = get(context, "shipmentStatus", []);
    let status = shipmentStatus.find((s) => s.code === areaProps.row[id]);
    if (status)
        return <td><Badge title={status.name} variant={status.badge} /></td>
    else
        return <td>{areaProps.row[id]}</td>
}