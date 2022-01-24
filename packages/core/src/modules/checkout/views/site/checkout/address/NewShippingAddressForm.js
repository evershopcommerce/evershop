import React from 'react';
import { toast } from "react-toastify";
import { useAppState, useAppDispatch } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";
import AddressForm from "../../../../../customer/views/site/address/addressForm";

export default function ShippingAddressForm(props) {
    const context = useAppState();
    const dispatch = useAppDispatch();
    const cart = get(context, "cart", {});

    const onSuccess = (response) => {
        if (get(response, 'success') === true) {
            props.areaProps.setNeedSelectAddress(false);
            dispatch({ ...context, cart: { ...cart, shippingAddress: response.data.address } });
        } else {
            toast.error(get(response, "message", "Failed!"));
        }
    };

    const onError = () => {
        //dispatch({ 'type': ADD_ALERT, 'payload': { alerts: [{ id: "checkout_shipping_address_error", message: 'Something wrong. Please try again', type: "error" }] } });
    };

    if (props.areaProps.needSelectAddress === false)
        return null;

    return <div>
        <AddressForm
            id="shippingNewAddressForm"
            action={get(props, 'action')}
            countries={get(props, 'countries')}
            onSuccess={onSuccess}
            onError={onError}
        />
    </div>
}