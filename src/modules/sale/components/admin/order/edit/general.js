import React from "react";
import Area from "../../../../../../lib/components/area";
import { appContext } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";

export default function OrderInfo(props) {
    let order = get(React.useContext(appContext), "data.order", {});
    let date = new Date(order.created_at);
    return <div className={"order-edit-info"}>
        <Area
            id="orderEditGeneralInfo"
            className="sml-block"
            coreWidgets={[
                {
                    component: { default: () => <div className="sml-block-title">General info</div> },
                    props: {
                    },
                    sort_order: 10,
                    id: "title"
                },
                {
                    component: { default: ({ customer_full_name }) => <div><strong>Customer full name:</strong><span> </span><span>{customer_full_name}</span></div> },
                    props: {
                        customer_full_name: order.customer_full_name
                    },
                    sort_order: 20,
                    id: "customerFullName"
                },
                {
                    component: { default: ({ customer_email }) => <div><strong>Customer email:</strong><span> </span><span>{customer_email}</span></div> },
                    props: {
                        customer_email: order.customer_email
                    },
                    sort_order: 30,
                    id: "customerEmail"
                },
                {
                    component: { default: ({ order_number }) => <div><strong>Order number:</strong><span> </span><span>#{order_number}</span></div> },
                    props: {
                        order_number: order.order_number
                    },
                    sort_order: 40,
                    id: "orderNumber"
                },
                {
                    component: { default: () => <div><strong>Order date:</strong><span> </span><span>{date.toDateString()}</span></div> },
                    props: {
                    },
                    sort_order: 50,
                    id: "orderDate"
                }
            ]}
        />
    </div>
}