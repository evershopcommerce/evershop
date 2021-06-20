import React from 'react';
import Area from "../../../../../../lib/components/area";
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';
import AddressSummary from "../../../../../customer/components/site/address/addressSummary";

function Title() {
    return <div><strong>Billing address</strong></div>
}

function BillingAddress({ needSelectAddress, setNeedSelectAddress }) {
    const context = useAppState();
    const billingAddress = get(context, "cart.billingAddress");

    const onClick = (e) => {
        e.preventDefault();
        setNeedSelectAddress(true);
    };
    if (!billingAddress || needSelectAddress === true)
        return null;
    else
        return <div className='checkout-shipping-address'>
            <AddressSummary address={billingAddress} />
            <a href="#" onClick={(e) => onClick(e)}><span uk-icon="icon: location; ratio: 1"></span> Change</a>
        </div>
}

function BillingAddressBlock() {
    const [needSelectAddress, setNeedSelectAddress] = React.useState(false);

    return <div className="checkout-billing-address">
        <Area
            id={"checkoutBillingAddressBlock"}
            needSelectAddress={needSelectAddress}
            setNeedSelectAddress={setNeedSelectAddress}
            coreWidgets={[
                {
                    component: { default: Title },
                    props: {},
                    sortOrder: 0,
                    id: "billingAddressBlockTitle"
                },
                {
                    component: { default: BillingAddress },
                    props: { needSelectAddress, setNeedSelectAddress },
                    sortOrder: 20,
                    id: 'billingAddress'
                }
            ]}
        />
    </div>
}

export { BillingAddressBlock }
