import React from 'react';
import ShippingMethods from "./shipping_methods";
import { ShippingAddressBlock } from "./shipping_address";
import Area from "../../../../../../lib/components/area";

function Title() {
    return <h4 className="mb-4">Shipment</h4>
}

function Shipment() {
    return <Area
        id={"checkoutShipment"}
        className="col-12 col-md-4"
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