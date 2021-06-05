import React from "react";
import Area from "../../../../../../lib/components/area";
import { appContext } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";

function Status({ status }) {
    return <td>
        <span className={`badge badge-${status.badge}`}><i className="fas fa-tag"></i> {status.name}</span>
    </td>
}

function Note({ note }) {
    return <td>
        <i>{note}</i>
    </td>
}

function Weight({ weight }) {
    return <td>{weight}</td>
}

function Actions({ status, startShipUrl, completeShipUrl }) {
    const startShipment = (e) => {
        e.preventDefault();
        fetch(
            startShipUrl,
            false,
            'GET',
            {},
            null,
            (response) => {
                location.reload()
            })
    };

    const completeShipment = (e) => {
        e.preventDefault();
        fetch(
            completeShipUrl,
            false,
            'GET',
            {},
            null,
            (response) => {
                location.reload()
            })
    };
    return <td>
        {status == 'pending' && <a href="#" onClick={(e) => startShipment(e)}><span>Start shipment</span></a>}
        {status == 'delivering' && <a href="#" onClick={(e) => completeShipment(e)}><span>Complete shipment</span></a>}
    </td>
}

export default function Shipment({ startShipUrl, completeShipUrl }) {
    let order = get(React.useContext(appContext), "data.order", {});
    const currency = get(React.useContext(appContext), "data.order.currency");
    const language = get(React.useContext(appContext), "data.shop.language", "en");
    const grandTotal = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(order.grand_total);

    return <div className="sml-block mt-4">
        <div className="sml-block-title">Shipment</div>
        <table className='table table-bordered'>
            <thead>
                <tr>
                    <Area
                        id={"orderShipmentBlockInfoHeader"}
                        orderId={order.order_id}
                        method={order.shipping_method}
                        shippingNote={order.shipping_note}
                        methodName={order.shipping_method_name}
                        grandTotal={grandTotal}
                        weight={order.total_weight}
                        status={order.shipment_status}
                        noOuter={true}
                        coreWidgets={[
                            {
                                'component': { default: "th" },
                                'props': { children: <span>Status</span> },
                                'sort_order': 10,
                                'id': 'shipment_status_header'
                            },
                            {
                                'component': { default: "th" },
                                'props': { children: <span>Method</span> },
                                'sort_order': 20,
                                'id': 'shipment_method_header'
                            },
                            {
                                'component': { default: "th" },
                                'props': { children: <span>Total weight</span> },
                                'sort_order': 30,
                                'id': 'shipment_weight_header'
                            },
                            {
                                'component': { default: "th" },
                                'props': { children: <span>Customer notes</span> },
                                'sort_order': 40,
                                'id': 'shipment_notes_header'
                            },
                            {
                                'component': { default: "th" },
                                'props': { children: <span>Actions</span> },
                                'sort_order': 50,
                                'id': 'shipment_action_header'
                            }
                        ]}
                    />
                </tr>
            </thead>
            <tbody>
                <tr>
                    <Area
                        id={"orderShipmentInfoRow"}
                        orderId={order.order_id}
                        method={order.shipping_method}
                        shippingNote={order.shipping_note}
                        methodName={order.shipping_method_name}
                        grandTotal={grandTotal}
                        weight={order.total_weight}
                        status={order.shipment_status}
                        noOuter={true}
                        coreWidgets={[
                            {
                                'component': { default: Status },
                                'props': { status: order.shipmentStatus },
                                'sort_order': 10,
                                'id': 'order_shipment_status'
                            },
                            {
                                'component': { default: "td" },
                                'props': { children: <span>{order.shipping_method_name}</span> },
                                'sort_order': 20,
                                'id': 'order_shipment_method'
                            },
                            {
                                'component': { default: Weight },
                                'props': { weight: order.total_weight },
                                'sort_order': 30,
                                'id': 'order_shipment_weight'
                            },
                            {
                                'component': { default: Note },
                                'props': { note: order.shipping_note },
                                'sort_order': 40,
                                'id': 'order_shipment_note'
                            },
                            {
                                'component': { default: Actions },
                                'props': { status: order.shipment_status, startShipUrl, completeShipUrl },
                                'sort_order': 50,
                                'id': 'order_shipment_action'
                            }
                        ]}
                    />
                </tr>
            </tbody>
        </table>
    </div>
}