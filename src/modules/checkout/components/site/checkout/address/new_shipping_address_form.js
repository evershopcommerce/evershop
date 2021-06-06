import React from 'react';
import { toast } from "react-toastify";
import { appContext } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";
import AddressForm from "../../../../../customer/components/site/address/address-form";

export default function ShippingAddressForm(props) {
    const context = React.useContext(appContext);
    const cart = get(context, "data.cart", {});

    const onSuccess = (response) => {
        if (get(response, 'success') === true) {
            props.areaProps.setNeedSelectAddress(false);
            context.setData({ data: { ...context.data, cart: { ...context.data.cart, shippingAddress: response.data.address } } });
        } else {
            toast.error(get(response, "message", "Failed!"));
        }
    };

    const onError = () => {
        //dispatch({ 'type': ADD_ALERT, 'payload': { alerts: [{ id: "checkout_shipping_address_error", message: 'Something wrong. Please try again', type: "error" }] } });
    };

    if (props.areaProps.needSelectAddress === false)
        return null;

    return <div className="uk-width-1-1">
        <div><strong>New address</strong></div>
        <AddressForm
            id="shippingNewAddressForm"
            action={get(props, 'action')}
            countries={get(props, 'countries')}
            onSuccess={onSuccess}
            onError={onError}
        />
    </div>
}