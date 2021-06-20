import React from 'react';
import ShippingMethods from "./shippingMethods";
import { ShippingAddressBlock } from "./shippingAddress";
import Area from "../../../../../../lib/components/area";

function Title() {
    return <div className="flex step-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-circle">
            <circle cx="12" cy="12" r="10"></circle>
        </svg>
        <h2 className="mb-4 pl-4">Shipment</h2>
    </div>
}

function Shipment() {
    return <Area
        id={"checkoutShipment"}
        className="checkout-step"
        coreWidgets={[
            {
                'component': { default: Title },
                'props': {},
                'sortOrder': 0,
                'id': 'shipmentBlockTitle'
            },
            {
                'component': { default: ShippingAddressBlock },
                'props': {},
                'sortOrder': 10,
                'id': 'shippingAddress'
            },
            {
                'component': { default: ShippingMethods },
                'props': {},
                'sortOrder': 20,
                'id': 'shipmentMethods'
            }
        ]}
    />
}

export { Shipment }