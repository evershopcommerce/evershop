import React from 'react';
import Area from "../../../../../../lib/components/area";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";
import AddressSummary from "../../../../../customer/components/site/address/address_summary";

function ShippingAddress({ needSelectAddress, setNeedSelectAddress, shippingAddress }) {

    const onClick = (e) => {
        e.preventDefault();
        setNeedSelectAddress(true);
    };
    if (!shippingAddress || needSelectAddress === true)
        return null;
    else
        return <div className='checkout-shipping-address'>
            <AddressSummary address={shippingAddress} />
            <a href="#" onClick={(e) => onClick(e)}><span uk-icon="icon: location; ratio: 1"></span> Change</a>
        </div>
}

function ShippingAddressBlock() {
    const context = useAppState();
    const shippingAddress = get(context, "cart.shippingAddress", undefined);

    const [needSelectAddress, setNeedSelectAddress] = React.useState(shippingAddress === undefined);

    return <div className="checkout-shipping-address">
        <Area
            id={"checkoutShippingAddressBlock"}
            needSelectAddress={needSelectAddress}
            setNeedSelectAddress={setNeedSelectAddress}
            coreWidgets={[
                {
                    'component': { default: ShippingAddress },
                    'props': { needSelectAddress, setNeedSelectAddress, shippingAddress: shippingAddress },
                    'sortOrder': 0,
                    'id': 'shipmentAddress'
                }
            ]}
        />
    </div>
}

export { ShippingAddressBlock }